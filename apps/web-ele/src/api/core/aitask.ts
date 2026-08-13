import { requestClient } from "#/api/request";

/**
 * AI 任务管理(对接 my_service /backend/ai/tasks*)。
 *
 * 约定:
 * - 筛选参数 user_id / biz_type / status 一律 **string**, 空串=全部;
 *   后端 atoiOr(s, 0) + `if f.Status > 0` 才拼条件, 状态值本身从 1 开始, 不冲突。
 * - 任务列表只读, 唯二的写操作是 retry(重新扣费) 和 refund(退回金币), 都是危险动作。
 */
export namespace AiTaskApi {
  export interface Item {
    id: number;
    user_id: number;
    task_no: string;
    /** 前台提交幂等用的 token, 后台仅供排查 */
    client_token: string;
    /** 1换脸 2脱衣 3文生图 4图生视频 5文生小说 6AI对话 */
    biz_type: number;
    template_id: number;
    params: Record<string, any>;
    input_url: string;
    cost_gold: number;
    /** 1排队中 2处理中 3成功 4失败 5已退款 6已取消 */
    status: number;
    /** 供应商标识与外部任务号, 只有后台视图有, 用于人工排查与对账 */
    provider: string;
    provider_task_id: string;
    /** 产物(jsonb), 成功时才有内容 */
    result: Record<string, any>;
    err_msg: string;
    retry_count: number;
    submitted_at: string;
    finished_at: string;
    created_at: string;
  }
  export interface ListParams {
    user_id?: string;
    biz_type?: string;
    status?: string;
    task_no?: string;
    page?: number;
    size?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getAiTaskListApi(params: AiTaskApi.ListParams) {
  return requestClient.get<AiTaskApi.Page<AiTaskApi.Item>>("/ai/tasks", {
    params,
  });
}

/**
 * 重新提交。**会重新扣费**: 失败(4)/已退款(5) 的钱已经退回用户了, 重试是一次全新消耗,
 * 后端会按"当前"模板价重新扣一遍并换新单号; 只有排队中(1) 的任务钱还没退, 才不重复扣。
 * 并发保护是精确 CAS(WHERE id=? AND status=<刚读到的状态>), 连点两次第二次必报
 * "任务状态已变更, 请刷新后重试", 不会重复扣费。
 */
export function retryAiTaskApi(id: number) {
  return requestClient.post<{ task: AiTaskApi.Item }>(`/ai/tasks/${id}/retry`, {
    id,
  });
}

/**
 * 人工退款(客服兜底)。后端条件更新 `WHERE status IN (1排队中, 2处理中, 4失败)`,
 * 已成功(3)/已退款(5)/已取消(6) 一律拒绝 —— 重复点第二次会被 RowsAffected=0 拦掉,
 * 报"该任务已成功或已退款, 不能重复退款", 所以退款是幂等的, 不会退两次钱。
 */
export function refundAiTaskApi(id: number, remark?: string) {
  return requestClient.post<{ refund: number }>(`/ai/tasks/${id}/refund`, {
    id,
    remark: remark || "",
  });
}
