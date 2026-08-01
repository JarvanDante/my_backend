import { requestClient } from "#/api/request";

export namespace CustomerApi {
  export interface CustomerItem {
    id: number;
    code: string;
    name: string;
    timezone: string; // 时区
    currency: string; // 币种
    status: number; // 状态。1=正常；0=禁用
    kv_config: string; // KV配置详情
    db_link_site: string; // site数据库连接
    db_link_balance: string; // balance数据库连接
    db_link_game: string; // game数据库连接
    is_sync: number; // 是否发布同步。1=发布同步；0=未发布同步
    created_at: string; // 创建时间
    updated_at: string; // 更新时间
  }

  export interface CustomerListData {
    list: CustomerItem[];
    total?: number;
    count?: number;
  }

  export interface CustomerListResponse {
    code: number;
    msg: string;
    data: CustomerListData;
  }

  export interface CustomerListParams {
    page?: number;
    size?: number;
    name?: string;
    code?: string;
    status?: number;
  }

  export interface UpdateCustomerParams {
    id: number;
    name?: string;
    timezone?: string;
    currency?: string;
    status?: number;
    kv_config?: string;
    db_link_site?: string;
    db_link_balance?: string;
    db_link_game?: string;
    is_sync?: number;
  }

  export interface PublishCustomerResponse {
    success: boolean;
    message: string;
  }

  export interface VersionHistoryItem {
    version: number;
    publish_type: number; // 1=正常发布 2=回滚
    rollback_from: number;
    operator_id: number;
    operator_name: string;
    comment: string;
    published_at: string;
    is_current: boolean;
  }

  export interface VersionHistoryData {
    list: VersionHistoryItem[];
    total: number;
    current_version: number;
  }
}

/**
 * 获取客户列表
 */
export async function getCustomerListApi(
  params: CustomerApi.CustomerListParams,
) {
  const response = await requestClient.get<CustomerApi.CustomerListData>(
    "/customer/list",
    {
      params,
    },
  );

  console.log("getCustomerListApi - 原始响应:", response);

  // 由于 requestClient 配置了 responseReturn: "data"，这里的 response 实际上是原始响应的 data 部分
  // 所以 response 的结构是 { list: [...], total?: number, count?: number }
  if (response && typeof response === "object" && "list" in response) {
    return {
      list: response.list || [],
      total: response.total || response.count || 0,
      count: response.count || response.total || 0,
    };
  }

  // 如果响应格式不符合预期，返回空数据
  console.warn("Unexpected customer list response format:", response);
  return { list: [], total: 0, count: 0 };
}

/**
 * 获取客户详情
 */
export async function getCustomerDetailApi(id: number) {
  const response = await requestClient.get<{ data: CustomerApi.CustomerItem }>(
    "/customer/detail",
    {
      params: { id },
    },
  );
  // 由于后端返回的是 { data: CustomerItem }，我们需要提取内层的 data
  return response.data;
}

/**
 * 更新客户信息
 */
export async function updateCustomerApi(
  params: CustomerApi.UpdateCustomerParams,
) {
  const response = await requestClient.post(
    "/api/manage/customer/update",
    params,
  );
  return response;
}

/**
 * 发布客户配置
 */
export async function publishCustomerApi(
  id: number,
): Promise<CustomerApi.PublishCustomerResponse> {
  const response =
    await requestClient.post<CustomerApi.PublishCustomerResponse>(
      "/api/manage/customer/publish",
      { id: id },
    );
  return response;
}

/**
 * 回滚客户配置
 */
export async function rollbackCustomerApi(
  id: number,
  target_version: number,
): Promise<CustomerApi.PublishCustomerResponse> {
  const response =
    await requestClient.post<CustomerApi.PublishCustomerResponse>(
      "/api/manage/customer/rollback",
      { id, target_version },
    );
  return response;
}

/**
 * 获取客户版本历史
 */
export async function getCustomerVersionHistoryApi(params: {
  site_code: string;
  page?: number;
  size?: number;
}): Promise<CustomerApi.VersionHistoryData> {
  const response = await requestClient.get<CustomerApi.VersionHistoryData>(
    "/api/manage/customer/version-history",
    { params },
  );
  return response;
}
