import { requestClient } from "#/api/request";

export namespace RechargeManualApi {
  // 后台加款记录项
  export interface RechargeManualItem {
    id: number;
    user_id: number;
    username: string;
    trade_no: string;
    money: number;
    status: number;
    status_name: string;
    domain: string;
    remark: string;
    admin_id: number;
    admin_name: string;
    created_at: string;
  }

  // 后台加款记录列表请求参数
  export interface RechargeManualParams {
    username?: string;
    status?: number;
    start_time?: string;
    end_time?: string;
    page: number;
    size: number;
  }

  // 后台加款记录列表响应
  export interface RechargeManualResponse {
    list: RechargeManualItem[];
    count: number;
  }
}

/**
 * 获取后台加款记录列表
 */
export async function getRechargeManualApi(
  params: RechargeManualApi.RechargeManualParams
): Promise<RechargeManualApi.RechargeManualResponse> {
  return requestClient.get("/balance/recharge-manual", { params });
}
