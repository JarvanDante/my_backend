import { requestClient } from "#/api/request";

/**
 * 小说分类(对接 my_service /backend/novel-categories*)。
 *
 * kind: 0 普通分类(给作品打标, 同步出现在 H5 顶栏)
 *       1 新更 / 2 推荐 / 3 榜单 —— 只占 H5 栏位, 不作为作品分类。
 * status 传 string, 空串=全部。
 */
export namespace NovelCategoryApi {
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

export function getNovelCategoryListApi(params: NovelCategoryApi.ListParams) {
  return requestClient.get<NovelCategoryApi.Page<NovelCategoryApi.Item>>(
    "/novel-categories",
    { params },
  );
}
export function createNovelCategoryApi(body: NovelCategoryApi.SaveBody) {
  return requestClient.post<{ id: number }>("/novel-categories", body);
}
export function updateNovelCategoryApi(
  id: number,
  body: NovelCategoryApi.SaveBody,
) {
  return requestClient.put(`/novel-categories/${id}`, { ...body, id });
}
export function deleteNovelCategoryApi(id: number) {
  return requestClient.delete(`/novel-categories/${id}`);
}
