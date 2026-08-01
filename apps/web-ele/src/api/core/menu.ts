import type { RouteRecordRaw } from "vue-router";

import { requestClient } from "#/api/request";

export namespace MenuApi {
  export interface MenuItem {
    id: number;
    type: number;
    name: string;
    path: string; // 对应protobuf中的path字段
    sort: number; // 对应protobuf中的sort字段
    children: MenuItem[] | null;
    // 兼容旧格式的字段（可选）
    backend_url?: string;
    frontend_url?: string;
    route_url?: string; // 新增字段，从日志中看到的
    open?: boolean;
    checked?: boolean;
    icon?: string;
  }

  export interface MenuResponse {
    data: MenuItem[];
  }

  export interface MenusResponse {
    menus: MenuItem[];
  }
}

/**
 * 从菜单路径中提取菜单键
 */
function extractMenuKey(path: string | undefined): string {
  if (!path) return "";
  const parts = path.split("/");
  return parts[parts.length - 1] || "";
}

/**
 * 将菜单项转换为路由记录
 */
function convertMenuToRoute(
  menu: MenuApi.MenuItem,
  isRoot: boolean = true
): RouteRecordRaw | null {
  // 只处理类型为 1 的菜单项（页面）
  if (menu.type !== 1) {
    return null;
  }

  // 规范化路径 - 优先使用path字段，兼容route_url和frontend_url
  let normalizedPath = menu.path || menu.route_url || menu.frontend_url || "";

  if (!normalizedPath) {
    return null;
  }

  if (isRoot) {
    // 根菜单：使用完整路径
    if (!normalizedPath.startsWith("/")) {
      normalizedPath = "/" + normalizedPath;
    }
  } else {
    // 子菜单：只使用路径的最后一段（相对路径）
    const pathParts = normalizedPath.split("/");
    normalizedPath = pathParts[pathParts.length - 1] || "";
  }

  // 提取菜单键用于国际化
  const menuKey = extractMenuKey(menu.path);

  const route: any = {
    path: normalizedPath,
    name: normalizedPath.replace(/\//g, "-").replace(/^-/, ""),
    meta: {
      icon: "lucide:" + (menu.icon || ""),
      title: menu.name,
      menuKey: menuKey, // 添加菜单键用于国际化
    },
  };

  // 如果有子菜单，递归转换
  if (menu.children && menu.children.length > 0) {
    const children = menu.children
      .map((child) => convertMenuToRoute(child, false))
      .filter((route): route is RouteRecordRaw => route !== null);

    if (children.length > 0) {
      route.children = children;
      // 如果有子菜单，设置第一个子菜单为重定向目标
      if (children[0]?.path) {
        route.redirect = children[0].path;
      }
      // 有子菜单时，不设置 component，让 generateAccessible 自动处理
      // route.component 会被 generateAccessible 中的代码删除
    } else {
      // 没有子菜单时，设置实际的页面组件
      route.component = menu.path || menu.route_url || menu.frontend_url;
    }
  } else {
    // 没有子菜单时，设置实际的页面组件
    route.component = menu.path || menu.route_url || menu.frontend_url;
  }

  return route;
}

/**
 * 获取用户所有菜单
 */
export async function getAllMenusApi() {
  try {
    const response = await requestClient.get<
      MenuApi.MenuItem[] | MenuApi.MenuResponse | MenuApi.MenusResponse
    >("/admin/menus");

    console.log("Raw menu API response:", response);
    console.log("Response type:", typeof response);
    console.log("Is array:", Array.isArray(response));

    // 处理不同的响应格式
    let menuDataApi: MenuApi.MenuItem[];

    if (Array.isArray(response)) {
      // 如果直接返回数组
      menuDataApi = response;
      console.log("Using response as array directly");
    } else if (response && typeof response === "object") {
      if ("data" in response) {
        // 如果返回的是包含 data 字段的对象
        menuDataApi = (response as MenuApi.MenuResponse).data;
        console.log("Using response.data as array");
      } else if ("menus" in response) {
        // 如果返回的是包含 menus 字段的对象
        menuDataApi = (response as MenuApi.MenusResponse).menus;
        console.log("Using response.menus as array");
      } else {
        console.warn("Unexpected menu response format:", response);
        return [];
      }
    } else {
      console.warn("Unexpected menu response format:", response);
      return [];
    }

    if (!menuDataApi || !Array.isArray(menuDataApi)) {
      console.error("menuDataApi is not an array:", menuDataApi);
      return [];
    }

    if (menuDataApi.length === 0) {
      console.log("Menu data is empty");
      return [];
    }

    console.log("Processing menu items:", menuDataApi.length);

    // 将菜单数据转换为路由格式
    const menuData = menuDataApi
      .map((menu) => convertMenuToRoute(menu, true))
      .filter((route): route is RouteRecordRaw => route !== null);
    console.log("Converted menu data:", menuData);
    return menuData;
  } catch (error) {
    console.error("Failed to fetch menus:", error);
    return [];
  }
}
