import { requestClient } from "#/api/request";

export namespace UserLogApi {
  /** 用户登录日志项 */
  export interface UserLoginLogItem {
    id: number;
    username: string; // 会员账号
    device: string; // 终端
    login_time: string; // 登录时间
    referer_url: string; // 来源
    login_url: string; // 登录网址
    login_ip: string; // 登录IP
    login_address: string; // 登录地区
    os: string; // 操作系统
    network: string; // 网络
    browser: string; // 浏览器
  }

  /** 用户登录日志列表请求参数 */
  export interface UserLoginLogParams {
    username: string;
    ip: string;
    start_time: string;
    end_time: string;
    page: number;
    size: number;
  }

  /** 用户登录日志列表响应 */
  export interface UserLoginLogResponse {
    code: number;
    data: UserLoginLogItem[];
    count?: number;
    total?: number;
    message?: string;
  }
}

/**
 * 获取用户登录日志列表
 */
export async function getUserLoginLogsApi(
  params: UserLogApi.UserLoginLogParams
): Promise<UserLogApi.UserLoginLogResponse> {
  return requestClient.get("/app/user-login-logs", { params });
}
