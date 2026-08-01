import { requestClient } from "#/api/request";

export namespace GrowthApi {
  export interface TaskItem {
    id: number;
    name: string;
    type: string;
    description: string;
    max_num: number;
    reward: number;
    status: number;
    sort: number;
  }
  export interface TaskLogItem {
    id: number;
    user_id: number;
    task_id: number;
    type: string;
    num: number;
    log_date: number;
    created_at: string;
  }
  export interface SignDay {
    day: number;
    count: number;
  }
  export interface SignStats {
    year_month: number;
    user_count: number;
    sign_count: number;
    days: SignDay[];
  }
  export interface Page<T> {
    list: T[];
    total: number;
    page: number;
    size: number;
  }
}

export function getTaskListApi() {
  return requestClient.get<{ list: GrowthApi.TaskItem[] }>("/tasks");
}
export function createTaskApi(p: Partial<GrowthApi.TaskItem>) {
  return requestClient.post<{ id: number }>("/tasks", p);
}
export function updateTaskApi(p: Partial<GrowthApi.TaskItem>) {
  return requestClient.put(`/tasks/${p.id}`, p);
}
export function deleteTaskApi(id: number) {
  return requestClient.delete(`/tasks/${id}`);
}
export function getTaskLogListApi(params: {
  user_id?: number;
  task_id?: number;
  type?: string;
  page?: number;
  size?: number;
}) {
  return requestClient.get<GrowthApi.Page<GrowthApi.TaskLogItem>>("/task-logs", { params });
}
export function getSignStatsApi(year_month = 0) {
  return requestClient.get<GrowthApi.SignStats>("/sign-stats", { params: { year_month } });
}
