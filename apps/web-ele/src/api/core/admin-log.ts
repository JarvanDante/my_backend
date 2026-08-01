import { requestClient } from "#/api/request";

export namespace AdminLogApi {
  /** 管理员日志项 */
  export interface AdminLogItem {
    created_at: string; // 操作时间
    ip: string; // 客户端IP
    remark: string; // 操作内容/备注
    username: string; // 管理员名称
  }

  /** 管理员日志列表请求参数 */
  export interface AdminLogListParams {
    page: number;
    size: number;
    username: string; // 管理员名称筛选
    start: string; // 开始日期
    end: string; // 结束日期
  }

  /** 管理员日志列表响应 */
  export interface AdminLogListResponse {
    count: number; // 总数量
    list: AdminLogItem[]; // 日志列表
  }
}

/**
 * 获取管理员日志列表 - 支持 GET 和 POST form-data
 */
export async function getAdminLogsApi(params: AdminLogApi.AdminLogListParams) {
  console.log("API调用 - 请求参数:", params);

  try {
    // 方法1: 使用 GET 请求，让网关的 RequestParser 中间件处理查询参数
    console.log("尝试 GET 请求，参数:", params);
    const response = await requestClient.get<AdminLogApi.AdminLogListResponse>(
      "/customer/list",
      { params }
    );
    console.log("✅ GET 请求成功，响应:", response);
    return response;
  } catch (error) {
    console.log("❌ GET 请求失败:", error);

    try {
      // 方法2: 使用 POST form-data 请求
      const formData = new FormData();
      formData.append("page", params.page.toString());
      formData.append("size", params.size.toString());
      formData.append("username", params.username);
      formData.append("start", params.start);
      formData.append("end", params.end);

      console.log("尝试 POST form-data 请求，FormData内容:");
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`);
      }

      const response2 =
        await requestClient.post<AdminLogApi.AdminLogListResponse>(
          "/customer/list",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
      console.log("✅ POST form-data 请求成功，响应:", response2);
      return response2;
    } catch (error2) {
      console.log("❌ POST form-data 请求失败:", error2);
      throw error2;
    }
  }
}
