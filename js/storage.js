const KEYS = {
  history: 'riftcrafter_history_final',
  bans: 'riftcrafter_bans_final',
  draft: 'riftcrafter_draft_final'
};

export function loadBans() {
  try { return JSON.parse(localStorage.getItem(KEYS.bans) || '[]'); } catch { return []; }
}
export function saveBans(bans) {
  localStorage.setItem(KEYS.bans, JSON.stringify(bans));
}
export function loadHistory() {
  try { return JSON.parse(localStorage.getItem(KEYS.history) || '[]'); } catch { return []; }
}
export function saveHistory(history) {
  localStorage.setItem(KEYS.history, JSON.stringify(history.slice(0, 30)));
}
export function pushHistory(entry) {
  const h = loadHistory();
  h.unshift(entry);
  saveHistory(h.slice(0, 30));
  return h;
}
export function saveDraft(draft) {
  try {
    if (!draft) localStorage.removeItem(KEYS.draft);
    else localStorage.setItem(KEYS.draft, JSON.stringify(draft));
  } catch {}
}
export function loadDraft() {
  try {
    const raw = localStorage.getItem(KEYS.draft);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function isBanned(champName, champId, bans) {
  const lowerName = champName.toLowerCase();
  const lowerId = champId.toLowerCase();
  return bans.some(b => {
    const bl = b.toLowerCase();
    return lowerName.includes(bl) || lowerId === bl;
  });
}
