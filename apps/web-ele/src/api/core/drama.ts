import { requestClient } from "#/api/request";

/** 短剧管理，对接 my_service /backend/dramas*、剧集、分类与媒资选用接口。 */
export namespace DramaApi {
  export interface Item {
    id: number;
    title: string;
    cover: string;
    intro: string;
    category: string;
    categories?: string[];
    tags: string[];
    is_vip: number;
    price: number;
    free_episode: number;
    episode_count: number;
    view_count: number;
    buy_count: number;
    like_count: number;
    update_status: number;
    rank: number;
    is_recommend: number;
    status: number;
    media_code: string;
    published_at: string;
    created_at: string;
  }
  export interface Episode {
    id: number;
    drama_id: number;
    seq: number;
    title: string;
    media_code: string;
    duration: number;
    cover: string;
    pay_mode: number;
    price: number;
    status: number;
    media_ready: number;
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
    title?: string;
    cover?: string;
    intro?: string;
    category?: string;
    categories?: string[];
    tags?: string[];
    is_vip: number;
    price: number;
    free_episode: number;
    update_status?: number;
    rank: number;
    is_recommend: number;
    status: number;
    published_at?: string;
  }
  export interface EpisodeBody {
    pay_mode: number;
    price: number;
    status: number;
  }
  export interface SyncResult {
    created: number;
    updated: number;
    missing: number;
    total: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

/** 媒资中心可选用的短剧整部。 */
export namespace MediaDramaApi {
  export interface Item {
    id: string;
    title: string;
    cover_url: string;
    intro: string;
    chapter_count: number;
    episode_count: number;
    update_status: number;
    picked: boolean;
    local_id: number;
  }
  export interface Page {
    list: Item[];
    total: number;
    page: number;
    size: number;
  }
}

/** 短剧独立分类，字段同漫画分类。 */
export namespace DramaCategoryApi {
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
    kind: number;
    rank: number;
    status: number;
  }
}

export function getDramaListApi(params: DramaApi.ListParams) {
  return requestClient.get<DramaApi.Page<DramaApi.Item>>("/dramas", { params });
}
export function updateDramaApi(id: number, body: DramaApi.SaveBody) {
  return requestClient.put(`/dramas/${id}`, { ...body, id });
}
export function deleteDramaApi(id: number) {
  return requestClient.delete(`/dramas/${id}`);
}
/** 上下架：status 0 待上架 1 上架 2 下架。 */
export function auditDramaApi(id: number, status: number) {
  return requestClient.post(`/dramas/${id}/audit`, { id, status });
}

export function getDramaEpisodesApi(
  dramaId: number,
  params: { page?: number; size?: number },
) {
  return requestClient.get<DramaApi.Page<DramaApi.Episode>>(
    `/dramas/${dramaId}/episodes`,
    { params },
  );
}
/** 编辑单集：pay_mode 0 跟随整部 1 免费 2 金币 3 VIP。 */
export function updateDramaEpisodeApi(id: number, body: DramaApi.EpisodeBody) {
  return requestClient.put(`/drama-episodes/${id}`, { ...body, id });
}
export function syncDramaEpisodesApi(dramaId: number) {
  return requestClient.post<DramaApi.SyncResult>(
    `/dramas/${dramaId}/sync-episodes`,
    { id: dramaId },
  );
}

export function getMediaDramasListApi(params: {
  keyword?: string;
  page?: number;
  size?: number;
}) {
  return requestClient.get<MediaDramaApi.Page>("/media-dramas", { params });
}
/** 选用媒资整部入库为待上架，并首次同步剧集。 */
export function pickMediaDramaApi(id: string) {
  return requestClient.post<{ id: number }>(`/media-dramas/${id}/pick`, { id });
}

export function getDramaCategoryListApi(params: DramaCategoryApi.ListParams) {
  return requestClient.get<DramaApi.Page<DramaCategoryApi.Item>>(
    "/drama-categories",
    { params },
  );
}
export function createDramaCategoryApi(body: DramaCategoryApi.SaveBody) {
  return requestClient.post<{ id: number }>("/drama-categories", body);
}
export function updateDramaCategoryApi(
  id: number,
  body: DramaCategoryApi.SaveBody,
) {
  return requestClient.put(`/drama-categories/${id}`, { ...body, id });
}
export function deleteDramaCategoryApi(id: number) {
  return requestClient.delete(`/drama-categories/${id}`);
}
