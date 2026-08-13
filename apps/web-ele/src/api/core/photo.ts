import { requestClient } from "#/api/request";

/**
 * 图集管理(对接 my_service /backend/photos*)。
 *
 * 与漫画/小说的差别: 图集没有章节层级, 图片(pics)直接挂在图集上, 因此
 * 列表接口会把全部图片一次性返回(后台要能逐张核对, 不做截断)。
 *
 * 约定: 筛选参数 status 传 string, 空串=不筛选。
 */
export namespace PhotoApi {
  export interface Pic {
    url: string;
    width: number;
    height: number;
  }
  export interface Item {
    id: number;
    title: string;
    cover: string;
    intro: string;
    category: string;
    tags: string[];
    is_vip: number;
    price: number;
    /** 未购买用户可试看的前 N 张, 超出部分打码/锁住 */
    free_count: number;
    pics: Pic[];
    pic_count: number;
    view_count: number;
    buy_count: number;
    like_count: number;
    rank: number;
    status: number;
    publish_id: number;
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
    cover?: string;
    intro?: string;
    category?: string;
    tags?: string[];
    is_vip?: number;
    price?: number;
    free_count?: number;
    /** 传了就整体覆盖旧图并刷新 pic_count, 所以编辑时必须回填完整列表 */
    pics?: Pic[];
    rank?: number;
    status?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getPhotoListApi(params: PhotoApi.ListParams) {
  return requestClient.get<PhotoApi.Page<PhotoApi.Item>>("/photos", { params });
}
export function createPhotoApi(body: PhotoApi.SaveBody) {
  return requestClient.post<{ id: number }>("/photos", body);
}
export function updatePhotoApi(id: number, body: PhotoApi.SaveBody) {
  return requestClient.put(`/photos/${id}`, { ...body, id });
}
export function deletePhotoApi(id: number) {
  return requestClient.delete(`/photos/${id}`);
}
/** 上下架: status 0待上架 1上架 2下架 */
export function auditPhotoApi(id: number, status: number) {
  return requestClient.post(`/photos/${id}/audit`, { id, status });
}
