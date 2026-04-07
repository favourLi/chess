/**
 * 观战输入规范化（可单测，无 Socket 依赖）
 */

const UUID_LOOSE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @param {string} raw
 * @returns {{ kind: 'empty' } | { kind: 'gameId', value: string } | { kind: 'code', value: string }}
 */
export function parseWatchInput(raw) {
  let s = String(raw ?? '')
    .trim()
    .replace(/^\uFEFF/, '');
  const compact = s.replace(/\s+/g, '');
  if (!compact) return { kind: 'empty' };
  if (UUID_LOOSE.test(compact)) {
    return { kind: 'gameId', value: compact.toLowerCase() };
  }
  return { kind: 'code', value: s.toUpperCase() };
}
