import { requestClient } from "#/api/request";

/**
 * 基础配置(通用 KV)管理(对接 my_service /backend/config*)。
 *
 * 坑位备忘(照 api/backend/config/v1/config.go + logic.normalizeValue):
 * - value 字段在库里是 **jsonb**，接口收发的都是"原始 JSON 文本":
 *     数字   → 10
 *     布尔   → true
 *     字符串 → "abc"(**带引号**)
 *     对象   → {"a":1}
 *   后端 normalizeValue: 输入是合法 JSON 就原样存，否则自动 json.Marshal 成
 *   JSON 字符串(abc → "abc")。所以列表里看到的字符串值都是带引号的，这不是 bug。
 * - ListReq.Status 是 string: ""=全部(控制器转 -1) "0"=禁用 "1"=启用。
 * - UpdateReq **没有 key 字段** → key 建好之后不可改，只能删了重建。
 * - Create 时 grp 传空后端会默认写 "base"；key 全站唯一，重复会报"该 key 已存在"。
 */
export namespace ConfigApi {
  export interface Item {
    id: number;
    /** 分组: base / withdrawal / ai ... */
    grp: string;
    key: string;
    /** 原始 JSON 文本 */
    value: string;
    remark: string;
    /** 0禁用 1启用 */
    status: number;
    updated_at: string;
  }
  export interface ListParams {
    /** 空串=全部 */
    grp?: string;
    /** ""=全部 "0"=禁用 "1"=启用 */
    status?: string;
    /** key / 备注 模糊 */
    keyword?: string;
    page?: number;
    size?: number;
  }
  export interface CreateBody {
    grp: string;
    key: string;
    /** JSON 文本; 非法 JSON 会被后端转成 JSON 字符串 */
    value: string;
    remark: string;
    status: number;
  }
  /** 更新不含 key: 后端契约里就没有这个字段 */
  export interface UpdateBody {
    grp: string;
    value: string;
    remark: string;
    status: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getConfigListApi(params: ConfigApi.ListParams) {
  return requestClient.get<ConfigApi.Page<ConfigApi.Item>>("/config", {
    params,
  });
}
export function createConfigApi(body: ConfigApi.CreateBody) {
  return requestClient.post<{ id: number }>("/config", body);
}
export function updateConfigApi(id: number, body: ConfigApi.UpdateBody) {
  return requestClient.put(`/config/${id}`, { ...body, id });
}
export function deleteConfigApi(id: number) {
  return requestClient.delete(`/config/${id}`);
}
