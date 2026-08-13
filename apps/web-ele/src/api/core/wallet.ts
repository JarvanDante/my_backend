import { requestClient } from "#/api/request";

/**
 * 金币钱包(对接 my_service /backend/wallet*)。
 *
 * 约定(整个后台统一):
 * - 列表筛选参数一律传 **string**，空串=不筛选。后端 LogsReq 的 user_id/direction/scene
 *   就是按 string 收的，传数字 0 会被当成"筛选 direction=0"，这是踩过的坑。
 * - requestClient 已把 {code,message,data} 解包成 data，所以泛型写的是 data 的形状。
 */
export namespace WalletApi {
  /** 一条余额流水。before/after 是后端在事务里写死的快照，前端不要自己算 */
  export interface LogItem {
    id: number;
    user_id: number;
    direction: number; // 1收入 2支出
    scene: string;
    amount: number;
    balance_before: number;
    balance_after: number;
    ref_id: string;
    remark: string;
    created_at: string;
  }
  export interface LogsParams {
    user_id?: string;
    direction?: string;
    scene?: string;
    page?: number;
    size?: number;
  }
  export interface AdjustBody {
    user_id: number;
    /** 正数=加币，负数=扣币；扣币受余额约束，后端条件更新不会把余额扣成负数 */
    amount: number;
    remark: string;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getWalletLogsApi(params: WalletApi.LogsParams) {
  return requestClient.get<WalletApi.Page<WalletApi.LogItem>>("/wallet/logs", {
    params,
  });
}

/** 人工调账，返回调账后的最新余额 */
export function adjustWalletApi(body: WalletApi.AdjustBody) {
  return requestClient.post<{ balance: number }>("/wallet/adjust", body);
}
