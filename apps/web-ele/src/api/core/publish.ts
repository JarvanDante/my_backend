import { requestClient } from "#/api/request";

/**
 * UGC 投稿审核(对接 my_service /backend/publishes*)。
 *
 * 只有列表 + 审核两个动作: 投稿本身由用户端创建, 后台不新增不编辑。
 * 筛选参数 status / user_id / type 后端都是按 **string** 收的, 空串=不筛选,
 * 传数字 0 会被当成"筛 status=0(待审)"。
 */
export namespace PublishApi {
  export interface Item {
    id: number;
    user_id: number;
    /** 1视频 2漫画 3小说 4图集 */
    type: number;
    title: string;
    intro: string;
    cover: string;
    /** 资源地址列表(后端 jsonb), 可能为 null, 用前先兜底 */
    resource: null | string[];
    tags: null | string[];
    /** 0待审 1通过 2拒绝 3已撤回 */
    status: number;
    reject_reason: string;
    audit_by: number;
    audit_at: string;
    created_at: string;
  }
  export interface ListParams {
    status?: string;
    user_id?: string;
    type?: string;
    keyword?: string;
    page?: number;
    size?: number;
  }
  export interface AuditBody {
    pass: boolean;
    reject_reason?: string;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getPublishListApi(params: PublishApi.ListParams) {
  return requestClient.get<PublishApi.Page<PublishApi.Item>>("/publishes", {
    params,
  });
}
/** 审核: pass=true 通过, false 拒绝(必须给理由)。仅"待审"状态可审, 已审/已撤回后端会拒。 */
export function auditPublishApi(id: number, body: PublishApi.AuditBody) {
  return requestClient.post(`/publishes/${id}/audit`, { ...body, id });
}
