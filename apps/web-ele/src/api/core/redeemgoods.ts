import { requestClient } from "#/api/request";

/**
 * 商品兑换(对接 my_service /backend/redeem-goods*)。
 *
 * 约定:
 * - status 筛选传 **string**, 空串=全部(后端 statusOf("")=-1)。
 * - 兑换记录的 user_id / goods_id 在 Go 契约里是 int64, 后端按 `> 0` 判断,
 *   所以传 number, 不筛选时传 undefined。
 * - stock = -1 表示不限量: 后端 Exchange 只在 stock > 0 时才做条件递减,
 *   -1 永远不会扣减库存, 只累加 exchanged。
 */
export namespace RedeemGoodsApi {
  export interface Item {
    id: number;
    name: string;
    cover: string;
    intro: string;
    /** 金币价, 后端是 float64 */
    cost_gold: number;
    /** -1 = 不限量; 0 = 已兑完 */
    stock: number;
    /** 已兑换数, 只读(由兑换流程累加) */
    exchanged: number;
    rank: number;
    status: number;
    created_at: string;
  }
  export interface ListParams {
    status?: string;
    /** 商品名模糊搜索 */
    keyword?: string;
    page?: number;
    size?: number;
  }
  export interface SaveBody {
    name: string;
    cover?: string;
    intro?: string;
    /** 必须 > 0, 后端 CostGold <= 0 直接拒 */
    cost_gold: number;
    /** -1=不限量 */
    stock?: number;
    rank?: number;
    status?: number;
  }
  export interface OrderItem {
    id: number;
    user_id: number;
    goods_id: number;
    goods_name: string;
    cost_gold: number;
    created_at: string;
  }
  export interface OrderParams {
    /** 契约 int64: 0/不传=全部 */
    user_id?: number;
    goods_id?: number;
    page?: number;
    size?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getRedeemGoodsListApi(params: RedeemGoodsApi.ListParams) {
  return requestClient.get<RedeemGoodsApi.Page<RedeemGoodsApi.Item>>(
    "/redeem-goods",
    { params },
  );
}
export function createRedeemGoodsApi(body: RedeemGoodsApi.SaveBody) {
  return requestClient.post<{ id: number }>("/redeem-goods", body);
}
/**
 * 后端 Update 里 stock / rank 是**无条件覆盖**的(不像 name/cover 那样非空才写),
 * 所以表单必须始终把当前 stock 一起提交, 否则会被写成 0(=已兑完)。
 */
export function updateRedeemGoodsApi(id: number, body: RedeemGoodsApi.SaveBody) {
  return requestClient.put(`/redeem-goods/${id}`, { ...body, id });
}
export function deleteRedeemGoodsApi(id: number) {
  return requestClient.delete(`/redeem-goods/${id}`);
}
export function getRedeemGoodsOrdersApi(params: RedeemGoodsApi.OrderParams) {
  return requestClient.get<RedeemGoodsApi.Page<RedeemGoodsApi.OrderItem>>(
    "/redeem-goods/orders",
    { params },
  );
}
