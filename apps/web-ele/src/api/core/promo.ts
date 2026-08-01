import { requestClient } from "#/api/request";

export namespace PromoApi {
  export interface CodeItem {
    id: number;
    name: string;
    code: string;
    code_key: string;
    type: string;
    object_id: number;
    add_num: number;
    can_use_num: number;
    used_num: number;
    status: number; // 0未使用 1已使用 -1作废
    expired_at: number;
    created_at: string;
  }
  export interface CodeLogItem {
    id: number;
    code_id: number;
    code: string;
    name: string;
    type: string;
    user_id: number;
    username: string;
    add_num: number;
    created_at: string;
  }
  export interface Page<T> {
    list: T[];
    total: number;
    page: number;
    size: number;
  }
  export interface GenResult {
    code_key: string;
    count: number;
    codes: string[];
  }
}

export function getCodeListApi(params: {
  keyword?: string;
  code_key?: string;
  type?: string;
  status?: number;
  page?: number;
  size?: number;
}) {
  return requestClient.get<PromoApi.Page<PromoApi.CodeItem>>("/codes", { params });
}
export function genCodesApi(p: {
  name: string;
  type: string;
  object_id?: number;
  add_num: number;
  can_use_num?: number;
  count: number;
  expired_at?: number;
}) {
  return requestClient.post<PromoApi.GenResult>("/codes", p);
}
export function voidCodeApi(id: number) {
  return requestClient.post(`/codes/${id}/void`, { id });
}
export function getCodeLogListApi(params: {
  code_id?: number;
  user_id?: number;
  code?: string;
  page?: number;
  size?: number;
}) {
  return requestClient.get<PromoApi.Page<PromoApi.CodeLogItem>>("/code-logs", { params });
}
