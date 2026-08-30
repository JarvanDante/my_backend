import { requestClient } from "#/api/request";

export namespace KingkongApi {
  export interface Item {
    id: number;
    name: string;
    icon_url: string;
    open_mode: string;
    open_mode_name: string;
    link: string;
    app_link: string;
    link_label: string;
    position: string;
    position_name: string;
    sort: number;
    status: number;
    status_text: string;
    created_at: string;
    updated_at: string;
  }
  export interface ListParams {
    name?: string;
    position?: string;
    status?: string;
    page?: number;
    size?: number;
  }
  export interface SaveBody {
    name: string;
    icon_url: string;
    open_mode: string;
    link?: string;
    app_link?: string;
    position: string;
    sort?: number;
    status?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getKingkongListApi(params: KingkongApi.ListParams) {
  return requestClient.get<KingkongApi.Page<KingkongApi.Item>>(
    "/kingkong-items",
    { params },
  );
}
export function createKingkongApi(body: KingkongApi.SaveBody) {
  return requestClient.post<{ id: number }>("/kingkong-items", body);
}
export function updateKingkongApi(id: number, body: KingkongApi.SaveBody) {
  return requestClient.put(`/kingkong-items/${id}`, { ...body, id });
}
export function deleteKingkongApi(id: number) {
  return requestClient.delete(`/kingkong-items/${id}`);
}
