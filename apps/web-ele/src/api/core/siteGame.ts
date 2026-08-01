import { requestClient } from "#/api/request";

export namespace SiteGameApi {
  /** 站点游戏项 */
  export interface SiteGameItem {
    id: number;
    site_code: string;
    type: number;
    game_id: number;
    name: string;
    status: number;
    sort: number;
    created_at: string;
    updated_at: string;
  }

  /** 获取站点游戏列表请求参数 */
  export interface GetSiteGameListParams {
    site_code: string;
  }

  /** 获取站点游戏列表响应 */
  export interface GetSiteGameListResponse {
    list: SiteGameItem[];
  }

  /** 更新站点游戏状态请求参数 */
  export interface UpdateSiteGameStatusParams {
    id: number;
    status: number;
  }

  /** 绑定站点游戏请求参数 */
  export interface BindSiteGameParams {
    site_code: string;
    game_id: number;
  }

  /** 取消绑定站点游戏请求参数 */
  export interface UnbindSiteGameParams {
    id: number;
  }
}

/**
 * 获取站点游戏列表
 */
export async function getSiteGameListApi(
  params: SiteGameApi.GetSiteGameListParams,
): Promise<SiteGameApi.GetSiteGameListResponse> {
  return requestClient.get("/site_game/list", { params });
}

/**
 * 更新站点游戏状态
 */
export async function updateSiteGameStatusApi(
  data: SiteGameApi.UpdateSiteGameStatusParams,
) {
  return requestClient.post("/site_game/update_status", data);
}

/**
 * 绑定游戏到站点
 */
export async function bindSiteGameApi(data: SiteGameApi.BindSiteGameParams) {
  return requestClient.post("/manage/site_game/bind", data);
}

/**
 * 取消绑定游戏
 */
export async function unbindSiteGameApi(
  data: SiteGameApi.UnbindSiteGameParams,
) {
  return requestClient.post("/manage/site_game/unbind", data);
}
