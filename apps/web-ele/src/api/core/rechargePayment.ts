import { requestClient } from "#/api/request";

export namespace RechargePaymentApi {
  // 充值记录项
  export interface RechargePaymentItem {
    id: number;
    user_id: number;
    username: string;
    gateway: number;
    gateway_name: string;
    payment_id: number;
    payment_name: string;
    account_id: number;
    account_name: string;
    trade_no: string;
    money: number;
    fee: number;
    status: number;
    status_name: string;
    domain: string;
    created_at: string;
    updated_at: string;
  }

  // 充值记录列表请求参数
  export interface RechargePaymentParams {
    username?: string;
    gateway?: number;
    payment_id?: number;
    account_id?: number;
    status?: number;
    trade_no?: string;
    domain?: string;
    start_time?: string;
    end_time?: string;
    page: number;
    size: number;
  }

  // 充值记录列表响应
  export interface RechargePaymentResponse {
    list: RechargePaymentItem[];
    count: number;
  }

  // 确认支付订单参数
  export interface ConfirmPaymentParams {
    id: number;
    remark: string;
  }
}

/**
 * 获取在线支付充值记录列表
 */
export async function getRechargePaymentsApi(
  params: RechargePaymentApi.RechargePaymentParams
): Promise<RechargePaymentApi.RechargePaymentResponse> {
  return requestClient.get("/balance/recharge-payment", { params });
}

/**
 * 确认支付订单
 */
export async function confirmPaymentOrderApi(
  params: RechargePaymentApi.ConfirmPaymentParams
): Promise<void> {
  return requestClient.post("/balance/confirm-payment-order", params);
}
