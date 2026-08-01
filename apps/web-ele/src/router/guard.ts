import type { Router } from "vue-router";

import { LOGIN_PATH } from "@vben/constants";
import { preferences } from "@vben/preferences";
import { useAccessStore, useUserStore } from "@vben/stores";
import { startProgress, stopProgress } from "@vben/utils";

import { accessRoutes, coreRouteNames } from "#/router/routes";
import { useAuthStore } from "#/store";

import { generateAccess } from "./access";

/**
 * 静态翻译映射
 */
const menuTranslations: Record<string, Record<string, string>> = {
  "zh-CN": {
    dashboard: "仪表盘",
    analytics: "分析页",
    workspace: "工作台",
    sysSetting: "系统",
    system: "系统",
    basicSetting: "全局设置",
    sysBasicSet: "基本信息",
    sysWaterSet: "流水设置",
    sysAdmins: "员工账号",
    admin: "员工管理",
    role: "角色管理",
    adminLog: "后台日志",
    userManage: "会员",
    user: "会员列表",
    userGrade: "会员等级",
    userLog: "会员日志",
    balanceManage: "财务",
    balanceChange: "账变记录",
    depositHistory: "充值记录",
    depositHistoryOnline: "在线充值",
    depositHistorySystem: "后台充值",
    withdrawalHistory: "提现记录",
    withdrawalHistoryOnline: "在线提现",
    withdrawalHistorySystem: "后台提现",
    balanceOperate: "加扣款",
    apiSetting: "接口设置",
    apiSettingPayment: "充值渠道",
    apiSettingWithdraw: "提现渠道",
    gameManage: "游戏",
    gameClass: "游戏种类",
    game: "游戏列表",
    gameRecord: "游戏记录",
    operations: "运营",
    ads: "广告管理",
    notices: "公告管理",
    messages: "消息管理",
    activities: "活动管理",
  },
  "en-US": {
    dashboard: "Dashboard",
    analytics: "Analytics",
    workspace: "Workspace",
    sysSetting: "System",
    system: "System",
    basicSetting: "Global Settings",
    sysBasicSet: "Basic Information",
    sysWaterSet: "Water Settings",
    sysAdmins: "Staff Account",
    admin: "Staff Management",
    role: "Role Management",
    adminLog: "Admin Log",
    userManage: "User",
    user: "User List",
    userGrade: "User Grade",
    userLog: "User Log",
    balanceManage: "Finance",
    balanceChange: "Balance Change",
    depositHistory: "Deposit History",
    depositHistoryOnline: "Online Deposit",
    depositHistorySystem: "System Deposit",
    withdrawalHistory: "Withdrawal History",
    withdrawalHistoryOnline: "Online Withdrawal",
    withdrawalHistorySystem: "System Withdrawal",
    balanceOperate: "Balance Operation",
    apiSetting: "API Settings",
    apiSettingPayment: "Payment Channel",
    apiSettingWithdraw: "Withdrawal Channel",
    gameManage: "Game",
    gameClass: "Game Category",
    game: "Game List",
    gameRecord: "Game Record",
    operations: "Operations",
    ads: "Ads Management",
    notices: "Notices Management",
    messages: "Messages Management",
    activities: "Activities Management",
  },
};

function resolveHomePath(path?: string) {
  if (!path) {
    return preferences.app.defaultHomePath;
  }
  if (path === "/workspace" || path === "/dashboard/workspace") {
    return preferences.app.defaultHomePath;
  }
  return path;
}

/**
 * 翻译菜单标题 - 使用静态映射（直接修改原对象）
 * @param menus 菜单数组
 * @param locale 当前语言
 */
function translateMenuTitles(menus: any[], locale: string = "zh-CN"): void {
  const translations = menuTranslations[locale] || menuTranslations["zh-CN"];

  menus.forEach((menu) => {
    if (menu.meta?.menuKey) {
      const translated = translations[menu.meta.menuKey];
      if (translated) {
        // 同时更新 name 和 meta.title
        menu.name = translated;
        if (menu.meta) {
          menu.meta.title = translated;
        }
      }
    }

    // 递归处理子菜单
    if (menu.children && menu.children.length > 0) {
      translateMenuTitles(menu.children, locale);
    }
  });
}

/**
 * 通用守卫配置
 * @param router
 */
function setupCommonGuard(router: Router) {
  // 记录已经加载的页面
  const loadedPaths = new Set<string>();

  router.beforeEach((to) => {
    to.meta.loaded = loadedPaths.has(to.path);

    // 页面加载进度条
    if (!to.meta.loaded && preferences.transition.progress) {
      startProgress();
    }
    return true;
  });

  router.afterEach((to) => {
    // 记录页面是否加载,如果已经加载，后续的页面切换动画等效果不在重复执行

    loadedPaths.add(to.path);

    // 关闭页面加载进度条
    if (preferences.transition.progress) {
      stopProgress();
    }
  });
}

/**
 * 权限访问守卫配置
 * @param router
 */
function setupAccessGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    const accessStore = useAccessStore();
    const userStore = useUserStore();
    const authStore = useAuthStore();

    // 基本路由，这些路由不需要进入权限拦截
    if (coreRouteNames.includes(to.name as string)) {
      if (to.path === LOGIN_PATH && accessStore.accessToken) {
        return decodeURIComponent(
          (to.query?.redirect as string) ||
            resolveHomePath(userStore.userInfo?.homePath) ||
            preferences.app.defaultHomePath
        );
      }
      return true;
    }

    // accessToken 检查
    if (!accessStore.accessToken) {
      // 明确声明忽略权限访问权限，则可以访问
      if (to.meta.ignoreAccess) {
        return true;
      }

      // 没有访问权限，跳转登录页面
      if (to.fullPath !== LOGIN_PATH) {
        return {
          path: LOGIN_PATH,
          // 如不需要，直接删除 query
          query:
            to.fullPath === preferences.app.defaultHomePath
              ? {}
              : { redirect: encodeURIComponent(to.fullPath) },
          // 携带当前跳转的页面，登录后重新跳转该页面
          replace: true,
        };
      }
      return to;
    }

    // 是否已经生成过动态路由
    if (accessStore.isAccessChecked) {
      return true;
    }

    // 生成路由表
    // 当前登录用户拥有的角色标识列表
    const userInfo = userStore.userInfo || (await authStore.fetchUserInfo());
    const userRoles = userInfo.roles ?? [];

    // 生成菜单和路由
    const { accessibleMenus, accessibleRoutes } = await generateAccess({
      roles: userRoles,
      router,
      // 则会在菜单中显示，但是访问会被重定向到403
      routes: accessRoutes,
    });

    // 从路径中提取 menuKey 并添加到 meta 中
    function addMenuKeyToMeta(menus: any[]): any[] {
      return menus.map((menu) => {
        if (menu.path && !menu.meta?.menuKey) {
          // 从路径中提取最后一段作为 menuKey
          const pathParts = menu.path.split("/").filter(Boolean);
          const menuKey = pathParts[pathParts.length - 1];

          if (!menu.meta) {
            menu.meta = {};
          }
          menu.meta.menuKey = menuKey;
        }

        // 递归处理子菜单
        if (menu.children && menu.children.length > 0) {
          menu.children = addMenuKeyToMeta(menu.children);
        }

        return menu;
      });
    }

    // 添加 menuKey 到所有菜单
    const menusWithKeys = addMenuKeyToMeta(accessibleMenus);

    // 获取当前语言（从localStorage或默认值）
    let currentLocale = (localStorage.getItem("language") || "zh-CN") as
      | "zh-CN"
      | "en-US";

    // 确保语言值有效
    if (currentLocale !== "zh-CN" && currentLocale !== "en-US") {
      currentLocale = "zh-CN";
    }

    // 翻译菜单标题 - 使用静态映射（直接修改原对象）
    translateMenuTitles(menusWithKeys, currentLocale);

    // 同时更新路由的 meta.title，以便面包屑和标题也能正确翻译
    function updateRoutesMeta(routes: any[], locale: string): void {
      const translations =
        menuTranslations[locale] || menuTranslations["zh-CN"];

      routes.forEach((route) => {
        if (route.meta?.menuKey) {
          const translated = translations[route.meta.menuKey];
          if (translated && route.meta) {
            route.meta.title = translated;
          }
        }

        // 递归处理子路由
        if (route.children && route.children.length > 0) {
          updateRoutesMeta(route.children, locale);
        }
      });
    }

    // 更新路由的 meta
    updateRoutesMeta(accessibleRoutes, currentLocale);

    // 保存菜单信息和路由信息
    accessStore.setAccessMenus(menusWithKeys);
    accessStore.setAccessRoutes(accessibleRoutes);
    accessStore.setIsAccessChecked(true);
    const redirectPath = (from.query.redirect ??
      (to.path === preferences.app.defaultHomePath
        ? resolveHomePath(userInfo.homePath) || preferences.app.defaultHomePath
        : to.fullPath)) as string;

    return {
      ...router.resolve(decodeURIComponent(redirectPath)),
      replace: true,
    };
  });
}

/**
 * 项目守卫配置
 * @param router
 */
function createRouterGuard(router: Router) {
  /** 通用 */
  setupCommonGuard(router);
  /** 权限访问 */
  setupAccessGuard(router);
}

export { createRouterGuard };
