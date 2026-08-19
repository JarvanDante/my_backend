import { requestClient } from "#/api/request";

/**
 * 漫画分类(对接 my_service /backend/comics-categories*)。
 *
 * kind: 0 普通分类(给作品打标, 同步出现在 H5 顶栏)
 *       1 新更 / 2 推荐 / 3 榜单 —— 只占 H5 栏位, 不作为作品分类。
 * status 传 string, 空串=全部。
 */
export namespace ComicsCategoryApi {
  export interface Item {
    id: number;
    name: string;
    kind: number;
    rank: number;
    status: number;
    created_at: string;
  }
  export interface ListParams {
    kind?: string;
    status?: string;
    page?: number;
    size?: number;
  }
  export interface SaveBody {
    name: string;
    kind?: number;
    rank?: number;
    status?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getComicsCategoryListApi(params: ComicsCategoryApi.ListParams) {
  return requestClient.get<ComicsCategoryApi.Page<ComicsCategoryApi.Item>>(
    "/comics-categories",
    { params },
  );
}
export function createComicsCategoryApi(body: ComicsCategoryApi.SaveBody) {
  return requestClient.post<{ id: number }>("/comics-categories", body);
}
export function updateComicsCategoryApi(
  id: number,
  body: ComicsCategoryApi.SaveBody,
) {
  return requestClient.put(`/comics-categories/${id}`, { ...body, id });
}
export function deleteComicsCategoryApi(id: number) {
  return requestClient.delete(`/comics-categories/${id}`);
}
