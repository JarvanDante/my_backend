import { requestClient } from "#/api/request";

/**
 * 抽奖管理(对接 my_service /backend/lottery/*)。
 *
 * 约定:
 * - 列表筛选参数一律 **string**, 空串=全部(后端 atoiOr(s, def) 显式按空串判断);
 * - 活动列表 / 奖品列表后端**不分页**(ActivityListRes、PrizeListRes 只有 list, 没有 total);
 * - requestClient 已解包 {code,message,data}, 泛型写的是 data 的形状。
 */
export namespace LotteryApi {
  /** 活动。lottery_type 1会员日 2福利; pay_type 1免费次数 2金币 */
  export interface Activity {
    id: number;
    name: string;
    lottery_type: number;
    pay_type: number;
    cost_gold: number;
    daily_free: number;
    /** 0 = 每日不限次 */
    daily_limit: number;
    notice: string;
    status: number;
    created_at: string;
  }
  /**
   * 奖品。odds 是**整数权重**不是百分比 —— 后端按
   * odds / sum(该活动所有启用奖品 odds) 折算真实中奖率, 所以单个奖品的 odds
   * 改动会连带影响同活动其它奖品的概率。stock=-1 表示不限量。
   */
  export interface Prize {
    id: number;
    activity_id: number;
    name: string;
    cover: string;
    desc: string;
    /** 1金币 2VIP天数 3优惠券 4实物 5谢谢参与 */
    type: number;
    amount: number;
    coupon_tpl_id: number;
    odds: number;
    stock: number;
    /** 已发放数量, 后台只读 */
    awarded: number;
    rank: number;
    status: number;
    created_at: string;
  }
  /** 中奖记录。status 1已发放 2待发货 3已发货 */
  export interface History {
    id: number;
    user_id: number;
    nickname: string;
    activity_id: number;
    lottery_type: number;
    pay_type: number;
    cost_gold: number;
    prize_id: number;
    prize_name: string;
    prize_type: number;
    /** 后端已经把 prize_type 翻好了中文, 直接展示即可 */
    prize_text: string;
    prize_amount: number;
    status: number;
    remark: string;
    created_at: string;
  }
  /** 收货单。delivery_status 0待填写 1待发货 2已发货 */
  export interface Addr {
    id: number;
    history_id: number;
    user_id: number;
    nickname: string;
    prize_name: string;
    receiver: string;
    phone: string;
    address: string;
    delivery_status: number;
    express_no: string;
    created_at: string;
  }

  export interface ActivityBody {
    name: string;
    /** 仅新增时后端接收(UpdateReq 里没有该字段, 玩法类型建好后不可改) */
    lottery_type?: number;
    pay_type?: number;
    cost_gold?: number;
    daily_free?: number;
    daily_limit?: number;
    notice?: string;
    status?: number;
  }
  export interface PrizeBody {
    activity_id?: number;
    name: string;
    cover?: string;
    desc?: string;
    type?: number;
    amount?: number;
    coupon_tpl_id?: number;
    odds?: number;
    stock?: number;
    rank?: number;
    status?: number;
  }
  export interface HistoryParams {
    user_id?: string;
    lottery_type?: string;
    prize_type?: string;
    status?: string;
    page?: number;
    size?: number;
  }
  export interface AddrParams {
    delivery_status?: string;
    user_id?: string;
    page?: number;
    size?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
  export interface List<T> {
    list: T[];
  }
}

/* ------------------------------ 活动 ------------------------------ */

export function getLotteryActivitiesApi(params: { status?: string }) {
  return requestClient.get<LotteryApi.List<LotteryApi.Activity>>(
    "/lottery/activities",
    { params },
  );
}
export function createLotteryActivityApi(body: LotteryApi.ActivityBody) {
  return requestClient.post<{ id: number }>("/lottery/activities", body);
}
export function updateLotteryActivityApi(
  id: number,
  body: LotteryApi.ActivityBody,
) {
  return requestClient.put(`/lottery/activities/${id}`, { ...body, id });
}
/** 删除活动会连带删掉它下面的所有奖品(后端 ActivityDelete 的注释里写明了) */
export function deleteLotteryActivityApi(id: number) {
  return requestClient.delete(`/lottery/activities/${id}`);
}

/* ------------------------------ 奖品 ------------------------------ */

export function getLotteryPrizesApi(params: { activity_id?: string }) {
  return requestClient.get<LotteryApi.List<LotteryApi.Prize>>(
    "/lottery/prizes",
    { params },
  );
}
export function createLotteryPrizeApi(body: LotteryApi.PrizeBody) {
  return requestClient.post<{ id: number }>("/lottery/prizes", body);
}
export function updateLotteryPrizeApi(id: number, body: LotteryApi.PrizeBody) {
  return requestClient.put(`/lottery/prizes/${id}`, { ...body, id });
}
export function deleteLotteryPrizeApi(id: number) {
  return requestClient.delete(`/lottery/prizes/${id}`);
}

/* --------------------------- 记录 / 收货 --------------------------- */

export function getLotteryHistoriesApi(params: LotteryApi.HistoryParams) {
  return requestClient.get<LotteryApi.Page<LotteryApi.History>>(
    "/lottery/histories",
    { params },
  );
}
export function getLotteryAddressesApi(params: LotteryApi.AddrParams) {
  return requestClient.get<LotteryApi.Page<LotteryApi.Addr>>(
    "/lottery/addresses",
    { params },
  );
}
/**
 * 标记发货。后端是条件更新 `WHERE delivery_status=1`, 影响行数为 0 直接报错:
 * 所以只有"待发货(1)"能发, 重复点第二次会返回"该收货单不是待发货状态"。
 * 同一事务里还会把对应中奖记录 2待发货 → 3已发货。
 */
export function shipLotteryAddressApi(id: number, expressNo: string) {
  return requestClient.post(`/lottery/addresses/${id}/ship`, {
    id,
    express_no: expressNo,
  });
}
