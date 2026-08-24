/** 后台 <img> 不解密: 网关 cover.bnc 改成 cover.jpg; 其它 .bnc 走解密预览。 */
export function adminMediaUrl(src?: string) {
  if (!src) return ''
  if (/\/hls\/[^/?]+\/cover\.bnc/i.test(src)) {
    return src.replace(/cover\.bnc/i, 'cover.jpg')
  }
  if (/\.(bnc|ceb)(\?|$)/i.test(src) || /(?:^|\/)(?:bnc|ceb)(\?|$)/i.test(src)) {
    return `/backend/media/preview?u=${encodeURIComponent(src)}`
  }
  return src
}
