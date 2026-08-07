import { requestClient } from "#/api/request";

export namespace BkUserApi {
  export interface UserItem {
    id: number;
    username: string;
    nickname: string;
    phone: string;
    sex: number;
    tag: string;
    img: string;
    account_slat: string;
    balance: number;
    gift_count: number;
    credit: number;
    money_count: number;
    is_up: number;
    is_valid: number;
    has_buy: number;
    level: number;
    group_id: number;
    group_name: string;
    group_rate: number;
    group_start_time: number;
    group_end_time: number;
    parent_id: number;
    parent_name: string;
    channel: string;
    device_type: string;
    device_ext: string;
    device_version: string;
    movie_fee_rate: number;
    post_fee_rate: number;
    share_num: number;
    is_disabled: number;
    register_at: string;
    register_ip: string;
    register_area: string;
    last_login_at: string;
    last_ip: string;
    login_num: number;
  }

  export interface UserDetail extends UserItem {
    signature: string;
    fans: number;
    follow: number;
    error_msg: string;
  }

  export interface ListParams {
    keyword?: string;
    user_id?: number;
    username?: string;
    phone?: string;
    parent_id?: number;
    channel?: string;
    group_id?: number;
    is_up?: number; // 0全部 1是 2否
    is_valid?: number;
    has_buy?: number;
    status?: number; // 0全部 1正常 2禁用
    device_type?: string;
    start_date?: number;
    end_date?: number;
    min_login_num?: number;
    max_login_num?: number;
    page?: number;
    size?: number;
  }

  export interface ListData {
    list: UserItem[];
    total: number;
    page: number;
    size: number;
  }

  export interface BalanceLogItem {
    id: number;
    direction: number;
    scene: string;
    amount: number;
    balance_before: number;
    balance_after: number;
    ref_id: string;
    remark: string;
    created_at: string;
  }

  export interface BalanceLogData {
    list: BalanceLogItem[];
    total: number;
    page: number;
    size: number;
  }
}

export async function getUserListApi(params: BkUserApi.ListParams) {
  return requestClient.get<BkUserApi.ListData>("/users", { params });
}

export async function getUserDetailApi(id: number) {
  return requestClient.get<BkUserApi.UserDetail>(`/users/${id}`);
}

export async function setUserDisableApi(id: number, op: "disable" | "enable", reason = "") {
  return requestClient.post(`/users/${id}/disable`, { id, op, reason });
}

export async function setUserGroupApi(
  id: number,
  group_id: number,
  group_name = "",
  group_rate = 0,
  group_end_time = 0,
) {
  return requestClient.post(`/users/${id}/group`, {
    id,
    group_id,
    group_name,
    group_rate,
    group_end_time,
  });
}

export async function adjustBalanceApi(
  id: number,
  target: "balance" | "credit",
  amount: number,
  remark = "",
) {
  return requestClient.post(`/users/${id}/balance`, { id, target, amount, remark });
}

export async function getBalanceLogsApi(id: number, page = 1, size = 20) {
  return requestClient.get<BkUserApi.BalanceLogData>(`/users/${id}/balance-logs`, {
    params: { id, page, size },
  });
}
