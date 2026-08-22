import { requestClient } from "#/api/request";

export namespace GroupApi {
  export interface Item {
    id: number;
    name: string;
    intro: string;
    avatar: string;
    link: string;
    platform: string;
    rank: number;
    status: number;
    created_at: string;
  }
  export interface ListParams {
    status?: string;
    keyword?: string;
    page?: number;
    size?: number;
  }
  export interface SaveBody {
    name: string;
    intro?: string;
    avatar?: string;
    link?: string;
    platform?: string;
    rank?: number;
    status?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getGroupListApi(params: GroupApi.ListParams) {
  return requestClient.get<GroupApi.Page<GroupApi.Item>>("/group", { params });
}
export function createGroupApi(body: GroupApi.SaveBody) {
  return requestClient.post<{ id: number }>("/group", body);
}
export function updateGroupApi(id: number, body: GroupApi.SaveBody) {
  return requestClient.put(`/group/${id}`, { ...body, id });
}
export function deleteGroupApi(id: number) {
  return requestClient.delete(`/group/${id}`);
}
