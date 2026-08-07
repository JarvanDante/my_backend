import { defineOverridesPreferences } from "@vben/preferences";

import { readCachedSiteBrand } from "#/utils/site-brand";

export const overridesPreferences = defineOverridesPreferences({
  app: {
    // 未登录/无缓存时为「后台」; 登录过则读缓存站点名
    name: readCachedSiteBrand(),
    authPageLayout: "panel-center",
    // 菜单由 GET /auth/menus 按角色下发(勿改 frontend; 若仍走静态菜单请清站点数据或看 main.ts 强制写回)
    accessMode: "backend",
  },
  theme: {
    builtinType: "violet",
    colorPrimary: "hsl(245 82% 67%)",
  },
  logo: {
    enable: true,
    source: "/logo.png",
  },
});
