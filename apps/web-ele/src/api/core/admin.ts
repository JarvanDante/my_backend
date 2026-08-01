import { requestClient } from "#/api/request";

export namespace AdminApi {
  // 管理员列表项
  export interface AdminItem {
    id: number;
    username: string;
    nickname: string;
    role: string;
    last_login_ip: string;
    last_login_time: string;
    created_at: string;
    status: number; // 1: 启用, 0: 禁用
    switch_google2fa?: number;
  }

  // 管理员列表请求参数
  export interface AdminListParams {
    page: number;
    size: number;
    username?: string;
    status?: string;
  }

  // 管理员列表响应
  export interface AdminListResponse {
    list: AdminItem[];
    total?: number;
    count?: number;
    page?: number;
    size?: number;
  }

  // 角色选项
  export interface RoleOption {
    id: number;
    name: string;
    value?: number;
  }

  // 角色列表响应（可能是直接数组或包装对象）
  export type RoleListResponse = RoleOption[] | { roles: RoleOption[] };

  // 创建管理员请求参数
  export interface CreateAdminParams {
    username: string;
    password: string;
    nickname: string;
    role: number;
    status: number; // 1: 启用, 0: 禁用
    switch_google2fa?: number;
  }

  // 创建管理员响应
  export interface CreateAdminResponse {
    id: number;
    message: string;
  }

  // 更新管理员请求参数
  export interface UpdateAdminParams {
    id: number;
    username: string;
    nickname: string;
    role_id: number;
    status: number;
    password?: string; // 可选，如果不传则不修改密码
  }

  // 更新管理员响应
  export interface UpdateAdminResponse {
    success: boolean;
    message: string;
  }

  // 删除管理员请求参数
  export interface DeleteAdminParams {
    id: number;
  }

  // 删除管理员响应
  export interface DeleteAdminResponse {
    success: boolean;
    message: string;
  }

  export interface GenerateGoogle2FAParams {
    id: number;
  }
  export interface GenerateGoogle2FAResponse {
    id: number;
    secret: string;
    otpauth_url: string;
    qr_url: string;
    switch_google2fa: number;
  }
  export interface BindGoogle2FAParams {
    id: number;
    secret: string;
    code: string;
  }
}

/**
 * 获取管理员列表
 */
export async function getAdminsApi(
  params: AdminApi.AdminListParams
): Promise<AdminApi.AdminListResponse> {
  return requestClient.get("/admin/list", {
    params,
  });
}

/**
 * 获取所有角色选项
 */
export async function getRolesApi(): Promise<AdminApi.RoleListResponse> {
  return requestClient.get("/admin/role-options");
}

/**
 * 创建管理员
 */
export async function createAdminApi(
  data: AdminApi.CreateAdminParams
): Promise<AdminApi.CreateAdminResponse> {
  return requestClient.post("/admin/create", data);
}

/**
 * 更新管理员
 */
export async function updateAdminApi(
  data: AdminApi.UpdateAdminParams
): Promise<AdminApi.UpdateAdminResponse> {
  return requestClient.post("/admin/update", data);
}

/**
 * 删除管理员
 */
export async function deleteAdminApi(
  data: AdminApi.DeleteAdminParams
): Promise<AdminApi.DeleteAdminResponse> {
  return requestClient.post("/admin/delete", data);
}


export async function generateGoogle2FAApi(
  data: AdminApi.GenerateGoogle2FAParams
): Promise<AdminApi.GenerateGoogle2FAResponse> {
  return requestClient.post("/admin/generate-google2fa", data);
}

export async function bindGoogle2FAApi(
  data: AdminApi.BindGoogle2FAParams
): Promise<{ message: string }> {
  return requestClient.post("/admin/bind-google2fa", data);
}
