import { requestClient } from "#/api/request";

export namespace SiteWithdrawApi {
  /** 站点提现项 */
  export interface SiteWithdrawItem {
    id: number;
    site_code: string;
    withdraw_id: number;
    name: string;
    status: number;
    sort: number;
    created_at: string;
    updated_at: string;
  }

  /** 获取站点提现列表请求参数 */
  export interface GetSiteWithdrawListParams {
    site_code: string;
  }

  /** 获取站点提现列表响应 */
  export interface GetSiteWithdrawListResponse {
    list: SiteWithdrawItem[];
  }

  /** 更新站点提现状态请求参数 */
  export interface UpdateSiteWithdrawStatusParams {
    id: number;
    status: number;
  }

  /** 绑定站点提现请求参数 */
  export interface BindSiteWithdrawParams {
    site_code: string;
    withdraw_id: number;
  }

  /** 取消绑定站点提现请求参数 */
  export interface UnbindSiteWithdrawParams {
    id: number;
  }
}

/**
 * 获取站点提现列表
 */
export async function getSiteWithdrawListApi(
  params: SiteWithdrawApi.GetSiteWithdrawListParams,
): Promise<SiteWithdrawApi.GetSiteWithdrawListResponse> {
  return requestClient.get("/site_withdraw/list", { params });
}

/**
 * 更新站点提现状态
 */
export async function updateSiteWithdrawStatusApi(
  data: SiteWithdrawApi.UpdateSiteWithdrawStatusParams,
) {
  return requestClient.post("/site_withdraw/update_status", data);
}

/**
 * 绑定提现到站点
 */
export async function bindSiteWithdrawApi(
  data: SiteWithdrawApi.BindSiteWithdrawParams,
) {
  return requestClient.post("/site_withdraw/bind", data);
}

/**
 * 取消绑定提现
 */
export async function unbindSiteWithdrawApi(
  data: SiteWithdrawApi.UnbindSiteWithdrawParams,
) {
  return requestClient.post("/site_withdraw/unbind", data);
}
