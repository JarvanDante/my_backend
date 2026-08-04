import { requestClient } from "#/api/request";

export namespace SystemApi {
  export interface RoleItem {
    id: number;
    name: string;
    code: string;
    remark: string;
    status: number;
    permissions: string; // 勾选的权限id列表, 逗号分隔
  }

  export interface AdminItem {
    id: number;
    username: string;
    nickname: string;
    role_id: number;
    role_name: string;
    status: number;
    last_login_at: string;
  }

  export interface AdminListData {
    list: AdminItem[];
    total: number;
    page: number;
    size: number;
  }

  /** 菜单+接口权限树节点(isMenu: 1=菜单 0=接口权限) */
  export interface PermNode {
    id: number;
    parentId: number;
    name: string;
    routeUrl: string;
    component: string;
    method: string;
    icon: string;
    isMenu: number;
    hideInMenu: number;
    affixTab: number;
    activePath: string;
    sort: number;
    status: number;
    children: PermNode[];
  }

  export interface PermInput {
    id?: number;
    parentId: number;
    name: string;
    routeUrl?: string;
    component?: string;
    method?: string;
    icon?: string;
    isMenu: number;
    hideInMenu?: number;
    affixTab?: number;
    activePath?: string;
    sort?: number;
    status?: number;
  }
}

// ---------- 角色 ----------
export async function getRoleListApi() {
  return requestClient.get<{ list: SystemApi.RoleItem[] }>("/roles");
}

export async function createRoleApi(p: {
  name: string;
  code: string;
  remark?: string;
  permissions?: string;
}) {
  return requestClient.post<{ id: number }>("/roles", p);
}

export async function updateRoleApi(p: {
  id: number;
  name: string;
  remark?: string;
  status: number;
  permissions?: string;
}) {
  return requestClient.put(`/roles/${p.id}`, p);
}

export async function deleteRoleApi(id: number) {
  return requestClient.delete(`/roles/${id}`);
}

// ---------- 菜单/接口权限树 ----------
export async function getPermTreeApi() {
  return requestClient.get<{ list: SystemApi.PermNode[] }>("/permissions");
}

export async function createPermApi(p: SystemApi.PermInput) {
  return requestClient.post<{ id: number }>("/permissions", p);
}

export async function updatePermApi(p: SystemApi.PermInput) {
  return requestClient.put(`/permissions/${p.id}`, p);
}

export async function deletePermApi(id: number) {
  return requestClient.delete(`/permissions/${id}`);
}

// ---------- 管理员 ----------
export async function getAdminListApi(page = 1, size = 20) {
  return requestClient.get<SystemApi.AdminListData>("/admins", {
    params: { page, size },
  });
}

export async function createAdminApi(p: {
  username: string;
  password: string;
  nickname?: string;
  role_id: number;
}) {
  return requestClient.post<{ id: number }>("/admins", p);
}

export async function updateAdminApi(p: {
  id: number;
  nickname?: string;
  role_id: number;
  status: number;
  password?: string;
}) {
  return requestClient.put(`/admins/${p.id}`, p);
}

export async function deleteAdminApi(id: number) {
  return requestClient.delete(`/admins/${id}`);
}
