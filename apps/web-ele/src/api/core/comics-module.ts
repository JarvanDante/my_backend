import { requestClient } from "#/api/request";

/**
 * 漫画首页模块(对接 my_service /backend/comics-modules*)。
 *
 * style: 1=1大2小横图 2=2小横图 3=1大横图 4=2竖图 5=竖图横滑 6=横图横滑 7=竖图3X3
 * icon: 1最新 2星星 3火
 * 检索条件暂按 tag_ids。
 */
export namespace ComicsModuleApi {
  export interface Item {
    id: number;
    name: string;
    position: string;
    style: number;
    icon: number;
    tag_ids: number[];
    tag_names: string[];
    size: number;
    rank: number;
    status: number;
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
    position?: string;
    style?: number;
    icon?: number;
    tag_ids?: number[];
    size?: number;
    rank?: number;
    status?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getComicsModuleListApi(params: ComicsModuleApi.ListParams) {
  return requestClient.get<ComicsModuleApi.Page<ComicsModuleApi.Item>>(
    "/comics-modules",
    { params },
  );
}
export function createComicsModuleApi(body: ComicsModuleApi.SaveBody) {
  return requestClient.post<{ id: number }>("/comics-modules", body);
}
export function updateComicsModuleApi(
  id: number,
  body: ComicsModuleApi.SaveBody,
) {
  return requestClient.put(`/comics-modules/${id}`, { ...body, id });
}
export function deleteComicsModuleApi(id: number) {
  return requestClient.delete(`/comics-modules/${id}`);
}
