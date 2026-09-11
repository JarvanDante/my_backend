import { requestClient } from "#/api/request";

/**
 * 漫画分类模块(对接 my_service /backend/comics-modules*)。
 *
 * style: 1=1大2小横图 2=2小横图 3=1大横图 4=2竖图 5=竖图横滑 6=横图横滑 7=竖图3X3 8=竖图3X2
 * icon: 1最新 2星星 3火
 * 检索条件为 JSON（tag_id/cat_id/order 等），底层查 Postgres comics 表。
 * 位置：cat_{id}=H5 分类 Tab，按分类权重排。
 */
export namespace ComicsModuleApi {
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
