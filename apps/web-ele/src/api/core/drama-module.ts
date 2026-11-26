import { requestClient } from "#/api/request";

/** 短剧分类模块，对接 /backend/drama-modules。 */
export namespace DramaModuleApi {
  export interface Item {
    id: number;
    name: string;
    position: string;
    style: number;
    icon: number;
    category_ids: number[];
    category_names: string[];
    tag_ids: number[];
    tag_names: string[];
    filter: string;
    size: number;
    rank: number;
    status: number;
    created_at: string;
    updated_at: string;
  }
  export interface ListParams {
    name?: string;
    position?: string;
    category_id?: number;
    status?: string;
    page?: number;
    size?: number;
  }
  export interface SaveBody {
    name: string;
    position?: string;
    style?: number;
    icon?: number;
    category_ids?: number[];
    tag_ids?: number[];
    filter?: string;
    size?: number;
    rank?: number;
    status?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getDramaModuleListApi(params: DramaModuleApi.ListParams) {
  return requestClient.get<DramaModuleApi.Page<DramaModuleApi.Item>>(
    "/drama-modules",
    { params },
  );
}
export function createDramaModuleApi(body: DramaModuleApi.SaveBody) {
  return requestClient.post<{ id: number }>("/drama-modules", body);
}
export function updateDramaModuleApi(
  id: number,
  body: DramaModuleApi.SaveBody,
) {
  return requestClient.put(`/drama-modules/${id}`, { ...body, id });
}
export function deleteDramaModuleApi(id: number) {
  return requestClient.delete(`/drama-modules/${id}`);
}
