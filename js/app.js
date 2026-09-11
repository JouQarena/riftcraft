import { createBalancedRandomizer, RANDOM_RULES } from './randomizer.js';
import { loadHistory, saveHistory, pushHistory, saveDraft, loadDraft } from './storage.js';
import { initHUDPositions, exportPNG } from './hud.js';
import { validPatch, encodeBuildToken, decodeBuildToken, parseSharedBuild, buildLink, buildText } from './share.js';
import { soundManager } from './sounds.js';

const KEYS = ['model', 'passive', 'q', 'w', 'e', 'r'];
const LABELS = {model: 'MODEL', passive: 'PASSIVE', q: 'Q', w: 'W', e: 'E', r: 'R'};
const SHORT = {model: 'M', passive: 'P', q: 'Q', w: 'W', e: 'E', r: 'R'};
const CDN = 'https://ddragon.leagueoflegends.com';
const $ = id => document.getElementById(id);

const el = {
  loading: $('loading'), loadText: $('load-text'), retry: $('retry-btn'), fresh: $('fresh-btn'),
  card: $('draft-card'), stage: $('draft-stage'), count: $('pick-count'), placeholder: $('draft-placeholder'),
  shuffle: $('shuffle-display'), shuffleImg: $('shuffle-img'), shuffleName: $('shuffle-name'),
  content: $('draft-content'), portrait: $('draft-portrait'), name: $('draft-name'), title: $('draft-title'),
  options: $('draft-options'), message: $('draft-message'), complete: $('complete-panel'),
  completeDescription: $('complete-description'), roll: $('roll-btn'), hud: $('final-hud'), frame: $('the-frame'),
  resource: $('u-res'), tags: $('champ-tags'), buildState: $('build-state'), hint: $('action-hint'),
  again: $('play-again-btn'), copyImage: $('copy-image-btn'), shareLink: $('share-link-btn'), download: $('dl-btn'),
  notice: $('notice'), noticeText: $('notice-text'), noticeAction: $('notice-action'), linkPanel: $('link-panel'), linkInput: $('share-url'), copy: $('copy-link-btn'), closeLink: $('close-link-btn'),
  reroll: $('reroll-btn'), copyText: $('copy-text-btn'),
  undoBtn: $('undo-btn'), clearHistoryBtn: $('clear-history-btn'),
  historyPanel: $('history-panel'), historyList: $('history-list'),
  soundToggle: $('sound-toggle'),
  buildMeta: $('build-meta'), buildPower: $('build-power')
};

const slotPips = Object.fromEntries(KEYS.map(key => [key, document.querySelector(`.slot-pip[data-s="${key}"]`)]));
const rollLabel = el.roll.querySelector('span');

const emptySlots = () => Object.fromEntries(KEYS.map(key => [key, null]));
const state = { round: 0, phase: 'loading', version: '', slots: emptySlots(), roster: {}, ids: [], hasRolled: false, resourceColour: '#333333', missingArt: false };
const rosterCache = new Map(), detailsCache = new Map();
let latestVersion = '', rollTimer = null, slotTasks = new Map(), preparedImage = null, shareBusy = false;
let undoStack = [];
let history = loadHistory();

let rollRandomizer = createBalancedRandomizer(RANDOM_RULES);

function initHUD(){ initHUDPositions(); }
initHUD();
console.log('%cRiftcrafter v20260911g - REAL BUILD POWER SCORING + VISUALS','color:#c8aa6e; font-size:14px; font-weight:bold;');
console.log('Build-meta exists:', !!document.getElementById('build-meta'), 'History grid:', getComputedStyle(document.getElementById('history-list')||{}).display);

function notify(message, kind='info', actionLabel, onAction){
  el.noticeText.textContent = message;
  el.notice.dataset.kind = kind;
  if(actionLabel){
    el.noticeAction.textContent = actionLabel;
    el.noticeAction.hidden = false;
    el.noticeAction.onclick = () => { clearNotice(); onAction(); };
  } else {
    el.noticeAction.hidden = true; el.noticeAction.onclick = null;
  }
  el.notice.hidden = false;
}
function clearNotice(){ el.notice.hidden=true; el.noticeText.textContent=''; el.noticeAction.hidden=true; el.noticeAction.onclick=null; }
function countPicked(){ return KEYS.filter(k=>state.slots[k]).length; }
function isComplete(){ return KEYS.every(k=>state.slots[k]); }
function current(token){ return token===state.round; }
function icon(name){
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','icon'); svg.setAttribute('aria-hidden','true');
  const use = document.createElementNS('http://www.w3.org/2000/svg','use');
  use.setAttribute('href','#icon-'+name); svg.appendChild(use);
  return svg;
}

// Tooltip
const abilityTip = {
  root: $('ability-tip'),
  key: document.querySelector('#ability-tip .tip-key'),
  name: document.querySelector('#ability-tip .tip-name'),
  meta: document.querySelector('#ability-tip .tip-meta'),
  desc: document.querySelector('#ability-tip .tip-desc')
};
function showTip(source){
  const data = source && source._tip;
  if(!data) return;
  abilityTip.key.textContent = data.key;
  abilityTip.name.textContent = data.name;
  abilityTip.meta.textContent = data.meta || '';
  abilityTip.desc.textContent = data.desc;
  abilityTip.root.hidden = false;
  const rect = source.getBoundingClientRect();
  const width = abilityTip.root.offsetWidth, height = abilityTip.root.offsetHeight;
  let left = Math.max(12, Math.min(rect.left + rect.width/2 - width/2, window.innerWidth - width -12));
  let top = rect.top - height -10;
  if(top<8) top = Math.min(rect.bottom+10, window.innerHeight - height -8);
  abilityTip.root.style.left = Math.round(left)+'px';
  abilityTip.root.style.top = Math.round(top)+'px';
}
function hideTip(){ abilityTip.root.hidden=true; }
function bindTipZone(zone){
  zone.addEventListener('mouseover', e=>{
    const source = e.target.closest ? e.target.closest('[data-tip]') : null;
    if(source) showTip(source);
  });
  zone.addEventListener('mouseout', e=>{
    const source = e.target.closest ? e.target.closest('[data-tip]') : null;
    if(source && (!e.relatedTarget || !source.contains(e.relatedTarget))) hideTip();
  });
  zone.addEventListener('focusin', e=>{
    const source = e.target.closest ? e.target.closest('[data-tip]') : null;
    if(source) showTip(source);
  });
  zone.addEventListener('focusout', hideTip);
}

function syncControls(){
  const finished = state.phase==='complete';
  const blocked = ['loading','restoring','error'].includes(state.phase);
  el.roll.hidden = blocked || finished;
  el.roll.disabled = state.phase!=='ready';
  rollLabel.textContent = state.phase==='rolling' ? 'Rolling…' : state.phase==='choosing' ? 'Choose one slot' : state.phase==='exhausted' ? 'No champions left' : 'Roll champion';
  el.reroll.hidden = state.phase!=='choosing';
  el.again.disabled = blocked || !state.ids.length || !state.hasRolled || shareBusy;
  el.copyImage.disabled = !finished || !preparedImage || shareBusy;
  el.download.disabled = !finished || !preparedImage || shareBusy;
  el.shareLink.disabled = !finished || shareBusy;
  el.copyText.disabled = !finished || shareBusy;
  el.count.textContent = `${countPicked()} / ${KEYS.length} locked`;
  el.card.setAttribute('aria-busy', String(state.phase==='rolling' || state.phase==='restoring'));
  el.undoBtn.style.display = undoStack.length ? 'inline-flex' : 'none';
  // sound toggle text
  el.soundToggle.textContent = soundManager.enabled ? '🔊 Sound ON' : '🔇 Sound OFF';
}

function resetRound(phase='ready'){
  state.round++;
  clearInterval(rollTimer); rollTimer=null;
  rollRandomizer.startBuild();
  state.phase=phase; state.slots=emptySlots(); state.hasRolled=false; state.resourceColour='#333333'; state.missingArt=false;
  slotTasks=new Map(); preparedImage=null; shareBusy=false; hideTip(); undoStack=[];
  el.placeholder.hidden=false; el.content.hidden=true; el.shuffle.hidden=true; el.complete.hidden=true;
  el.options.replaceChildren(); el.message.textContent=''; el.message.hidden=false;
  el.stage.textContent='Ready to draft'; el.tags.replaceChildren(); el.tags.hidden=true;
  el.hud.classList.remove('victory'); el.resource.style.backgroundColor=state.resourceColour;
  el.buildState.textContent='Six slots to make your own';
  el.hint.textContent='Finish your six picks to unlock sharing.';
  el.linkPanel.hidden=true; el.linkInput.value=''; clearNotice();
  if(el.buildMeta) el.buildMeta.classList.remove('show');
  KEYS.forEach(key=>{
    const image=$(`img-${key}`), wrapper=$(`u-${key}`);
    image.hidden=true; image.removeAttribute('src'); image.alt='';
    wrapper.classList.remove('is-filled','flash');
    wrapper.removeAttribute('data-tip'); wrapper._tip=null;
    slotPips[key].classList.remove('done');
  });
  syncControls();
  saveDraft(null);
  return state.round;
}
function clearBuildHash(){
  try{
    const url=new URL(location.href); url.hash='';
    history.replaceState(null,'',url.href);
  }catch(_){}
}
function playAgain(){
  if(el.again.disabled) return;
  soundManager.play('replay');
  clearBuildHash();
  resetRound('ready');
  el.card.hidden=false; el.loading.hidden=true;
  el.roll.focus({preventScroll:true});
}

// --- Data fetching ---
async function request(url, type='json', cache='force-cache'){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch(url,{mode:'cors',cache,signal:controller.signal});
    if(!response.ok) throw new Error('HTTP '+response.status);
    return await response[type]();
  }finally{ clearTimeout(timeout); }
}
async function getLatestVersion(){
  if(!latestVersion){
    const versions=await request(CDN+'/api/versions.json','json','no-cache');
    if(!Array.isArray(versions) || !validPatch(versions[0])) throw new Error('Invalid patch list');
    latestVersion=versions[0];
  }
  return latestVersion;
}
function getRoster(patch){
  if(!rosterCache.has(patch)){
    const task=request(CDN+'/cdn/'+patch+'/data/en_US/champion.json').then(result=>{
      if(!result.data || !Object.keys(result.data).length) throw new Error('No champions');
      return result.data;
    }).catch(error=>{ rosterCache.delete(patch); throw error; });
    rosterCache.set(patch,task);
  }
  return rosterCache.get(patch);
}
function getChampion(id, patch=state.version){
  const key=patch+'/'+id;
  if(!detailsCache.has(key)){
    const task=request(CDN+'/cdn/'+patch+'/data/en_US/champion/'+encodeURIComponent(id)+'.json').then(result=>{
      const champ=result.data && result.data[id];
      if(!champ || !champ.passive || !Array.isArray(champ.spells) || champ.spells.length<4) throw new Error('Incomplete champion data');
      return champ;
    }).catch(error=>{ detailsCache.delete(key); throw error; });
    detailsCache.set(key,task);
  }
  return detailsCache.get(key);
}
function imageURL(group,file,patch=state.version){ return CDN+'/cdn/'+patch+'/img/'+group+'/'+encodeURIComponent(file); }
function modelURL(id,patch=state.version){ return imageURL('champion',id+'.png',patch); }

function cleanAbilityText(value){
  return (value||'').replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,'').replace(/\{\{[^}]*\}\}/g,'').replace(/@[A-Za-z_]+@/g,'').replace(/\s+/g,' ').trim();
}
function fmtList(value){ return Array.isArray(value) ? value.join(' / ') : String(value==null?'':value); }
function firstNum(value){ return Number((Array.isArray(value)?value[0]:value)||0); }
function tipMeta(spell, partype){
  const parts=[];
  const cost=firstNum(spell.cost);
  if(cost>0){
    let text='Cost '+(spell.costBurn ? spell.costBurn.replace(/\//g,' / ') : fmtList(spell.cost));
    if(partype && partype.toLowerCase()!=='none') text+=' '+partype;
    parts.push(text);
  }
  const cd=firstNum(spell.cooldown);
  if(cd>0) parts.push('Cooldown '+(spell.cooldownBurn ? spell.cooldownBurn.replace(/\//g,' / ') : fmtList(spell.cooldown)));
  return parts.join('  ·  ');
}
function itemFor(champ,key,patch=state.version){
  let abilityName, url, spell=null;
  if(key==='model'){ abilityName='Champion model'; url=modelURL(champ.id,patch); }
  else if(key==='passive'){ spell=champ.passive; abilityName=spell.name; url=imageURL('passive',spell.image.full,patch); }
  else { spell=champ.spells[['q','w','e','r'].indexOf(key)]; abilityName=spell.name; url=imageURL('spell',spell.image.full,patch); }
  return { key, champId: champ.id, champName: champ.name, abilityName, url, resourceType: champ.partype||'', asset:null, tip: spell ? {key: LABELS[key], name: abilityName, meta: tipMeta(spell,champ.partype), desc: cleanAbilityText(spell.description)} : null };
}
function makeFallback(label){
  const canvas=document.createElement('canvas'); canvas.width=64; canvas.height=64;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#0a1428'; ctx.fillRect(0,0,64,64);
  ctx.strokeStyle='#c8aa6e'; ctx.lineWidth=3; ctx.strokeRect(2,2,60,60);
  ctx.fillStyle='#c8aa6e'; ctx.font='bold 24px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(label,32,32); return canvas.toDataURL('image/png');
}
function previewImage(image,src,label,alt){
  image.alt=alt;
  image.onerror=()=>{
    if(image.src!==src) return;
    image.onerror=null; image.src=makeFallback(label);
  };
  image.src=src;
}
const frameReady = Promise.resolve(el.frame.decode ? el.frame.decode().catch(()=>null) : null).then(()=> (el.frame.naturalWidth ? el.frame : null));

function queueSlotImage(key,item,token){
  const image=$(`img-${key}`), wrapper=$(`u-${key}`);
  const task=new Promise(resolve=>{
    const done=fallback=>resolve({src:image.src,image,fallback});
    if(image.currentSrc===item.url && image.complete && image.naturalWidth){ done(false); return; }
    image.crossOrigin='anonymous';
    image.onload=()=>{ image.onload=image.onerror=null; done(false); };
    image.onerror=()=>{
      image.onload=image.onerror=null;
      image.crossOrigin=null;
      image.src=makeFallback(SHORT[key]);
      done(true);
    };
    image.alt=item.champName+' — '+item.abilityName;
    image.src=item.url;
  });
  task.then(asset=>{
    if(!current(token) || state.slots[key]!==item) return;
    item.asset=asset;
    image.hidden=false;
    if(item.tip){ wrapper._tip=item.tip; wrapper.setAttribute('data-tip','1'); }
    wrapper.classList.add('is-filled','flash');
    setTimeout(()=>{ if(current(token)) wrapper.classList.remove('flash'); },550);
    if(asset.fallback && !state.missingArt){
      state.missingArt=true;
      notify('Some artwork could not load. Letter placeholders are shown instead.','warning');
    }
  });
  slotTasks.set(key,task);
  return task;
}
function setResource(type){
  const p=type.toLowerCase();
  let colour='#333333';
  if(p.includes('mana')) colour='#1a78c2';
  else if(p.includes('energy')) colour='#e0b034';
  else if(['fury','rage','ferocity','grit','flow'].some(v=>p.includes(v))) colour='#c21a1a';
  else if(p.includes('heat')) colour='#e0681b';
  state.resourceColour=colour; el.resource.style.backgroundColor=colour;
}
function fillSlot(key,item,token){
  undoStack.push({key, prev: state.slots[key], time: Date.now()});
  if(undoStack.length>20) undoStack.shift();
  state.slots[key]=item;
  if(key==='model') setResource(item.resourceType);
  slotPips[key].classList.add('done');
  queueSlotImage(key,item,token);
  persistDraft();
}
function persistDraft(){
  if(isComplete()){
    saveDraft(null);
    return;
  }
  const draft = {
    version: state.version,
    round: state.round,
    slots: Object.fromEntries(KEYS.map(k=>[k, state.slots[k] ? {champId: state.slots[k].champId, champName: state.slots[k].champName, abilityName: state.slots[k].abilityName, url: state.slots[k].url, resourceType: state.slots[k].resourceType, tip: state.slots[k].tip, key:k} : null])),
  };
  saveDraft(draft);
}
function noChampionsLeft(){
  state.phase='exhausted';
  el.shuffle.hidden=true;
  el.message.textContent='All available champions have appeared in this build. Select Play again to start a new one.';
  el.stage.textContent='No unused champions';
  syncControls();
}
function rollChampion(){
  if(state.phase!=='ready' || !state.ids.length) return;
  const token=state.round, patch=state.version;
  const pool = rollRandomizer.eligible(state.ids);
  if(!pool.length){ noChampionsLeft(); return; }
  state.phase='rolling'; state.hasRolled=true; hideTip();
  el.stage.textContent='Rolling a champion';
  el.placeholder.hidden=true; el.content.hidden=true; el.shuffle.hidden=false; el.message.textContent='';
  syncControls();
  
  // Play roll sound - longer now (2.8s)
  soundManager.play('roll', { volume: 0.7 });
  
  let ticks=0;
  // Longer roll: 35 ticks * 80ms = 2.8s to match sound
  const total = matchMedia('(prefers-reduced-motion: reduce)').matches ? 6 : 35;
  rollTimer=setInterval(()=>{
    if(!current(token)) return;
    const id=pool[Math.floor(Math.random()*pool.length)];
    previewImage(el.shuffleImg, modelURL(id,patch),'?',state.roster[id].name);
    el.shuffleName.textContent=state.roster[id].name;
    if(++ticks>=total){ clearInterval(rollTimer); rollTimer=null; finishRoll(token,patch); }
  },80);
}
async function finishRoll(token,patch){
  if(!current(token)) return;
  let id = rollRandomizer.pick(state.ids);
  if(!id){ noChampionsLeft(); return; }
  try{
    const champ=await getChampion(id,patch);
    if(!current(token)) return;
    state.phase='choosing'; buildCard(champ,token);
    rollRandomizer.reveal(id);
  }catch(_){
    if(!current(token)) return;
    state.phase='ready'; el.placeholder.hidden=false;
    el.message.textContent='Couldn’t load this champion. Roll again to retry.';
    el.stage.textContent='Connection interrupted';
  }finally{
    if(current(token)){ el.shuffle.hidden=true; syncControls(); }
  }
}
function buildCard(champ,token){
  el.content.hidden=false; el.placeholder.hidden=true; hideTip();
  el.stage.textContent=`Pick ${countPicked()+1} of ${KEYS.length}`;
  previewImage(el.portrait, modelURL(champ.id),'?',champ.name);
  el.name.textContent=champ.name; el.title.textContent=champ.title;
  el.options.replaceChildren();
  KEYS.forEach(key=>{
    const item=itemFor(champ,key);
    const button=document.createElement('button'); button.type='button'; button.className='draft-option'; button.dataset.slot=key;
    button.disabled=Boolean(state.slots[key]);
    if(item.tip){ button._tip=item.tip; button.setAttribute('data-tip','1'); }
    button.setAttribute('aria-label', `${LABELS[key]}: ${item.abilityName}${button.disabled?' — already filled':''}`);
    const badge=document.createElement('span'); badge.className='slot-badge'; badge.textContent=LABELS[key];
    const wrap=document.createElement('span'); wrap.className='option-img-wrap';
    const image=document.createElement('img'); previewImage(image,item.url,SHORT[key],item.abilityName); wrap.appendChild(image);
    const name=document.createElement('span'); name.className='spell-name'; name.textContent=key==='model'?champ.name:item.abilityName;
    button.append(badge,wrap,name);
    if(button.disabled){ const lock=document.createElement('span'); lock.className='lock-icon'; lock.appendChild(icon('lock')); button.appendChild(lock); }
    else button.addEventListener('click',()=>selectSlot(item,token));
    el.options.appendChild(button);
  });
  el.message.textContent=`Rolled ${champ.name}. Choose one available slot.`;
  const firstOption=el.options.querySelector('button:not(:disabled)');
  if(firstOption) firstOption.focus({preventScroll:true});
}
function selectSlot(item,token){
  if(!current(token) || state.phase!=='choosing' || state.slots[item.key]) return;
  soundManager.play('pick');
  state.phase='ready'; fillSlot(item.key,item,token);
  el.options.querySelectorAll('button').forEach(b=>{ b.disabled=true; });
  
  if(isComplete()){
    completeBuild(false);
  } else {
    const remaining=KEYS.length-countPicked();
    el.message.textContent=`${LABELS[item.key]} locked. ${remaining} ${remaining===1?'slot':'slots'} left — auto rolling...`;
    el.buildState.textContent=`${countPicked()} of ${KEYS.length} slots locked`;
    syncControls();
    // Auto roll again after short delay
    setTimeout(()=>{
      if(current(token) && state.phase==='ready' && !isComplete()){
        rollChampion();
      }
    }, 600);
  }
}
function rerollCurrent(){
  if(state.phase!=='choosing') return;
  soundManager.play('roll');
  state.phase='ready';
  el.content.hidden=true; el.placeholder.hidden=false;
  el.message.textContent='';
  rollChampion();
}
function renderTags(){
  el.tags.replaceChildren(); el.tags.hidden=false;
  KEYS.forEach(key=>{
    const item=state.slots[key];
    const tag=document.createElement('div'); tag.className='ctag'; tag.title=`${LABELS[key]}: ${item.champName} — ${item.abilityName}`;
    const label=document.createElement('b'); label.textContent=SHORT[key];
    const info=document.createElement('span'); info.className='tag-info';
    const name=document.createElement('strong'); name.textContent=item.champName;
    const spell=document.createElement('small'); spell.textContent=item.abilityName;
    info.append(name,spell); tag.append(label,info);
    const btn=document.createElement('button'); btn.className='reroll-slot'; btn.textContent='↻'; btn.title='Reroll this slot';
    btn.onclick=async (e)=>{
      e.stopPropagation();
      if(!state.slots[key]) return;
      state.slots[key]=null;
      const img=$(`img-${key}`); img.hidden=true; img.removeAttribute('src');
      $(`u-${key}`).classList.remove('is-filled');
      slotPips[key].classList.remove('done');
      state.phase='ready';
      el.complete.hidden=true; el.placeholder.hidden=false; el.content.hidden=true;
      el.tags.hidden=true;
      el.hint.textContent=`Slot ${LABELS[key]} cleared — roll again to replace it.`;
      syncControls();
      persistDraft();
      rollChampion();
    };
    tag.appendChild(btn);
    el.tags.appendChild(tag);
  });
}
function completeBuild(shared, skipHistory=false){
  state.phase='complete'; state.hasRolled=true; hideTip();
  soundManager.play('complete');
  el.loading.hidden=true; el.card.hidden=false; el.placeholder.hidden=true; el.content.hidden=true; el.shuffle.hidden=true;
  el.complete.hidden=false; el.message.hidden=true;
  el.stage.textContent=shared ? 'Shared build' : 'Build complete';
  el.completeDescription.textContent=shared ? 'The exact six picks from your link. Share them again or start a new draft.' : 'Save it, share it, or take another roll of the dice.';
  el.hud.classList.add('victory'); el.buildState.textContent=`Patch ${state.version} · Build complete`;
  el.hint.textContent='Preparing your shareable image…';
  renderTags(); syncControls(); prepareImage(state.round);

  renderRating();
  if(!skipHistory){
    // Push to history
    const entry={
      time: Date.now(),
      version: state.version,
      slots: KEYS.map(k=>({key:k, champId: state.slots[k].champId, champName: state.slots[k].champName, ability: state.slots[k].abilityName, url: state.slots[k].url})),
    };
    pushHistory(entry);
    history=loadHistory();
    renderHistory();
  }

  el.again.focus({preventScroll:true});
}

async function openHistoryBuild(h){
  try{
    soundManager.play('pick');
    // Only open the build — do NOT rewrite history (no new "character" entry)
    const data={v:1,p:h.version,c:h.slots.map(s=>s.champId)};
    location.hash='build='+encodeBuildToken(data);
    // Force boot to restore immediately (bypass mid-draft warning)
    await boot();
    window.scrollTo({top:0, behavior:'smooth'});
  }catch(e){
    console.error('openHistoryBuild failed', e);
    notify('Failed to open history build','warning');
  }
}
async function prepareImage(token){
  try{
    const result = await exportPNG(state.slots, state.resourceColour, el.frame, slotTasks);
    if(!current(token) || state.phase!=='complete') return;
    preparedImage={...result, round: token};
    el.hint.textContent='Copy the image, send a link, or download the PNG.';
    syncControls();
  }catch(_){
    if(!current(token)) return;
    el.hint.textContent='Image export is unavailable. You can still share the build link.';
    notify('The image could not be prepared. Refresh the page and try again.','warning');
    syncControls();
  }
}
function downloadPNG(){
  if(!preparedImage || preparedImage.round!==state.round) return false;
  soundManager.play('share');
  const url=URL.createObjectURL(preparedImage.blob), anchor=document.createElement('a');
  anchor.href=url; anchor.download='riftcrafter-build.png'; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000); return true;
}
async function copyImage(){
  if(!preparedImage || shareBusy) return;
  const token=state.round;
  if(navigator.clipboard && typeof ClipboardItem!=='undefined'){
    try{
      await navigator.clipboard.write([new ClipboardItem({'image/png': preparedImage.blob})]);
      if(current(token)) { soundManager.play('share'); notify('Image copied to clipboard — paste anywhere (Ctrl/Cmd+V).'); }
      return;
    }catch(_){}
  }
  shareImage();
}
async function shareImage(){
  if(!preparedImage || shareBusy) return;
  const token=state.round, file=preparedImage.file;
  let canShareFiles=false;
  try{ canShareFiles=Boolean(navigator.share && navigator.canShare && navigator.canShare({files:[file]})); }catch(_){}
  if(!canShareFiles){
    downloadPNG(); notify('Your browser doesn’t support image sharing here, so the PNG download has started.');
    return;
  }
  shareBusy=true; syncControls();
  try{
    await navigator.share({files:[file], title:'My Riftcrafter build', text:'Six picks. One impossible champion.'});
    if(current(token)) { soundManager.play('share'); notify('Image shared.'); }
  }catch(error){
    if(current(token) && error.name!=='AbortError'){
      downloadPNG(); notify('System sharing is unavailable. The PNG download has started instead.');
    }
  }finally{ if(current(token)){ shareBusy=false; syncControls(); } }
}
function buildLinkURL(){
  if(!isComplete()) return null;
  if(!['https:','http:'].includes(location.protocol)){
    notify('Publish this page to GitHub Pages first to create a public share link.','warning'); return null;
  }
  return buildLink(state.slots, state.version, KEYS);
}
function showLinkPanel(url){
  el.linkInput.value=url; el.linkPanel.hidden=false;
  const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  $('link-description').textContent= local ? 'This is a local preview link. Use your published GitHub Pages site when sharing.' : 'Anyone with this link can open the same six picks. No account needed.';
}
async function copyLink(url, token=state.round){
  showLinkPanel(url);
  try{
    if(!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(url);
    if(current(token)) { soundManager.play('share'); notify('Build link copied.'); }
  }catch(_){
    if(!current(token)) return;
    el.linkInput.focus({preventScroll:true}); el.linkInput.select(); el.linkInput.setSelectionRange(0,url.length);
    let copied=false;
    try{ copied=document.execCommand('copy'); }catch(_){}
    notify(copied ? 'Build link copied.' : 'Copy the selected link above to share your build.');
  }
}
function copyTextFn(){
  if(state.phase!=='complete' || shareBusy) return;
  const text=buildText(state.slots, state.version, LABELS);
  if(!text) return;
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=>{ soundManager.play('share'); notify('Build text copied.'); },()=>{ window.prompt('Copy your build:',text); });
  }else{
    window.prompt('Copy your build:',text);
  }
}
async function shareLinkFn(){
  if(shareBusy || state.phase!=='complete') return;
  const token=state.round, url=buildLinkURL();
  if(!url) return;
  if(!navigator.share){ await copyLink(url,token); return; }
  shareBusy=true; syncControls();
  try{
    await navigator.share({title:'My Riftcrafter build', text:'Open my exact six-pick build on Riftcrafter.', url});
    if(current(token)) { soundManager.play('share'); notify('Build link shared.'); }
  }catch(error){
    if(current(token) && error.name!=='AbortError') await copyLink(url,token);
  }finally{ if(current(token)){ shareBusy=false; syncControls(); } }
}



const MOBILE_CHAMPS=['kaisa',"kai'sa",'ezreal','yasuo','zed','katarina','vayne','lucian','kayn','leblanc','tristana','jax','leesin','renekton','akali','viktor','fiora','gnar'];
const TROLL_CHAMPS=['teemo','shaco','yuumi'];
const POWER_RX={
  mobility:/(dash|leap|blink|tumble|vault|jump|charg|eject|slid|sweep|flick|swift|bolts)/,
  cc:/(stun|root|knock|charm|fear|taunt|sleep|suppress|silence|blind|immobiliz|snare|restrain|bind|web|panic|net\b)/,
  dmg:/(execut|true damage|lifesteal|on ?hit|burn|poison|bleed|damage)/,
  troll:/(trap|stealth|invisib|disguise|\bward\b|ambush|gank)/
};
function powerScore(slots){
  try{
    const stats={mobility:0,cc:0,dmg:0,troll:0,synergy:0};
    const all=Object.values(slots).filter(Boolean);
    if(!all.length) return {mobility:0,cc:0,dmg:0,troll:0,synergy:0,total:0,rank:'C'};
    const textOf=it=>[it.abilityName,it.tip&&it.tip.desc].join(' ').toLowerCase();
    const champOf=it=>(it.champName||'').toLowerCase();
    all.forEach(it=>{
      const t=textOf(it);
      if(POWER_RX.mobility.test(t)) stats.mobility+=2;
      if(POWER_RX.cc.test(t)) stats.cc+=2;
      if(POWER_RX.dmg.test(t)) stats.dmg+=1;
      if(POWER_RX.dmg.test(t)&&it.key==='r') stats.dmg+=1;
      if(/execut/.test(t)) stats.dmg+=1;
      if(TROLL_CHAMPS.some(x=>champOf(it).includes(x))) stats.troll+=3;
      if(POWER_RX.troll.test(t)) stats.troll+=2;
    });
    const model=all.find(i=>i.key==='model');
    if(model&&MOBILE_CHAMPS.some(x=>champOf(model).includes(x))) stats.mobility+=2;
    // Synergy: how well the six stolen parts click (resource fit + troll team-up)
    const parts=all.map(i=>(i.resourceType||'').trim().toLowerCase());
    const modelType=parts[0];
    if(modelType&&modelType!=='none'){
      const sameAsModel=parts.slice(1).filter(p=>p===modelType).length;
      stats.synergy+={5:4,4:3,3:2,2:1}[sameAsModel]||0;
    }
    const counts={};
    parts.forEach(p=>{ if(p&&p!=='none') counts[p]=(counts[p]||0)+1; });
    const clique=Object.keys(counts).length?Math.max(...Object.values(counts)):0;
    stats.synergy+= clique>=5?3 : clique===4?2 : clique===3?1 : 0;
    const trolls=all.filter(i=>TROLL_CHAMPS.some(x=>champOf(i).includes(x))).length;
    stats.synergy+= trolls>=2?2 : trolls===1?1 : 0;
    // A complete six-slot build is already a build — small foundation
    stats.mobility+=2; stats.cc+=2; stats.dmg+=3; stats.troll+=1;
    for(const k in stats) stats[k]=Math.min(10,Math.max(0,Math.round(stats[k])));
    const total=stats.mobility+stats.cc+stats.dmg+stats.troll+stats.synergy;
    let rank='C';
    if(total>=15) rank='B';
    if(total>=22) rank='A';
    if(total>=29) rank='S';
    if(total>=36) rank='S+';
    if(total>=43) rank='SSS BROKEN';
    return {...stats,total,rank};
  }catch(e){
    console.error('powerScore error', e);
    return {mobility:5,cc:5,dmg:5,troll:5,synergy:5,total:25,rank:'A'};
  }
}
function renderRating(){
  try{
    const titleEl=document.getElementById('build-power-title');
    const descEl=document.getElementById('build-power-desc');
    if(!el.buildMeta || !el.buildPower) return;
    if(!isComplete()){ el.buildMeta.classList.remove('show'); return; }
    const score=powerScore(state.slots);
    let rankClass='B';
    if(score.rank.includes('SSS')) rankClass='SSS';
    else if(score.rank.includes('S+')) rankClass='S';
    else if(score.rank.includes('S')) rankClass='S';
    else if(score.rank.includes('A')) rankClass='A';
    const fill=v=>`<i class="pfill" style="width:${Math.round(v*10)}%"></i>`;
    el.buildPower.innerHTML=`
      <div class="power-total-row">
        <span class="power-score">${score.total}<small>/50</small></span>
        <div class="power-track"><i style="width:${Math.round(score.total*2)}%"></i></div>
      </div>
      <div class="power-badges">
        <span class="power-badge rank ${rankClass}">★ RANK ${score.rank} ★</span>
        <span class="power-badge">Mobility ${score.mobility}/10${fill(score.mobility)}</span>
        <span class="power-badge">CC ${score.cc}/10${fill(score.cc)}</span>
        <span class="power-badge">DMG ${score.dmg}/10${fill(score.dmg)}</span>
        <span class="power-badge">Troll ${score.troll}/10${fill(score.troll)}</span>
        <span class="power-badge">Synergy ${score.synergy}/10${fill(score.synergy)}</span>
      </div>`;
    if(titleEl) titleEl.textContent='BUILD POWER';
    if(descEl){
      const RANK_DESC={'SSS BROKEN':'This build should be illegal. Absolutely broken.','S+':'God-tier draft. Unstoppable.','S':'Elite picks. The Rift fears you.','A':'Strong synergy, very playable.','B':'Chaotic but fun!','C':'A walk in the Rift... for your enemies.'};
      let desc=RANK_DESC[score.rank]||RANK_DESC.B;
      if(score.synergy>=8) desc+=' Six parts that actually click — the impossible champion holds together.';
      else if(score.troll>=8) desc+=' Maximum troll energy detected.';
      else if(score.mobility>=8) desc+=' Basically a pinball machine.';
      descEl.textContent=desc;
    }
    el.buildMeta.classList.add('show');
  }catch(e){
    console.error('renderRating failed', e);
  }
}

function renderHistory(){
  if(!history.length){ el.historyList.innerHTML=`<small style="color:#7e909f;">No history yet</small>`; return; }
  el.historyList.innerHTML='';
  history.forEach((h,index)=>{
    const model=(h.slots||[]).find(s=>s.key==='model') || (h.slots||[])[0];
    if(!model) return;
    const div=document.createElement('div'); div.className='history-item';
    div.innerHTML=`<img src="${model.url}" alt=""><small>${model.champName}</small><small>${new Date(h.time).toLocaleTimeString()} • ${new Date(h.time).toLocaleDateString()}</small>`;
    div.title=`Click to open ${model.champName} build`;
    div.onclick=()=>{
      soundManager.play('pick');
      openHistoryBuild(h);
    };
    const x=document.createElement('button');
    x.type='button'; x.className='history-delete'; x.textContent='×';
    x.title='Remove this build from history';
    x.setAttribute('aria-label',`Remove ${model.champName} build from history`);
    x.onclick=(e)=>{
      e.stopPropagation();
      soundManager.play('remove');
      history.splice(index,1);
      saveHistory(history);
      renderHistory();
    };
    div.appendChild(x);
    el.historyList.appendChild(div);
  });
}
function doUndo(){
  if(!undoStack.length) return;
  const last=undoStack.pop();
  if(last.prev){
    state.slots[last.key]=last.prev;
    queueSlotImage(last.key,last.prev,state.round);
    slotPips[last.key].classList.add('done');
  }else{
    state.slots[last.key]=null;
    const img=$(`img-${last.key}`); img.hidden=true; img.removeAttribute('src');
    $(`u-${last.key}`).classList.remove('is-filled');
    slotPips[last.key].classList.remove('done');
  }
  if(isComplete()) completeBuild(false);
  else{
    el.buildState.textContent=`${countPicked()} of ${KEYS.length} slots locked`;
    el.hint.textContent='Undid last pick.';
    syncControls();
  }
  persistDraft();
}

function setupKeyboard(){
  window.addEventListener('keydown', (e)=>{
    if(e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA') return;
    const key=e.key.toLowerCase();
    if(key===' ' || key==='r'){
      e.preventDefault();
      if(state.phase==='ready') rollChampion();
    } else if(['1','2','3','4','5','6'].includes(key)){
      const idx=parseInt(key)-1;
      const k=KEYS[idx];
      if(state.phase==='choosing'){
        const btn=el.options.querySelector(`button[data-slot="${k}"]:not(:disabled)`);
        if(btn) btn.click();
      }
    } else if(key==='z'){
      if(undoStack.length) { e.preventDefault(); doUndo(); }
    } else if(key==='escape'){
      hideTip();
      el.linkPanel.hidden=true;
    }
  });
}

async function boot(){
  const token=resetRound('loading');
  el.loading.hidden=false; el.card.hidden=true; el.retry.hidden=true; el.fresh.hidden=true;
  el.loading.querySelector('.spinner').hidden=false;
  let shared=null;
  try{ shared=parseSharedBuild(); }catch(_){ clearBuildHash(); notify('That build link isn’t valid. Start a fresh draft below.','warning'); }
  try{
    el.loadText.textContent= shared ? 'Opening the shared build…' : 'Connecting to Data Dragon…';
    const patch= shared ? shared.p : await getLatestVersion();
    const roster=await getRoster(patch);
    if(!current(token)) return;
    state.version=patch; state.roster=roster; state.ids=Object.keys(roster);

    const savedDraft = !shared ? loadDraft() : null;
    if(savedDraft && savedDraft.version===patch && savedDraft.slots){
      try{
        const uniqueIds = [...new Set(Object.values(savedDraft.slots).filter(Boolean).map(s=>s.champId))];
        const champions = await Promise.all(uniqueIds.map(id=>getChampion(id,patch)));
        if(!current(token)) return;
        const byId=new Map(champions.map(c=>[c.id,c]));
        Object.entries(savedDraft.slots).forEach(([k, data])=>{
          if(data){
            const champ=byId.get(data.champId);
            if(champ){
              const item=itemFor(champ,k,patch);
              state.slots[k]=item;
              queueSlotImage(k,item,token);
              slotPips[k].classList.add('done');
              if(k==='model') setResource(item.resourceType);
            }
          }
        });
        state.hasRolled=true;
        if(isComplete()){
          completeBuild(false);
        }else{
          state.phase='ready';
          el.loading.hidden=true; el.card.hidden=false;
          el.placeholder.hidden=false; el.content.hidden=true;
          el.buildState.textContent=`${countPicked()} of ${KEYS.length} slots locked — restored`;
          notify('Found unfinished draft — restored!');
          syncControls();
        }
        return;
      }catch(e){ console.warn('restore failed',e); }
    }

    if(shared){
      if(!shared.c.every(id=>Object.prototype.hasOwnProperty.call(roster,id))) throw new Error('Unknown champion in shared build');
      state.phase='restoring'; syncControls();
      el.loadText.textContent='Restoring all six picks…';
      const unique=[...new Set(shared.c)];
      const champions=await Promise.all(unique.map(id=>getChampion(id,patch)));
      if(!current(token)) return;
      const byId=new Map(champions.map(champ=>[champ.id,champ]));
      KEYS.forEach((key,i)=>fillSlot(key,itemFor(byId.get(shared.c[i]),key,patch),token));
      // skipHistory: opening a shared/history build must NOT be recorded in history again
      completeBuild(true, true);
    }else{
      state.phase='ready'; el.loading.hidden=true; el.card.hidden=false; syncControls();
    }
  }catch(_){
    if(!current(token)) return;
    state.phase='error'; el.loading.hidden=false; el.card.hidden=true;
    el.loading.querySelector('.spinner').hidden=true; el.retry.hidden=false; el.fresh.hidden=!shared;
    el.loadText.textContent= shared ? 'This shared build couldn’t load. Check your connection and retry.' : 'Champion data couldn’t load. Check your internet connection and retry.';
    syncControls();
  }
}

bindTipZone(el.options); bindTipZone(el.hud);
window.addEventListener('scroll', hideTip, {passive:true});
window.addEventListener('resize', hideTip);
el.roll.addEventListener('click', rollChampion);
el.again.addEventListener('click', playAgain);
el.reroll.addEventListener('click', rerollCurrent);
el.copyImage.addEventListener('click', copyImage);
el.shareLink.addEventListener('click', shareLinkFn);
el.download.addEventListener('click', ()=>{ if(downloadPNG()) notify('PNG download started.'); });
el.copyText.addEventListener('click', copyTextFn);
el.copy.addEventListener('click', ()=>{ if(el.linkInput.value) copyLink(el.linkInput.value); });
el.closeLink.addEventListener('click', ()=>{ el.linkPanel.hidden=true; el.shareLink.focus({preventScroll:true}); });
el.retry.addEventListener('click', boot);
el.fresh.addEventListener('click', ()=>{ clearBuildHash(); boot(); });

renderHistory();
el.undoBtn.addEventListener('click', doUndo);
el.clearHistoryBtn.addEventListener('click', ()=>{
  if(confirm('Clear all history?')){ history=[]; saveHistory([]); renderHistory(); }
});
el.soundToggle.addEventListener('click', ()=>{
  const on = soundManager.toggle();
  syncControls();
  notify(on ? 'Sound enabled' : 'Sound muted');
});

setupKeyboard();

window.addEventListener('hashchange', ()=>{
  const hash=location.hash;
  const params=new URLSearchParams(hash);
  if(!params.has('build')) return;
  let data;
  try{ data=decodeBuildToken(params.get('build')); }catch(_){ data=null; }
  const midDraft=countPicked()>0 && !isComplete() && ['ready','choosing','rolling','exhausted'].includes(state.phase);
  if(data===null){
    if(midDraft){ clearBuildHash(); notify('That build link isn’t valid. Your current draft is kept.','warning'); }
    else boot();
    return;
  }
  if(midDraft) notify('A shared build link was opened. Loading it will replace your current draft.','warning','Load shared build',boot);
  else boot();
});

boot();
