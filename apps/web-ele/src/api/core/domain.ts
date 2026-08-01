import { requestClient } from "#/api/request";

export namespace DomainApi {
  export interface DomainItem {
    id: number;
    site_code: string;
    domain: string;
    domain_type: number;
    status: number;
    created_at: string;
    updated_at: string;
  }

  export interface DomainListData {
    list: DomainItem[];
    total: number;
  }

  export interface DomainListParams {
    page?: number;
    size?: number;
    site_code?: string;
    domain_type?: number;
    status?: number;
  }

  export interface CreateDomainParams {
    site_code: string;
    domain: string;
    domain_type: number;
    status: number;
  }

  export interface UpdateDomainParams {
    id: number;
    site_code?: string;
    domain?: string;
    domain_type?: number;
    status?: number;
  }

  export interface OptionItem {
    value: number | string;
    label: string;
  }
}

/**
 * 获取域名列表
 */
export async function getDomainListApi(params: DomainApi.DomainListParams) {
  const response = await requestClient.get<DomainApi.DomainListData>(
    "/site-domain/list",
    { params },
  );
  return response;
}

/**
 * 创建域名
 */
export async function createDomainApi(params: DomainApi.CreateDomainParams) {
  const response = await requestClient.post("/site-domain/create", params);
  return response;
}

/**
 * 更新域名
 */
export async function updateDomainApi(params: DomainApi.UpdateDomainParams) {
  const response = await requestClient.post(
    "/api/manage/site-domain/update",
    params,
  );
  return response;
}

/**
 * 删除域名
 */
export async function deleteDomainApi(id: number) {
  const response = await requestClient.post("/api/manage/site-domain/delete", {
    id,
  });
  return response;
}

/**
 * 获取域名类型选项
 */
export async function getDomainTypeOptionsApi() {
  const response = await requestClient.get<{ list: DomainApi.OptionItem[] }>(
    "/api/manage/options/domain-type",
  );
  return response;
}

/**
 * 获取站点选项
 */
export async function getSiteOptionsApi() {
  const response = await requestClient.get<{ list: DomainApi.OptionItem[] }>(
    "/api/manage/options/site",
  );
  return response;
}
