import { requestClient } from "#/api/request";

/**
 * 优惠券(对接 my_service /backend/coupons*)。
 *
 * 券的互斥字段(见 internal/modules/coupon/logic/coupon.go normalizeTpl):
 * - type=1 抵用券: 只用 face_value(必须 >0)，discount 无意义(后端会补成 100);
 * - type=2 折扣券: 只用 discount(1~99，85 表示 85 折)，可用 max_deduct 封顶抵扣额;
 *   两者都受 threshold(使用门槛) 约束。表单必须按 type 切换，避免运营两边都填。
 * - total=-1 表示不限量；后端发券用 `WHERE total=-1 OR issued<total` 条件递增防超发。
 * - 已发放过的模板后端禁止删除(会报"该券已发放给用户, 不能删除, 请改为停用")。
 *
 * Update 的坑: 后端是"零值不覆盖"的部分更新 —— face_value/discount/total/expire_day
 * 传 0 时会被跳过，保留库里的旧值(只有 threshold/max_deduct/per_limit/status 是无条件写)。
 * 所以类型切换时残留的旧 face_value/discount 清不掉，但对当前 type 来说是无效字段，
 * 抵扣计算只看当前 type 对应的那个，不影响结果。
 *
 * 约定: 筛选参数一律 string，空串=不筛选。
 */
export namespace CouponApi {
  export interface Item {
    id: number;
    name: string;
    type: number; // 1抵用券 2折扣券
    scene: number; // 1充值 2内容购买 3通用
    face_value: number;
    discount: number;
    threshold: number;
    max_deduct: number;
    total: number; // -1 不限量
    issued: number;
    per_limit: number;
    expire_day: number;
    status: number; // 0停用 1启用
    created_at: string;
  }
  export interface ListParams {
    status?: string;
    keyword?: string;
    page?: number;
    size?: number;
  }
  export interface SaveBody {
    name: string;
    type: number;
    scene: number;
    face_value?: number;
    discount?: number;
    threshold?: number;
    max_deduct?: number;
    total?: number;
    per_limit?: number;
    expire_day?: number;
    status?: number;
  }
  /** 定向发放结果: 逐个用户发，单个失败不影响其他人，失败原因逐条返回 */
  export interface GrantResult {
    success: number;
    failed: number;
    errors: string[];
  }
  export interface UserItem {
    id: number;
    user_id: number;
    tpl_id: number;
    name: string;
    type: number;
    face_value: number;
    discount: number;
    status: number; // 1未使用 2已使用 3已过期
    /** 后端已翻译好的状态中文，直接用 */
    status_text: string;
    ref_id: string;
    expire_at: string;
    used_at: string;
    created_at: string;
  }
  export interface UsersParams {
    tpl_id?: string;
    user_id?: string;
    status?: string;
    page?: number;
    size?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getCouponListApi(params: CouponApi.ListParams) {
  return requestClient.get<CouponApi.Page<CouponApi.Item>>("/coupons", {
    params,
  });
}
export function createCouponApi(body: CouponApi.SaveBody) {
  return requestClient.post<{ id: number }>("/coupons", body);
}
export function updateCouponApi(id: number, body: CouponApi.SaveBody) {
  return requestClient.put(`/coupons/${id}`, { ...body, id });
}
export function deleteCouponApi(id: number) {
  return requestClient.delete(`/coupons/${id}`);
}
/** 定向发放，user_ids 为数字数组 */
export function grantCouponApi(id: number, userIds: number[]) {
  return requestClient.post<CouponApi.GrantResult>(`/coupons/${id}/grant`, {
    id,
    user_ids: userIds,
  });
}
export function getUserCouponListApi(params: CouponApi.UsersParams) {
  return requestClient.get<CouponApi.Page<CouponApi.UserItem>>(
    "/coupons/users",
    { params },
  );
}
