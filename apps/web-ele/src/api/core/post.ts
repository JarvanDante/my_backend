import { requestClient } from "#/api/request";

/**
 * 社区帖子管理(对接 my_service /backend/post*)。
 *
 * 坑位备忘(照 api/backend/post/v1/post.go):
 * - 路由是**单数** `/post`，不是 `/posts`，别顺手写复数。
 * - ListReq.Status 是 string：空串=全部；控制器里 `strconv.Atoi` 失败或空串会退化成 -1(不过滤)，
 *   所以传数字 0 会真的按"待审核"筛，空串才是全部。
 * - ListReq.UserId 是 int64(不是 string)，0=全部；实测传空串 GF 也能转成 0，
 *   但为了语义清楚这里没填就不传。
 * - 删除是**硬删**，连带评论一起删，前端必须二次确认。
 */
export namespace PostApi {
  export interface Item {
    id: number;
    user_id: number;
    title: string;
    content: string;
    pics: string[];
    topics?: string[];
    category?: string;
    video_url?: string;
    media_id: number;
    view_count: number;
    rank?: number;
    like_count: number;
    comment_count: number;
    /** 0待审核 1已通过 2已拒绝 3用户删除 */
    status: number;
    reject_reason: string;
    created_at: string;
  }
  export interface ListParams {
    /** 空串=全部 0待审核 1已通过 2已拒绝 3用户删除 */
    status?: string;
    /** 标题模糊 */
    keyword?: string;
    /** 0/不传=全部 */
    user_id?: number;
    page?: number;
    size?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getPostListApi(params: PostApi.ListParams) {
  return requestClient.get<PostApi.Page<PostApi.Item>>("/post", { params });
}

/**
 * 审核帖子。pass=true → status 置 1；pass=false → status 置 2 并写 reject_reason。
 * 拒绝原因只有 pass=false 时后端才会落库。
 */
export function auditPostApi(id: number, pass: boolean, reason = "") {
  return requestClient.post(`/post/${id}/audit`, { id, pass, reason });
}

export function updatePostApi(
  id: number,
  body: { category?: string; view_count: number; rank?: number },
) {
  return requestClient.put(`/post/${id}`, { ...body, id });
}

/** 硬删除(连带评论)，不可恢复 */
export function deletePostApi(id: number) {
  return requestClient.delete(`/post/${id}`);
}
