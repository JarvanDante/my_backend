import { requestClient } from "#/api/request";

/**
 * 意见反馈管理(对接 my_service /backend/feedback*)。
 *
 * 坑位备忘(照 api/backend/feedback/v1/feedback.go):
 * - 这个模块的 ListReq.Status / Type 是 **int**，和后台其它模块的 string 不一样；
 *   语义也不同：这里 **0=全部**(logic 里 `if f.Status > 0` 才过滤)，没有 -1。
 *   为了跟全站筛选风格统一，页面上仍用 string 存状态，出参时转 number；
 *   实测传空串 GF 会转成 0，等价于"全部"，所以空串也是安全的。
 * - status 只有 1处理中 / 2已处理 两个值(见 00020_create_feedback.sql)，没有 0。
 * - Handle 会同时写 reply 和 status，status 只接受 1/2，其它值后端强制改成 2。
 */
export namespace FeedbackApi {
  export interface Item {
    id: number;
    user_id: number;
    /** 1用户反馈 2程序反馈 */
    type: number;
    /** 问题类型, 由客户端自定义上报 */
    problem_type: number;
    content: string;
    pics: string[];
    /** 客户端/系统信息 */
    sys_info: string;
    media_id: number;
    media_title: string;
    /** 1处理中(未处理) 2已处理 */
    status: number;
    reply: string;
    created_at: string;
  }
  export interface ListParams {
    /** 0=全部 1处理中 2已处理 */
    status?: number;
    /** 0=全部 1用户反馈 2程序反馈 */
    type?: number;
    page?: number;
    size?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getFeedbackListApi(params: FeedbackApi.ListParams) {
  return requestClient.get<FeedbackApi.Page<FeedbackApi.Item>>("/feedback", {
    params,
  });
}

/** 处理反馈：写回复并置状态(1处理中 2已处理) */
export function handleFeedbackApi(id: number, reply: string, status: number) {
  return requestClient.post(`/feedback/${id}/handle`, { id, reply, status });
}
