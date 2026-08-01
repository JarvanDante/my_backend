import { requestClient } from "#/api/request";

export namespace WithdrawManualApi {
  // 后台提现记录项
  export interface WithdrawManualItem {
    id: number;
    user_id: number;
    username: string;
    trade_no: string;
    money: number;
    status: number;
    status_name: string;
    remark: string;
    admin_id: number;
    admin_name: string;
    created_at: string;
  }

  // 后台提现记录列表请求参数
  export interface WithdrawManualParams {
    username?: string;
    status?: number;
    start_time?: string;
    end_time?: string;
    page: number;
    size: number;
  }

  // 后台提现记录列表响应
  export interface WithdrawManualResponse {
    list: WithdrawManualItem[];
    count: number;
  }

  // 用户余额信息
  export interface UserBalanceInfo {
    user_id: number;
    username: string;
    balance: number;
    balance_frozen: number;
    points: number;
    last_update_time: string;
  }
}

/**
 * 获取后台提现记录列表
 */
export async function getWithdrawManualApi(
  params: WithdrawManualApi.WithdrawManualParams
): Promise<WithdrawManualApi.WithdrawManualResponse> {
  return requestClient.get("/balance/withdraw-manual", { params });
}

/**
 * 查询用户余额
 */
export async function queryUserBalanceApi(
  userId: number
): Promise<WithdrawManualApi.UserBalanceInfo> {
  const response = await requestClient.get<{
    data: {
      data: WithdrawManualApi.UserBalanceInfo;
    };
  }>("/balance/query-user-balance", { params: { user_id: userId } });
  return response.data.data;
}
