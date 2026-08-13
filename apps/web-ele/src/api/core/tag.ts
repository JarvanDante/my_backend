import { requestClient } from "#/api/request";

/**
 * 标签管理(对接 my_service /backend/tag*, 路径是单数)。
 *
 * 注意两个筛选参数的类型不一样, 是后端契约就这么定的:
 * - content_type 是 int, 0(或不传) = 全部;
 * - status 是 string, 空串 = 全部, "0" 只看禁用, "1" 只看启用。
 * 新增时 content_type 必填且不可改(标签归属的内容域固定), 编辑只能改名称/排序/状态。
 */
export namespace TagApi {
  export interface Item {
    id: number;
    content_type: number;
    name: string;
    rank: number;
    status: number;
    created_at: string;
  }
  export interface ListParams {
    content_type?: number;
    status?: string;
    page?: number;
    size?: number;
  }
  export interface CreateBody {
    content_type: number;
    name: string;
    rank?: number;
    status?: number;
  }
  export interface UpdateBody {
    name?: string;
    rank?: number;
    status?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getTagListApi(params: TagApi.ListParams) {
  return requestClient.get<TagApi.Page<TagApi.Item>>("/tag", { params });
}
export function createTagApi(body: TagApi.CreateBody) {
  return requestClient.post<{ id: number }>("/tag", body);
}
export function updateTagApi(id: number, body: TagApi.UpdateBody) {
  return requestClient.put(`/tag/${id}`, { ...body, id });
}
export function deleteTagApi(id: number) {
  return requestClient.delete(`/tag/${id}`);
}
