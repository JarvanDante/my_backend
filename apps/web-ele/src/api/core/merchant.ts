import { requestClient } from "#/api/request";

export namespace MerchantApi {
  export interface MerchantItem {
    id: number;
    name: string;
    contact: string;
    phone: string;
    status: number; // 1启用 0停用
    remark: string;
    created_at: string;
  }

  export interface ListParams {
    keyword?: string;
    status?: number; // 0全部 1启用 2停用
    page?: number;
    size?: number;
  }

  export interface ListData {
    list: MerchantItem[];
    total: number;
    page: number;
    size: number;
  }

  export interface SaveParams {
    id?: number;
    name: string;
    contact?: string;
    phone?: string;
    remark?: string;
  }
}

/** 商户列表 */
export async function getMerchantListApi(params: MerchantApi.ListParams) {
  return requestClient.get<MerchantApi.ListData>("/merchants", { params });
}

/** 创建商户 */
export async function createMerchantApi(params: MerchantApi.SaveParams) {
  return requestClient.post<{ id: number }>("/merchants", params);
}

/** 更新商户 */
export async function updateMerchantApi(params: MerchantApi.SaveParams) {
  return requestClient.put(`/merchants/${params.id}`, params);
}

/** 启用/停用 */
export async function setMerchantStatusApi(id: number, status: number) {
  return requestClient.post(`/merchants/${id}/status`, { id, status });
}
