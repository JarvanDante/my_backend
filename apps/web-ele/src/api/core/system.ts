import { requestClient } from "#/api/request";

export namespace SystemApi {
  export interface RoleItem {
    id: number;
    name: string;
    code: string;
    remark: string;
    status: number;
  }

  export interface PermItem {
    path: string;
    method: string;
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
}

// ---------- 角色 ----------
export async function getRoleListApi() {
  return requestClient.get<{ list: SystemApi.RoleItem[] }>("/roles");
}

export async function createRoleApi(p: { name: string; code: string; remark?: string }) {
  return requestClient.post<{ id: number }>("/roles", p);
}

export async function updateRoleApi(p: {
  id: number;
  name: string;
  remark?: string;
  status: number;
}) {
  return requestClient.put(`/roles/${p.id}`, p);
}

export async function deleteRoleApi(id: number) {
  return requestClient.delete(`/roles/${id}`);
}

// ---------- 角色权限 ----------
export async function getRolePermsApi(code: string) {
  return requestClient.get<{ list: SystemApi.PermItem[] }>(`/roles/${code}/perms`);
}

export async function addRolePermApi(code: string, path: string, method: string) {
  return requestClient.post(`/roles/${code}/perms`, { code, path, method });
}

export async function delRolePermApi(code: string, path: string, method: string) {
  return requestClient.delete(`/roles/${code}/perms`, {
    data: { code, path, method },
  });
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
