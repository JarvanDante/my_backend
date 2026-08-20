import { requestClient } from "#/api/request";

export namespace VideoApi {
  export interface Item {
    id: number;
    title: string;
    description: string;
    cover_url: string;
    cover_key: string;
    cover_media_id: number;
    source_url: string;
    source_key: string;
    source_media_id: number;
    media_code: string;
    category: string;
    categories: string[];
    tags: string[];
    duration: number;
    sort: number;
    status: number;
    created_by: number;
    created_at: string;
    updated_at: string;
  }

  export interface Page {
    list: Item[];
    total: number;
    page: number;
    size: number;
  }

  export type SavePayload = Partial<
    Pick<
      Item,
      | "title"
      | "description"
      | "cover_url"
      | "cover_key"
      | "cover_media_id"
      | "source_url"
      | "source_key"
      | "source_media_id"
      | "media_code"
      | "category"
      | "categories"
      | "tags"
      | "duration"
      | "sort"
      | "status"
    >
  > & { id?: number };
}

export function getVideoListApi(params: {
  keyword?: string;
  media_code?: string;
  status?: number;
  page?: number;
  size?: number;
}) {
  return requestClient.get<VideoApi.Page>("/videos", { params });
}

export namespace MediaAssetApi {
  export interface Item {
    id: string;
    title: string;
    cover_url: string;
    play_url: string;
    duration_sec: number;
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

export function getMediaAssetListApi(params: {
  keyword?: string;
  page?: number;
  size?: number;
}) {
  return requestClient.get<MediaAssetApi.Page>("/media-assets", { params });
}

export function pickMediaAssetApi(id: string) {
  return requestClient.post<{ id: number }>(`/media-assets/${id}/pick`);
}

export function syncMediaVideosApi() {
  return requestClient.post<{ created: number; updated: number; total: number }>(
    "/videos/sync-media",
  );
}

export function createVideoApi(p: VideoApi.SavePayload) {
  return requestClient.post<{ id: number }>("/videos", p);
}

export function updateVideoApi(p: VideoApi.SavePayload) {
  return requestClient.put(`/videos/${p.id}`, p);
}

export function deleteVideoApi(id: number) {
  return requestClient.delete(`/videos/${id}`);
}

export function setVideoStatusApi(id: number, status: number) {
  return requestClient.put(`/videos/${id}/status`, { status });
}
