import { defineOverridesPreferences } from "@vben/preferences";

import { readCachedSiteBrand } from "#/utils/site-brand";

export const overridesPreferences = defineOverridesPreferences({
  app: {
    // 未登录/无缓存时为「后台」; 登录过则读缓存站点名
    name: readCachedSiteBrand(),
    authPageLayout: "panel-center",
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
