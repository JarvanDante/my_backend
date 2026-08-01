import { requestClient } from "#/api/request";

export namespace WithdrawApi {
  /** 提现网关枚举 */
  export enum WithdrawGateway {
    ONLINE = 1, // 在线支付
    BANK = 2, // 银行
  }

  /** 提现状态枚举 */
  export enum WithdrawStatus {
    DISABLED = 0, // 禁用
    ENABLED = 1, // 启用
  }

  /** 提现项 */
  export interface WithdrawItem {
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

  /** 获取提现列表请求参数 */
  export interface GetWithdrawListParams {
    gateway?: number;
    status?: number;
    name?: string;
    page?: number;
    size?: number;
  }

  /** 获取提现列表响应 */
  export interface GetWithdrawListResponse {
    list: WithdrawItem[];
    total: number;
  }

  /** 创建提现请求参数 */
  export interface CreateWithdrawParams {
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

  /** 更新提现请求参数 */
  export interface UpdateWithdrawParams {
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

  /** 删除提现请求参数 */
  export interface DeleteWithdrawParams {
    id: number;
  }
}

/**
 * 获取提现列表
 */
export async function getWithdrawListApi(
  params?: WithdrawApi.GetWithdrawListParams,
): Promise<WithdrawApi.GetWithdrawListResponse> {
  return requestClient.get("/withdraw/list", { params });
}

/**
 * 获取提现详情
 */
export async function getWithdrawDetailApi(id: number) {
  return requestClient.get(`/withdraw/detail`, { params: { id } });
}

/**
 * 创建提现
 */
export async function createWithdrawApi(
  data: WithdrawApi.CreateWithdrawParams,
) {
  return requestClient.post("/withdraw/create", data);
}

/**
 * 更新提现
 */
export async function updateWithdrawApi(
  data: WithdrawApi.UpdateWithdrawParams,
) {
  return requestClient.post("/manage/withdraw/update", data);
}

/**
 * 删除提现
 */
export async function deleteWithdrawApi(
  data: WithdrawApi.DeleteWithdrawParams,
) {
  return requestClient.post("/withdraw/delete", data);
}
