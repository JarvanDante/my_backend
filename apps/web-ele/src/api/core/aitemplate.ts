import { requestClient } from "#/api/request";

/**
 * AI 模板管理(对接 my_service /backend/ai/templates*)。
 *
 * 约定:
 * - 筛选参数 biz_type / status 一律 **string**, 空串=全部;
 *   注意后端两者的默认值不同: biz_type 空串 → 0 且 `if f.BizType > 0` 才筛,
 *   status 空串 → -1 且 `if f.Status >= 0` 才筛, 所以 status="0" 能筛出禁用模板。
 * - params 是 jsonb, 后端收的是 map[string]any, 前端必须传对象(不能传字符串)。
 */
export namespace AiTemplateApi {
  export interface Item {
    id: number;
    name: string;
    /** 1换脸 2脱衣 3文生图 4图生视频 5文生小说 6AI对话 */
    biz_type: number;
    cover: string;
    preview: string;
    /** 预设参数(jsonb), 提交给供应商时与用户入参合并 */
    params: Record<string, any>;
    cost_gold: number;
    sort: number;
    status: number;
    created_at: string;
  }
  export interface ListParams {
    biz_type?: string;
    status?: string;
    keyword?: string;
    page?: number;
    size?: number;
  }
  export interface SaveBody {
    name: string;
    biz_type: number;
    cover?: string;
    preview?: string;
    params?: Record<string, any>;
    cost_gold?: number;
    sort?: number;
    status?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getAiTemplateListApi(params: AiTemplateApi.ListParams) {
  return requestClient.get<AiTemplateApi.Page<AiTemplateApi.Item>>(
    "/ai/templates",
    { params },
  );
}
export function createAiTemplateApi(body: AiTemplateApi.SaveBody) {
  return requestClient.post<{ id: number }>("/ai/templates", body);
}
export function updateAiTemplateApi(id: number, body: AiTemplateApi.SaveBody) {
  return requestClient.put(`/ai/templates/${id}`, { ...body, id });
}
export function deleteAiTemplateApi(id: number) {
  return requestClient.delete(`/ai/templates/${id}`);
}
