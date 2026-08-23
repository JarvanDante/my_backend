import { requestClient } from "#/api/request";

/**
 * 排行/热搜管理(对接 my_service /backend/hotsearch* 与 /backend/rank/refresh)。
 *
 * 约定(整个后台统一):
 * - 列表筛选参数一律 **string**, 空串=不筛选。后端 controller 里是
 *   `if req.Status != "" { atoi }` + `if f.Status >= 0 { where }`,
 *   所以 status="0" 是"只看禁用", 传 number 0 会被当成"没传"以外的语义混淆。
 * - requestClient 已把 {code,message,data} 解包成 data, 泛型写的是 data 的形状。
 */
export namespace RanksApi {
  export interface HotItem {
    id: number;
    keyword: string;
    /** 投放分类: 空=通用, comic/cartoon/novel/short/video */
    category: string;
    /** 人工权重: 运营手动设的排序分, 排序第一优先级 */
    heat: number;
    /** 用户真实搜索累计次数, 由前台搜索接口自增, 后台只读 */
    search_count: number;
    status: number;
    updated_at: string;
  }
  export interface HotListParams {
    status?: string;
    category?: string;
    keyword?: string;
    page?: number;
    size?: number;
  }
  export interface HotSaveBody {
    keyword: string;
    category?: string;
    heat?: number;
    status?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getHotSearchListApi(params: RanksApi.HotListParams) {
  return requestClient.get<RanksApi.Page<RanksApi.HotItem>>("/hotsearch", {
    params,
  });
}
export function createHotSearchApi(body: RanksApi.HotSaveBody) {
  return requestClient.post<{ id: number }>("/hotsearch", body);
}
export function updateHotSearchApi(id: number, body: RanksApi.HotSaveBody) {
  return requestClient.put(`/hotsearch/${id}`, { ...body, id });
}
export function deleteHotSearchApi(id: number) {
  return requestClient.delete(`/hotsearch/${id}`);
}

/**
 * 刷新排行缓存: 后端排行榜(rank:1:{mediaType}:{period})在 Redis 里缓存 60s,
 * 运营改完数据不想等这 60s 自然过期时, 调它把 key 全删掉, 下次请求重算。
 * 无入参、无返回体。
 */
export function refreshRankCacheApi() {
  return requestClient.post("/rank/refresh", {});
}
