import { requestClient } from "#/api/request";

/**
 * 站内消息(系统消息)管理(对接 my_service /backend/message*)。
 *
 * 坑位备忘(照 api/backend/message/v1/message.go + 控制器):
 * - ListReq.UserId 是 **string**，三态语义(控制器里空串→-1 不过滤):
 *     ""  = 全部(全员消息 + 所有定向消息)
 *     "0" = **只看全员消息**(user_id=0 的那批)
 *     ">0"= 只看指定用户的消息
 *   注意 "0" 不是"全部"，这是最容易搞反的地方。
 * - ListReq.Status 同样是 string: ""=全部 "0"=已撤回 "1"=已发布。
 * - CreateReq 里没有 status 字段，新建后端固定写 status=1(已发布)；
 *   想撤回只能建完再走 Update 把 status 置 0。
 * - UpdateReq 是"部分更新"：title/content 传空串后端会**跳过不改**，
 *   所以编辑表单必须回填原值再提交，否则清空字段是无效操作。
 * - Update 的 type 同理，`type > 0` 才写入。
 */
export namespace MessageApi {
  export interface Item {
    id: number;
    /** 0=全员消息, >0=指定用户 */
    user_id: number;
    /** 1系统通知 2活动 3审核结果 */
    type: number;
    title: string;
    content: string;
    /** 1已发布 0已撤回 */
    status: number;
    created_at: string;
  }
  export interface ListParams {
    /** ""=全部 "0"=只看全员 ">0"=指定用户 */
    user_id?: string;
    /** ""=全部 "0"=已撤回 "1"=已发布 */
    status?: string;
    /** 标题模糊 */
    keyword?: string;
    page?: number;
    size?: number;
  }
  export interface CreateBody {
    /** 0=全员, >0=指定用户 */
    user_id: number;
    type: number;
    title: string;
    content: string;
  }
  export interface UpdateBody {
    type: number;
    title: string;
    content: string;
    /** 0=撤回 1=发布, 后端 v:"in:0,1" 校验 */
    status: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getMessageListApi(params: MessageApi.ListParams) {
  return requestClient.get<MessageApi.Page<MessageApi.Item>>("/message", {
    params,
  });
}
export function createMessageApi(body: MessageApi.CreateBody) {
  return requestClient.post<{ id: number }>("/message", body);
}
export function updateMessageApi(id: number, body: MessageApi.UpdateBody) {
  return requestClient.put(`/message/${id}`, { ...body, id });
}
export function deleteMessageApi(id: number) {
  return requestClient.delete(`/message/${id}`);
}
