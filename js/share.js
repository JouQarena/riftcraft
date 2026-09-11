export const BUILD_SLOTS = 6;

export function validPatch(value) {
  return typeof value === 'string' && /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value);
}
export function encodeBuildToken(data) {
  return btoa(JSON.stringify(data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeBuildToken(token) {
  if (!token || token.length > 1500 || !/^[A-Za-z0-9_-]+$/.test(token)) throw new Error('Invalid build link');
  const padded = token + '='.repeat((4 - (token.length % 4)) % 4);
  let data;
  try { data = JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/'))); }
  catch (_) { throw new Error('Invalid build link'); }
  if (!data || data.v !== 1 || !validPatch(data.p) || !Array.isArray(data.c) || data.c.length !== BUILD_SLOTS || !data.c.every(id => typeof id === 'string' && /^[A-Za-z0-9]{1,32}$/.test(id))) throw new Error('Invalid build link');
  return data;
}
export function parseSharedBuild() {
  const hash = location.hash.slice(1);
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  if (!params.has('build')) return null;
  return decodeBuildToken(params.get('build'));
}
export function buildLink(slots, version, KEYS) {
  if (!slots) return null;
  if (!['https:', 'http:'].includes(location.protocol)) return null;
  const data = { v: 1, p: version, c: KEYS.map(key => slots[key].champId) };
  const url = new URL(location.href);
  url.hash = 'build=' + encodeBuildToken(data);
  return url.href;
}
export function buildText(slots, version, LABELS) {
  if (!slots) return null;
  const lines = Object.keys(slots).map(key => {
    const item = slots[key];
    return `${LABELS[key]}: ${item.champName} — ${item.abilityName}`;
  });
  return `My Riftcrafter build — patch ${version}\n${lines.join('\n')}`;
}
