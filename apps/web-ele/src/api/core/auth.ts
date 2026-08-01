import { requestClient } from "#/api/request";

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  /** 后端管理员信息(/auth/login 与 /auth/info 的 data.admin / data) */
  export interface AdminInfo {
    id: number;
    username: string;
    nickname?: string;
    role_id?: number;
    site_code?: string;
    site_name?: string;
  }

  /** 登录返回 data */
  export interface LoginResult {
    token: string;
    admin: AdminInfo;
  }
}

/**
 * 登录: POST /manage/auth/login → data:{token, admin}
 */
export async function loginApi(data: AuthApi.LoginParams) {
  const response = await requestClient.post<AuthApi.LoginResult>(
    "/auth/login",
    data
  );
  return {
    accessToken: response.token,
    admin: response.admin,
  };
}

/**
 * 获取当前管理员信息: GET /manage/auth/info
 * 映射为 vben 的 UserInfo 结构。
 */
export async function getUserInfoApi() {
  const info = await requestClient.get<AuthApi.AdminInfo>("/auth/info");
  return {
    userId: String(info.id),
    username: info.username,
    realName: info.nickname || info.username,
    avatar: "",
    roles: [],
    homePath: "/dashboard",
    site_code: (info as any).site_code,
    site_name: (info as any).site_name,
  } as any;
}

/**
 * 退出登录: POST /manage/auth/logout(需带 token, 走 requestClient)
 */
export async function logoutApi() {
  try {
    await requestClient.post("/auth/logout");
  } catch {
    // token 已失效等场景静默处理, 前端本地登出继续
  }
}

/**
 * 获取用户权限码(暂无此后端能力, 返回空)
 */
export async function getAccessCodesApi() {
  return [] as string[];
}

/**
 * 刷新 token(后端为 7 天滑动续期, 无独立刷新接口; 保留空实现防误调用)
 */
export async function refreshTokenApi() {
  return { data: "", status: 200 };
}
