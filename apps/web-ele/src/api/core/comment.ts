import { requestClient } from "#/api/request";

/**
 * 评论审核(对接 my_service /backend/comment*)。
 *
 * - ListReq.Status 是 string：空串=全部；传 "0" 才是待审。
 * - Kind: 空=全部 main=主评 reply=回复。
 * - 审核只对待审生效, 通过后补评论数/回复数, 拒绝不计数。
 */
export namespace CommentApi {
  export interface Item {
    id: number;
    user_id: number;
    nickname: string;
    img: string;
    is_vip: boolean;
    media_type: number;
    content_id: number;
    parent_id: number;
    root_id: number;
    content: string;
    like_count: number;
    reply_count: number;
    /** 0待审 1已上墙 2已拒绝 */
    status: number;
    created_at: string;
  }
  export interface ListParams {
    status?: string;
    kind?: string;
    keyword?: string;
    user_id?: number;
    media_type?: number;
    page?: number;
    size?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getCommentListApi(params: CommentApi.ListParams) {
  return requestClient.get<CommentApi.Page<CommentApi.Item>>("/comment", {
    params,
  });
}

export function auditCommentApi(id: number, pass: boolean) {
  return requestClient.post(`/comment/${id}/audit`, { id, pass });
}
