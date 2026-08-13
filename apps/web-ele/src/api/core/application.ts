import { requestClient } from "#/api/request";

/**
 * 推广应用(对接 my_service /backend/application*)。
 *
 * 约定:
 * - status 筛选传 **string**, 空串=全部(后端 statusOf("")=-1); 传 0 会被当成"只看下架"。
 * - loc_ids 是投放位置数组, 后端存 jsonb 并用 `loc_ids @> [x]` 做前台筛选;
 *   更新时是**无条件覆盖**, 所以表单必须把完整数组一起提交。
 */
export namespace ApplicationApi {
  export interface Item {
    id: number;
    name: string;
    /** 应用标签(自定义分类编号) */
    tag: number;
    intro: string;
    avatar: string;
    download_url: string;
    ios_url: string;
    android_url: string;
    loc_ids: number[];
    rank: number;
    /** 下载点击数, 只读(前台 click 接口累加) */
    down_total: number;
    status: number;
    created_at: string;
  }
  export interface ListParams {
    status?: string;
    /** 应用名模糊搜索 */
    keyword?: string;
    page?: number;
    size?: number;
  }
  export interface SaveBody {
    name: string;
    tag?: number;
    intro?: string;
    avatar?: string;
    download_url?: string;
    ios_url?: string;
    android_url?: string;
    loc_ids?: number[];
    rank?: number;
    status?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getApplicationListApi(params: ApplicationApi.ListParams) {
  return requestClient.get<ApplicationApi.Page<ApplicationApi.Item>>(
    "/application",
    { params },
  );
}
export function createApplicationApi(body: ApplicationApi.SaveBody) {
  return requestClient.post<{ id: number }>("/application", body);
}
/** 后端 name/intro/avatar/各 url 是"非空才覆盖", tag/rank/loc_ids 无条件覆盖 */
export function updateApplicationApi(id: number, body: ApplicationApi.SaveBody) {
  return requestClient.put(`/application/${id}`, { ...body, id });
}
export function deleteApplicationApi(id: number) {
  return requestClient.delete(`/application/${id}`);
}
