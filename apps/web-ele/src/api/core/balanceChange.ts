import { requestClient } from "#/api/request";

export namespace BalanceChangeApi {
  // 账变记录项
  export interface BalanceChangeItem {
    trade_no: string;
    username: string;
    realname: string;
    change_type: number;
    trade_type: number;
    balance_old: number;
    money: number;
    balance_new: number;
    remark: string;
    time: string;
  }

  // 账变记录列表请求参数
  export interface BalanceChangeParams {
    username?: string;
    change_type?: number;
    trade_type?: number;
    start_time?: string;
    end_time?: string;
    page: number;
    size: number;
  }

  // 账变记录列表响应
  export interface BalanceChangeResponse {
    list: BalanceChangeItem[];
    count: number;
  }

  // 交易类型选项
  export interface ChangeOption {
    [key: number]: string;
  }
}

/**
 * 获取账变记录列表
 */
export async function getBalanceChangesApi(
  params: BalanceChangeApi.BalanceChangeParams
): Promise<BalanceChangeApi.BalanceChangeResponse> {
  return requestClient.get("/balance/balance-changes", { params });
}

/**
 * 获取交易类型选项列表
 */
export async function getChangeOptionsApi(): Promise<Record<number, string>> {
  return requestClient.get("/balance/options-change");
}
