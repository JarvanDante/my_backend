import { requestClient } from "#/api/request";

export namespace GameApi {
  /** 游戏类型枚举 */
  export enum GameType {
    SPORTS = 1, // 体育
    LOTTERY = 2, // 彩票
    LIVE = 3, // 真人
    EGAME = 4, // 电子游戏
  }

  /** 游戏状态枚举 */
  export enum GameStatus {
    DISABLED = 0, // 禁用
    ENABLED = 1, // 启用
  }

  /** 游戏项 */
  export interface GameItem {
    id: number;
    type: number;
    name: string;
    platform: string;
    code: string;
    image_code: string;
    status: number;
    db_name: string;
    remark: string;
    created_at: string;
    updated_at: string;
    api_id: string;
    api_key: string;
    api_url: string;
  }

  /** 获取游戏列表请求参数 */
  export interface GetGameListParams {
    type?: number;
    status?: number;
    platform?: string;
    page?: number;
    size?: number;
  }

  /** 获取游戏列表响应 */
  export interface GetGameListResponse {
    list: GameItem[];
    total: number;
  }

  /** 创建游戏请求参数 */
  export interface CreateGameParams {
    type: number;
    name: string;
    platform: string;
    code: string;
    image_code?: string;
    status?: number;
    db_name?: string;
    remark?: string;
    api_id?: string;
    api_key?: string;
    api_url?: string;
  }

  /** 更新游戏请求参数 */
  export interface UpdateGameParams {
    id: number;
    type?: number;
    name?: string;
    platform?: string;
    code?: string;
    image_code?: string;
    status?: number;
    db_name?: string;
    remark?: string;
    api_id?: string;
    api_key?: string;
    api_url?: string;
  }

  /** 删除游戏请求参数 */
  export interface DeleteGameParams {
    id: number;
  }
}

/**
 * 获取游戏列表
 */
export async function getGameListApi(
  params?: GameApi.GetGameListParams,
): Promise<GameApi.GetGameListResponse> {
  return requestClient.get("/game/list", { params });
}

/**
 * 获取游戏详情
 */
export async function getGameDetailApi(id: number) {
  return requestClient.get(`/game/detail`, { params: { id } });
}

/**
 * 创建游戏
 */
export async function createGameApi(data: GameApi.CreateGameParams) {
  return requestClient.post("/manage/game/create", data);
}

/**
 * 更新游戏
 */
export async function updateGameApi(data: GameApi.UpdateGameParams) {
  return requestClient.post("/manage/game/update", data);
}

/**
 * 删除游戏
 */
export async function deleteGameApi(data: GameApi.DeleteGameParams) {
  return requestClient.post("/manage/game/delete", data);
}

/**
 * 补单请求参数
 */
export interface SupplementBetRecordsParams {
  platform: string;
  start_time: string;
  end_time: string;
  site_codes?: string[];
}

/**
 * 补单响应
 */
export interface SupplementBetRecordsResponse {
  success: boolean;
  message: string;
  total_records: number;
  output?: string;
}

/**
 * 补单接口
 */
export async function supplementBetRecordsApi(
  data: SupplementBetRecordsParams,
): Promise<SupplementBetRecordsResponse> {
  return requestClient.post("/manage/game/supplement-bet-records", data);
}

/**
 * 同步任务相关类型定义
 */
export interface SyncTask {
  id: number;
  site_id: number;
  site_code: string;
  platform: string;
  task_type: number; // 1=定时拉单 2=手动补单
  start_time: string;
  end_time: string;
  mysql_total: number;
  mysql_inserted: number;
  mysql_duplicated: number;
  mq_sent: number;
  mq_failed: number;
  mq_skipped: number;
  ch_synced: number;
  ch_failed: number;
  status: number; // 1=进行中 2=已完成 3=失败
  error_msg: string;
  created_at: string;
  updated_at: string;
  completed_at: string;
}

/**
 * 获取同步任务列表请求参数
 */
export interface GetSyncTasksParams {
  site_id?: number;
  site_code?: string;
  platform?: string;
  task_type?: number;
  status?: number;
  page?: number;
  size?: number;
}

/**
 * 获取同步任务列表响应
 */
export interface GetSyncTasksResponse {
  list: SyncTask[];
  total: number;
  page: number;
  size: number;
}

/**
 * 获取同步任务列表
 */
export async function getSyncTasksApi(
  params?: GetSyncTasksParams,
): Promise<GetSyncTasksResponse> {
  return requestClient.get("/game/sync-tasks", { params });
}
