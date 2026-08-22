const KEY = 'myh5v1k'

const xor = (s: string) =>
  [...s]
    .map((ch, i) => String.fromCharCode(ch.charCodeAt(0) ^ KEY.charCodeAt(i % KEY.length)))
    .join('')

/** 与 H5 / my_service EncodePublicId 一致：数字 id → 前台编号。 */
export function encodeId(id: number | string) {
  const n = Number(id)
  if (!Number.isFinite(n) || n <= 0) return ''
  const raw = `${n}:${(n * 31 + 7).toString(36)}`
  return btoa(xor(raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeId(token: string | string[]) {
  const rawToken = Array.isArray(token) ? token[0] : token
  if (!rawToken) return 0
  try {
    const b64 = rawToken.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const raw = xor(atob(pad))
    const [idPart, check] = raw.split(':')
    const n = Number(idPart)
    if (!n || (n * 31 + 7).toString(36) !== check) return 0
    return n
  } catch {
    return 0
  }
}

/** 搜索框：数字主键或前台加密编号都能还原。 */
export function parseAdminId(raw?: string) {
  const text = String(raw || '').trim()
  if (!text) return 0
  const n = Number(text)
  if (Number.isInteger(n) && n > 0) return n
  return decodeId(text)
}
