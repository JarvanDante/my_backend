import { requestClient } from "#/api/request";

export namespace StatsApi {
  export interface Overview {
    total_users: number;
    today_new: number;
    yesterday_new: number;
    today_active: number;
    today_paid_amount: number;
    today_paid_orders: number;
    yest_paid_amount: number;
    total_paid_amount: number;
    total_paid_orders: number;
  }
  export interface UserTrendItem { date: number; new_users: number }
  export interface RechargeTrendItem { date: number; orders: number; amount: number }
  export interface ChannelItem { channel: string; user_count: number; total_recharge: number }
}

export function getOverviewApi() {
  return requestClient.get<StatsApi.Overview>("/stats/overview");
}
export function getUserTrendApi(days = 7) {
  return requestClient.get<{ list: StatsApi.UserTrendItem[] }>("/stats/user-trend", { params: { days } });
}
export function getRechargeTrendApi(days = 7) {
  return requestClient.get<{ list: StatsApi.RechargeTrendItem[] }>("/stats/recharge-trend", { params: { days } });
}
export function getChannelsApi() {
  return requestClient.get<{ list: StatsApi.ChannelItem[] }>("/stats/channels");
}
