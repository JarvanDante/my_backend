import { requestClient } from "#/api/request";

export namespace BkUserApi {
  export interface UserItem {
    id: number;
    username: string;
    nickname: string;
    phone: string;
    channel: string;
    group_id: number;
    group_name: string;
    level: number;
    balance: number;
    credit: number;
    money_count: number;
    is_disabled: number;
    register_at: string;
    last_login_at: string;
  }

  export interface UserDetail extends UserItem {
    sex: number;
    signature: string;
    img: string;
    fans: number;
    follow: number;
    share_num: number;
    parent_id: number;
    parent_name: string;
    group_rate: number;
    group_end_time: number;
    error_msg: string;
    register_ip: string;
    last_ip: string;
    login_num: number;
  }

  export interface ListParams {
    keyword?: string;
    channel?: string;
    group_id?: number;
    status?: number; // 0全部 1正常 2禁用
    start_date?: number;
    end_date?: number;
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
