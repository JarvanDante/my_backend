import { requestClient } from "#/api/request";

export namespace MonitorApi {
  export interface SiteOverviewItem {
    site_id: number;
    site_code: string;
    name: string;
    env: string;
    ok: boolean;
    error: string;
    user_count: number;
    today_new: number;
    today_active: number;
    paid_amount: number;
    paid_orders: number;
  }

  export interface OverviewData {
    site_count: number;
    ok_count: number;
    user_count: number;
    today_new: number;
    today_active: number;
    paid_amount: number;
    paid_orders: number;
    sites: SiteOverviewItem[];
  }

  export interface HealthData {
    site_code: string;
    status: number;
    db_ok: boolean;
    latency_ms: number;
    goose_version: number;
    message: string;
  }

  export interface LogItem {
    id: number;
    admin_id: number;
    username: string;
    method: string;
    path: string;
    ip: string;
    created_at: string;
  }

  export interface LogListData {
    list: LogItem[];
    total: number;
    page: number;
    size: number;
  }

  export interface LogListParams {
    admin_id?: number;
    method?: string;
    keyword?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    size?: number;
  }
}

export async function getOverviewApi() {
  return requestClient.get<MonitorApi.OverviewData>("/overview");
}

export async function getSiteHealthApi(siteId: number) {
  return requestClient.get<MonitorApi.HealthData>(`/sites/${siteId}/health`);
}

export async function getManageLogsApi(params: MonitorApi.LogListParams) {
  return requestClient.get<MonitorApi.LogListData>("/logs", { params });
}
