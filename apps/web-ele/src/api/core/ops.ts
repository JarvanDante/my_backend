import { requestClient } from "#/api/request";

export namespace OpsApi {
  export interface NoticeItem {
    id: number;
    title: string;
    content: string;
    type: string;
    status: number;
    created_by: number;
    created_at: string;
  }
  export interface MessageItem {
    id: number;
    from_id: number;
    to_id: number;
    content: string;
    created_at: string;
  }
  export interface FollowItem {
    id: number;
    user_id: number;
    user_name: string;
    home_id: number;
    home_name: string;
    created_at: string;
  }
  export interface ShareLogItem {
    id: number;
    user_id: number;
    type: string;
    target_id: number;
    channel: string;
    created_at: string;
  }
  export interface ChannelCount { channel: string; count: number }
  export interface InviteRank { user_id: number; username: string; invite_count: number }
  export interface ShareStats {
    total_shares: number;
    sharer_count: number;
    channels: ChannelCount[];
    invite_rank: InviteRank[];
  }
  export interface Page<T> { list: T[]; total: number; page: number; size: number }
}

// 公告
export function pushNoticeApi(p: { title: string; content: string; type: string }) {
  return requestClient.post<{ id: number }>("/push", p);
}
export function getNoticeListApi(params: { type?: string; status?: number; page?: number; size?: number }) {
  return requestClient.get<OpsApi.Page<OpsApi.NoticeItem>>("/notices", { params });
}
export function setNoticeStatusApi(id: number, status: number) {
  return requestClient.put(`/notices/${id}/status`, { id, status });
}
// 客服
export function getCustomerUrlApi() {
  return requestClient.get<{ url: string }>("/config/customer-url");
}
export function setCustomerUrlApi(url: string) {
  return requestClient.put("/config/customer-url", { url });
}
// 消息监控
export function getMessageListApi(params: { user_id?: number; keyword?: string; page?: number; size?: number }) {
  return requestClient.get<OpsApi.Page<OpsApi.MessageItem>>("/messages", { params });
}
// 关注
export function getFollowListApi(params: { user_id?: number; home_id?: number; page?: number; size?: number }) {
  return requestClient.get<OpsApi.Page<OpsApi.FollowItem>>("/follows", { params });
}
// 分享
export function getShareLogListApi(params: { user_id?: number; channel?: string; page?: number; size?: number }) {
  return requestClient.get<OpsApi.Page<OpsApi.ShareLogItem>>("/share-logs", { params });
}
export function getShareStatsApi(top = 20) {
  return requestClient.get<OpsApi.ShareStats>("/share-stats", { params: { top } });
}
