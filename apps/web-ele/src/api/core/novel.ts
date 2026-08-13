import { requestClient } from "#/api/request";

/**
 * 小说管理(对接 my_service /backend/novels*)。
 *
 * 约定(整个后台统一):
 * - 列表类筛选参数 status 等一律传 **string**，空串=不筛选；后端就是按 string 收的，
 *   传 0 会被当成"筛选 status=0"，这是踩过的坑。
 * - requestClient 已把 {code,message,data} 解包成 data，所以这里的泛型写的是 data 的形状。
 * - 后台路径用复数 /novels，与前台 /novel/... 拉开语义。
 */
export namespace NovelApi {
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
    /** 全书总字数, 由各章正文实时累计, 后台只读 */
    word_count: number;
    /** 1=有声书, 章节可挂音频 */
    is_audio: number;
    view_count: number;
    buy_count: number;
    like_count: number;
    update_status: number;
    rank: number;
    status: number;
    publish_id: number;
    created_at: string;
  }
  export interface Chapter {
    id: number;
    novel_id: number;
    seq: number;
    title: string;
    content: string;
    /** 后端按正文算出来的字数, 提交时不收, 传了也没用 */
    word_count: number;
    audio_url: string;
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
    is_audio?: number;
    update_status?: number;
    rank?: number;
    status?: number;
  }
  export interface ChapterBody {
    seq: number;
    title?: string;
    content?: string;
    audio_url?: string;
    status?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getNovelListApi(params: NovelApi.ListParams) {
  return requestClient.get<NovelApi.Page<NovelApi.Item>>("/novels", { params });
}
export function createNovelApi(body: NovelApi.SaveBody) {
  return requestClient.post<{ id: number }>("/novels", body);
}
export function updateNovelApi(id: number, body: NovelApi.SaveBody) {
  return requestClient.put(`/novels/${id}`, { ...body, id });
}
export function deleteNovelApi(id: number) {
  return requestClient.delete(`/novels/${id}`);
}
/** 上下架: status 0待上架 1上架 2下架 */
export function auditNovelApi(id: number, status: number) {
  return requestClient.post(`/novels/${id}/audit`, { id, status });
}

export function getNovelChaptersApi(
  novelId: number,
  params: { page?: number; size?: number },
) {
  return requestClient.get<NovelApi.Page<NovelApi.Chapter>>(
    `/novels/${novelId}/chapters`,
    { params },
  );
}
export function createNovelChapterApi(
  novelId: number,
  body: NovelApi.ChapterBody,
) {
  return requestClient.post<{ id: number }>(`/novels/${novelId}/chapters`, {
    ...body,
    id: novelId,
  });
}
export function updateNovelChapterApi(id: number, body: NovelApi.ChapterBody) {
  return requestClient.put(`/novel-chapters/${id}`, { ...body, id });
}
export function deleteNovelChapterApi(id: number) {
  return requestClient.delete(`/novel-chapters/${id}`);
}
