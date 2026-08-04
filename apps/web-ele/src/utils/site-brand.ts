import { ref } from "vue";

import { updatePreferences } from "@vben/preferences";

const DEFAULT_TITLE = "后台";
const STORAGE_KEY_NAME = "VBEN_SITE_NAME";
const STORAGE_KEY_CODE = "VBEN_SITE_CODE";

/** 侧栏主标题 / 英文简称（响应式，供 logo 插槽使用） */
export const siteBrandName = ref(defaultAppTitle());
export const siteBrandCode = ref("");

/** 登录前/退出后的默认标题 */
export function defaultAppTitle() {
  return import.meta.env.VITE_APP_TITLE || DEFAULT_TITLE;
}

/** 侧栏展示名: 站点名（兼容旧缓存「xxx·后台」） */
export function formatSiteBrand(siteName?: string | null) {
  let name = String(siteName || "").trim();
  if (!name) return defaultAppTitle();
  if (name.endsWith("·后台")) {
    name = name.slice(0, -3).trim();
  }
  return name || defaultAppTitle();
}

function formatSiteCode(siteCode?: string | null) {
  return String(siteCode || "")
    .trim()
    .toUpperCase();
}

function syncBrandState(name: string, code: string) {
  siteBrandName.value = name;
  siteBrandCode.value = code;
  updatePreferences({ app: { name } });
}

/** 写入缓存并立刻更新侧栏/标题 */
export function applySiteBrand(
  siteName?: string | null,
  siteCode?: string | null
) {
  const title = formatSiteBrand(siteName);
  const code = formatSiteCode(siteCode);
  try {
    if (siteName) {
      localStorage.setItem(STORAGE_KEY_NAME, String(siteName).trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_NAME);
    }
    if (code) {
      localStorage.setItem(STORAGE_KEY_CODE, code);
    } else {
      localStorage.removeItem(STORAGE_KEY_CODE);
    }
  } catch {
    // ignore
  }
  syncBrandState(title, code);
  return title;
}

export function clearSiteBrand() {
  try {
    localStorage.removeItem(STORAGE_KEY_NAME);
    localStorage.removeItem(STORAGE_KEY_CODE);
  } catch {
    // ignore
  }
  syncBrandState(defaultAppTitle(), "");
}

export function readCachedSiteBrand() {
  try {
    return formatSiteBrand(localStorage.getItem(STORAGE_KEY_NAME));
  } catch {
    return defaultAppTitle();
  }
}

/** 应用启动时从缓存恢复双行品牌 */
export function restoreSiteBrandFromCache() {
  let name = defaultAppTitle();
  let code = "";
  try {
    name = formatSiteBrand(localStorage.getItem(STORAGE_KEY_NAME));
    code = formatSiteCode(localStorage.getItem(STORAGE_KEY_CODE));
  } catch {
    // ignore
  }
  syncBrandState(name, code);
  return name;
}
