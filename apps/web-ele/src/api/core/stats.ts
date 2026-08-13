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

// ---------------- 扩展维度(分析页图表化) ----------------
export namespace StatsExtApi {
  export interface HourDistItem { hour: number; registers: number; orders: number }
  export interface DeviceStatItem { device_type: string; count: number }
  export interface ContentStatItem {
    media_type: number;
    type_name: string;
    online: number;
    pending: number;
    offline: number;
    views: number;
    buys: number;
    buy_amount: number;
  }
  export interface BalanceSceneItem { scene: string; income: number; expense: number }
}

export function getHourDistApi(days = 30) {
  return requestClient.get<{ list: StatsExtApi.HourDistItem[] }>("/stats/hour-dist", { params: { days } });
}
export function getDeviceStatsApi() {
  return requestClient.get<{ list: StatsExtApi.DeviceStatItem[] }>("/stats/devices");
}
export function getContentStatsApi() {
  return requestClient.get<{ list: StatsExtApi.ContentStatItem[] }>("/stats/content");
}
export function getBalanceScenesApi(days = 30) {
  return requestClient.get<{ list: StatsExtApi.BalanceSceneItem[] }>("/stats/balance-scenes", { params: { days } });
}
