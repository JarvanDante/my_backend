import { requestClient } from "#/api/request";

export namespace RoleApi {
  export interface RoleItem {
    id: number;
    name: string;
    permissions: string; // 权限节点ID，逗号分隔
    status: number;
    created_at: string;
  }

  export interface RoleListParams {
    page: number;
    size: number;
    name?: string;
    status?: string;
  }

  export interface RoleListResponse {
    list: RoleItem[];
    total?: number;
    count?: number;
    page?: number;
    size?: number;
  }

  export interface CreateRoleParams {
    name: string;
    permissions: string;
    status: number;
  }

  export interface UpdateRoleParams {
    id: number;
    name: string;
    permissions: string;
    status: number;
  }

  export interface DeleteRoleParams {
    id: number;
  }
}

export async function getRolesApi(
  params: RoleApi.RoleListParams
): Promise<RoleApi.RoleListResponse> {
  return requestClient.get("/role/list", { params });
}

export async function createRoleApi(data: RoleApi.CreateRoleParams): Promise<{ message: string }> {
  return requestClient.post("/role/create", data);
}

export async function updateRoleApi(data: RoleApi.UpdateRoleParams): Promise<{ message: string }> {
  return requestClient.post("/role/update", data);
}

export async function deleteRoleApi(data: RoleApi.DeleteRoleParams): Promise<{ message: string }> {
  return requestClient.post("/role/delete", data);
}
