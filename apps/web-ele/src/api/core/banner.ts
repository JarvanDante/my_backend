import { requestClient } from "#/api/request";

export namespace BannerApi {
  export interface Item {
    id: number;
    position: string;
    title: string;
    cover_url: string;
    link: string;
    rank: number;
    status: number;
    created_at: string;
  }
  export interface ListParams {
    position?: string;
    status?: string;
    keyword?: string;
    page?: number;
    size?: number;
  }
  export interface SaveBody {
    position: string;
    title?: string;
    cover_url?: string;
    link?: string;
    rank?: number;
    status?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getBannerListApi(params: BannerApi.ListParams) {
  return requestClient.get<BannerApi.Page<BannerApi.Item>>("/banner", { params });
}
export function createBannerApi(body: BannerApi.SaveBody) {
  return requestClient.post<{ id: number }>("/banner", body);
}
export function updateBannerApi(id: number, body: BannerApi.SaveBody) {
  return requestClient.put(`/banner/${id}`, { ...body, id });
}
export function deleteBannerApi(id: number) {
  return requestClient.delete(`/banner/${id}`);
}
