import { requestClient } from "#/api/request";

/** 后端下发的菜单节点(结构对齐 vben RouteRecordStringComponent) */
export interface BackendMenuItem {
  name: string;
  path: string;
  component?: string;
  redirect?: string;
  meta?: Record<string, any>;
  children?: BackendMenuItem[];
}

/**
 * 获取当前管理员的菜单树(动态菜单 method B)。
 * 后端返回 { code, data: { list: BackendMenuItem[] } };
 * requestClient 已解包到 data,故取 res.list。
 */
export async function getAllMenusApi(): Promise<BackendMenuItem[]> {
  const res = await requestClient.get<{ list: BackendMenuItem[] }>(
    "/auth/menus"
  );
  return res?.list ?? [];
}
