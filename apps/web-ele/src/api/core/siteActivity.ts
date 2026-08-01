import { requestClient } from "#/api/request";

export namespace SiteActivityApi {
  /** 站点活动项 */
  export interface SiteActivityItem {
    id: number;
    site_code: string;
    activity_id: number;
    name: string;
    status: number;
    sort: number;
    created_at: string;
    updated_at: string;
  }

  /** 获取站点活动列表请求参数 */
  export interface GetSiteActivityListParams {
    site_code: string;
  }

  /** 获取站点活动列表响应 */
  export interface GetSiteActivityListResponse {
    list: SiteActivityItem[];
  }

  /** 更新站点活动状态请求参数 */
  export interface UpdateSiteActivityStatusParams {
    id: number;
    status: number;
  }

  /** 绑定站点活动请求参数 */
  export interface BindSiteActivityParams {
    site_code: string;
    activity_id: number;
  }

  /** 取消绑定站点活动请求参数 */
  export interface UnbindSiteActivityParams {
    id: number;
  }
}

/**
 * 获取站点活动列表
 */
export async function getSiteActivityListApi(
  params: SiteActivityApi.GetSiteActivityListParams,
): Promise<SiteActivityApi.GetSiteActivityListResponse> {
  return requestClient.get("/site_activity/list", { params });
}

/**
 * 更新站点活动状态
 */
export async function updateSiteActivityStatusApi(
  data: SiteActivityApi.UpdateSiteActivityStatusParams,
) {
  return requestClient.post("/site_activity/update_status", data);
}

/**
 * 绑定活动到站点
 */
export async function bindSiteActivityApi(
  data: SiteActivityApi.BindSiteActivityParams,
) {
  return requestClient.post("/site_activity/bind", data);
}

/**
 * 取消绑定活动
 */
export async function unbindSiteActivityApi(
  data: SiteActivityApi.UnbindSiteActivityParams,
) {
  return requestClient.post("/site_activity/unbind", data);
}
