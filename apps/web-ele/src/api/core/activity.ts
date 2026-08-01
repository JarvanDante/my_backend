import { requestClient } from "#/api/request";

export namespace ActivityApi {
  /** 活动状态枚举 */
  export enum ActivityStatus {
    DISABLED = 0,
    ENABLED = 1,
  }

  /** 活动模板项 */
  export interface ActivityItem {
    id: number;
    name: string;
    code: string;
    activity_type: string;
    description: string;
    start_time: string;
    end_time: string;
    fixed_params: string;
    status: number;
    uri: string;
    table: string;
    created_at: string;
    updated_at: string;
  }

  /** 获取活动列表请求参数 */
  export interface GetActivityListParams {
    code?: string;
    name?: string;
    activity_type?: string;
    status?: number;
    page?: number;
    size?: number;
  }

  /** 获取活动列表响应 */
  export interface GetActivityListResponse {
    list: ActivityItem[];
    total: number;
  }

  /** 创建活动请求参数 */
  export interface CreateActivityParams {
    name: string;
    code: string;
    activity_type: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    fixed_params?: string;
    status?: number;
    uri?: string;
    table?: string;
  }

  /** 更新活动请求参数 */
  export interface UpdateActivityParams {
    id: number;
    name?: string;
    code?: string;
    activity_type?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    fixed_params?: string;
    status?: number;
    uri?: string;
    table?: string;
  }

  /** 删除活动请求参数 */
  export interface DeleteActivityParams {
    id: number;
  }
}

/**
 * 获取活动列表
 */
export async function getActivityListApi(
  params?: ActivityApi.GetActivityListParams,
): Promise<ActivityApi.GetActivityListResponse> {
  return requestClient.get("/manage/activity/list", { params });
}

/**
 * 获取活动详情
 */
export async function getActivityDetailApi(id: number) {
  return requestClient.get("/manage/activity/detail", { params: { id } });
}

/**
 * 创建活动
 */
export async function createActivityApi(
  data: ActivityApi.CreateActivityParams,
) {
  return requestClient.post("/manage/activity/create", data);
}

/**
 * 更新活动
 */
export async function updateActivityApi(
  data: ActivityApi.UpdateActivityParams,
) {
  return requestClient.post("/manage/activity/update", data);
}

/**
 * 删除活动
 */
export async function deleteActivityApi(
  data: ActivityApi.DeleteActivityParams,
) {
  return requestClient.post("/manage/activity/delete", data);
}
