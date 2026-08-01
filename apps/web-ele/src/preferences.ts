import { defineOverridesPreferences } from "@vben/preferences";

// 动态品牌: 登录后后端返回 site_name, 存 localStorage 覆盖应用名(一套前端所有站点复用)
const getSiteName = () => {
  try {
    const siteName = localStorage.getItem("VBEN_SITE_NAME");
    if (siteName) return siteName;
  } catch {}
  return import.meta.env.VITE_APP_TITLE;
};

export const overridesPreferences = defineOverridesPreferences({
  app: {
    name: getSiteName(),
    authPageLayout: "panel-center",
    // 前端静态路由模式(方案A); 接口权限由后端 Casbin 兜底
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
