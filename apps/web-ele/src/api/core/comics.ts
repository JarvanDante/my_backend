import { requestClient } from "#/api/request";

/**
 * 漫画管理(对接 my_service /backend/comics*)。
 *
 * 约定(整个后台统一):
 * - 列表类筛选参数 status 等一律传 **string**，空串=不筛选；后端就是按 string 收的，
 *   传 0 会被当成"筛选 status=0"，这是踩过的坑。
 * - requestClient 已把 {code,message,data} 解包成 data，所以这里的泛型写的是 data 的形状。
 */
export namespace ComicsApi {
  export interface Item {
    id: number;
    title: string;
    author: string;
    cover: string;
    intro: string;
    category: string;
    tags: string[];
    is_vip: number;
    price: number;
    free_chapter: number;
    chapter_count: number;
    view_count: number;
    buy_count: number;
    like_count: number;
    update_status: number;
    rank: number;
    status: number;
    publish_id: number;
    created_at: string;
  }
  export interface Pic {
    url: string;
    width: number;
    height: number;
  }
  export interface Chapter {
    id: number;
    comics_id: number;
    seq: number;
    title: string;
    pics: Pic[];
    pic_count: number;
    status: number;
    created_at: string;
  }
  export interface ListParams {
    status?: string;
    category?: string;
    keyword?: string;
    page?: number;
    size?: number;
  }
  export interface SaveBody {
    title: string;
    author?: string;
    cover?: string;
    intro?: string;
    category?: string;
    tags?: string[];
    is_vip?: number;
    price?: number;
    free_chapter?: number;
    update_status?: number;
    rank?: number;
    status?: number;
  }
  export interface ChapterBody {
    seq: number;
    title?: string;
    pics?: Pic[];
    status?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getComicsListApi(params: ComicsApi.ListParams) {
  return requestClient.get<ComicsApi.Page<ComicsApi.Item>>("/comics", { params });
}
export function createComicsApi(body: ComicsApi.SaveBody) {
  return requestClient.post<{ id: number }>("/comics", body);
}
export function updateComicsApi(id: number, body: ComicsApi.SaveBody) {
  return requestClient.put(`/comics/${id}`, { ...body, id });
}
export function deleteComicsApi(id: number) {
  return requestClient.delete(`/comics/${id}`);
}
/** 上下架: status 0待上架 1上架 2下架 */
export function auditComicsApi(id: number, status: number) {
  return requestClient.post(`/comics/${id}/audit`, { id, status });
}

export function getComicsChaptersApi(
  comicsId: number,
  params: { page?: number; size?: number },
) {
  return requestClient.get<ComicsApi.Page<ComicsApi.Chapter>>(
    `/comics/${comicsId}/chapters`,
    { params },
  );
}
export function createComicsChapterApi(
  comicsId: number,
  body: ComicsApi.ChapterBody,
) {
  return requestClient.post<{ id: number }>(`/comics/${comicsId}/chapters`, {
    ...body,
    id: comicsId,
  });
}
export function updateComicsChapterApi(id: number, body: ComicsApi.ChapterBody) {
  return requestClient.put(`/comics-chapters/${id}`, { ...body, id });
}
export function deleteComicsChapterApi(id: number) {
  return requestClient.delete(`/comics-chapters/${id}`);
}
