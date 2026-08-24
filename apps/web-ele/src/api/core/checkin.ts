import { requestClient } from "#/api/request";

export namespace CheckinApi {
  export interface Config {
    makeup_points: number;
    makeup_limit: number;
    makeup_desc: string;
    vip_group_id: number;
  }
  export interface RewardRow {
    day_num: number;
    label: string;
    points: number;
    gold: number;
    vip_days: number;
    is_milestone: number;
    ms_points: number;
    ms_gold: number;
    ms_vip_days: number;
  }
}

export function getCheckinConfigApi() {
  return requestClient.get<{ config: CheckinApi.Config }>("/checkin/config");
}

export function saveCheckinConfigApi(body: CheckinApi.Config) {
  return requestClient.put("/checkin/config", body);
}

export function getCheckinRewardsApi() {
  return requestClient.get<{ list: CheckinApi.RewardRow[] }>("/checkin/rewards");
}

export function saveCheckinRewardsApi(list: CheckinApi.RewardRow[]) {
  return requestClient.put("/checkin/rewards", { list });
}
