import { requestClient } from "#/api/request";

/**
 * 兑换码管理(对接 my_service /backend/redeemcode*)。
 *
 * ⚠️ 与 promo.ts 的 /codes 是**两套东西**: promo 是老的推广码(批量生成/作废),
 * 这里是新的 redeemcode 模块(单码多次兑换 + 发金币), 字段和路由都不一样, 不要互相复用。
 *
 * 约定:
 * - status 筛选传 **string**, 空串=全部(后端 statusOf("")=-1); 传 0 会被当成"只看禁用"。
 * - 记录页的 user_id 在 Go 契约里是 int64(`UserId int64`), 后端按 `> 0` 判断,
 *   所以这里必须传 number, 不填时传 undefined(不带该 query)。
 */
export namespace RedeemCodeApi {
  export interface Item {
    id: number;
    name: string;
    code: string;
    /** 卡类型, 当前后端只启用 1=金币 */
    card_type: number;
    /** 兑换可得金币数 */
    value: number;
    total_times: number;
    used_times: number;
    status: number;
    expired_at: string;
    created_at: string;
  }
  export interface ListParams {
    status?: string;
    /** 码 / 名称模糊搜索 */
    keyword?: string;
    page?: number;
    size?: number;
  }
  export interface CreateBody {
    name: string;
    /** 留空后端自动生成 12 位大写码(去掉了易混淆字符) */
    code?: string;
    value: number;
    total_times: number;
    /** 必填, 格式 2027-12-31 23:59:59, 且不能早于当前时间 */
    expired_at: string;
    status?: number;
  }
  /** 更新不含 code: 后端 UpdateInput 没有 code 字段, 码生成后不可改 */
  export interface UpdateBody {
    name?: string;
    value?: number;
    total_times?: number;
    expired_at?: string;
    status?: number;
  }
  export interface RecordItem {
    id: number;
    user_id: number;
    code_id: number;
    code: string;
    name: string;
    card_type: number;
    value: number;
    created_at: string;
  }
  export interface RecordParams {
    /** 契约 int64: 0/不传=全部 */
    user_id?: number;
    /** 精确匹配(后端会转大写), 非模糊 */
    code?: string;
    page?: number;
    size?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getRedeemCodeListApi(params: RedeemCodeApi.ListParams) {
  return requestClient.get<RedeemCodeApi.Page<RedeemCodeApi.Item>>(
    "/redeemcode",
    { params },
  );
}
/** 返回体带自动生成的 code, 建码后要回显给运营 */
export function createRedeemCodeApi(body: RedeemCodeApi.CreateBody) {
  return requestClient.post<{ code: string; id: number }>("/redeemcode", body);
}
/** 后端更新是"非空/大于0才覆盖", 所以 value/total_times 传 0 等于不改 */
export function updateRedeemCodeApi(id: number, body: RedeemCodeApi.UpdateBody) {
  return requestClient.put(`/redeemcode/${id}`, { ...body, id });
}
export function deleteRedeemCodeApi(id: number) {
  return requestClient.delete(`/redeemcode/${id}`);
}
export function getRedeemCodeRecordsApi(params: RedeemCodeApi.RecordParams) {
  return requestClient.get<RedeemCodeApi.Page<RedeemCodeApi.RecordItem>>(
    "/redeemcode/records",
    { params },
  );
}
