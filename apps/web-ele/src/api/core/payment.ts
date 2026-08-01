import { requestClient } from "#/api/request";

export namespace PaymentApi {
  /** 支付网关枚举 */
  export enum PaymentGateway {
    ONLINE = 1, // 在线支付
    BANK = 2, // 银行
  }

  /** 支付状态枚举 */
  export enum PaymentStatus {
    DISABLED = 0, // 禁用
    ENABLED = 1, // 启用
  }

  /** 支付项 */
  export interface PaymentItem {
    id: number;
    name: string;
    code: string;
    gateway: number;
    api_url: string;
    merchant_no: string;
    md5_key: string;
    each_min: number;
    each_max: number;
    sort: number;
    money_list: string;
    is_input: number;
    remark: string;
    logo: string;
    status: number;
    created_at: string;
    updated_at: string;
  }

  /** 获取支付列表请求参数 */
  export interface GetPaymentListParams {
    gateway?: number;
    status?: number;
    name?: string;
    page?: number;
    size?: number;
  }

  /** 获取支付列表响应 */
  export interface GetPaymentListResponse {
    list: PaymentItem[];
    total: number;
  }

  /** 创建支付请求参数 */
  export interface CreatePaymentParams {
    name: string;
    code: string;
    gateway: number;
    api_url?: string;
    merchant_no?: string;
    md5_key?: string;
    each_min?: number;
    each_max?: number;
    sort?: number;
    money_list?: string;
    is_input?: number;
    remark?: string;
    logo?: string;
    status?: number;
  }

  /** 更新支付请求参数 */
  export interface UpdatePaymentParams {
    id: number;
    name?: string;
    code?: string;
    gateway?: number;
    api_url?: string;
    merchant_no?: string;
    md5_key?: string;
    each_min?: number;
    each_max?: number;
    sort?: number;
    money_list?: string;
    is_input?: number;
    remark?: string;
    logo?: string;
    status?: number;
  }

  /** 删除支付请求参数 */
  export interface DeletePaymentParams {
    id: number;
  }
}

/**
 * 获取支付列表
 */
export async function getPaymentListApi(
  params?: PaymentApi.GetPaymentListParams,
): Promise<PaymentApi.GetPaymentListResponse> {
  return requestClient.get("/manage/payment/list", { params });
}

/**
 * 获取支付详情
 */
export async function getPaymentDetailApi(id: number) {
  return requestClient.get(`/manage/payment/detail`, { params: { id } });
}

/**
 * 创建支付
 */
export async function createPaymentApi(data: PaymentApi.CreatePaymentParams) {
  return requestClient.post("/manage/payment/create", data);
}

/**
 * 更新支付
 */
export async function updatePaymentApi(data: PaymentApi.UpdatePaymentParams) {
  return requestClient.post("/manage/payment/update", data);
}

/**
 * 删除支付
 */
export async function deletePaymentApi(data: PaymentApi.DeletePaymentParams) {
  return requestClient.post("/manage/payment/delete", data);
}
