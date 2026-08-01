import { requestClient } from "#/api/request";

export namespace SitePaymentApi {
  /** 站点支付项 */
  export interface SitePaymentItem {
    id: number;
    site_code: string;
    payment_id: number;
    name: string;
    status: number;
    sort: number;
    created_at: string;
    updated_at: string;
  }

  /** 获取站点支付列表请求参数 */
  export interface GetSitePaymentListParams {
    site_code: string;
  }

  /** 获取站点支付列表响应 */
  export interface GetSitePaymentListResponse {
    list: SitePaymentItem[];
  }

  /** 更新站点支付状态请求参数 */
  export interface UpdateSitePaymentStatusParams {
    id: number;
    status: number;
  }

  /** 绑定站点支付请求参数 */
  export interface BindSitePaymentParams {
    site_code: string;
    payment_id: number;
  }

  /** 取消绑定站点支付请求参数 */
  export interface UnbindSitePaymentParams {
    id: number;
  }
}

/**
 * 获取站点支付列表
 */
export async function getSitePaymentListApi(
  params: SitePaymentApi.GetSitePaymentListParams,
): Promise<SitePaymentApi.GetSitePaymentListResponse> {
  return requestClient.get("/site_payment/list", { params });
}

/**
 * 更新站点支付状态
 */
export async function updateSitePaymentStatusApi(
  data: SitePaymentApi.UpdateSitePaymentStatusParams,
) {
  return requestClient.post("/site_payment/update_status", data);
}

/**
 * 绑定支付到站点
 */
export async function bindSitePaymentApi(
  data: SitePaymentApi.BindSitePaymentParams,
) {
  return requestClient.post("/site_payment/bind", data);
}

/**
 * 取消绑定支付
 */
export async function unbindSitePaymentApi(
  data: SitePaymentApi.UnbindSitePaymentParams,
) {
  return requestClient.post("/site_payment/unbind", data);
}
