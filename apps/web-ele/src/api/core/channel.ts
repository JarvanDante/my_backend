import { requestClient } from "#/api/request";

export namespace ChannelApi {
  export interface Item {
    id: number;
    code: string;
    name: string;
    remark: string;
    status: number;
    status_text: string;
    user_count: number;
    h5_link: string;
    clipboard_value: string;
    created_at: string;
  }
  export interface ListParams {
    status?: string;
    keyword?: string;
    page?: number;
    size?: number;
  }
  export interface SaveBody {
    code?: string;
    name: string;
    remark?: string;
    status?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getChannelListApi(params: ChannelApi.ListParams) {
  return requestClient.get<ChannelApi.Page<ChannelApi.Item>>("/channels", { params });
}
export function createChannelApi(body: ChannelApi.SaveBody) {
  return requestClient.post<{ id: number }>("/channels", body);
}
export function updateChannelApi(id: number, body: ChannelApi.SaveBody) {
  return requestClient.put(`/channels/${id}`, { ...body, id });
}
export function deleteChannelApi(id: number) {
  return requestClient.delete(`/channels/${id}`);
}
