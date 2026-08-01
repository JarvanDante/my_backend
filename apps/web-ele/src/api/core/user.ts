import { requestClient } from "#/api/request";

export namespace UserApi {
  /** 用户项 */
  export interface UserItem {
    id: number;
    username: string; // 会员账号
    level: string; // 会员级别
    deposit_amount: number; // 充值金额
    withdraw_amount: number; // 提现金额
    points: number; // 积分
    last_login_time: string; // 最后登录时间
    register_time: string; // 注册时间
    login_ip: string; // 登录IP
    register_ip: string; // 注册IP
    status: number; // 状态
    // 编辑时需要的额外字段
    grade_id?: number; // 等级ID
    agent_id?: number; // 上级代理ID
    mobile?: string; // 手机号
    email?: string; // 邮箱
    birthday?: string; // 生日
    sex?: number; // 性别
    remark?: string; // 备注
  }

  /** 用户列表请求参数 */
  export interface UserListParams {
    page: number;
    size: number;
    username: string; // 会员账号筛选
    grade_id: string; // 会员等级ID筛选
    start: string; // 开始日期
    end: string; // 结束日期
  }

  /** 用户详情响应 */
  export interface UserDetailResponse {
    user: {
      id: number;
      username: string;
      level_name?: string;
      grade_name?: string;
      grade_id?: number; // 添加等级ID字段
      agent_name?: string;
      register_time?: string;
      last_login_time?: string;
      last_login_ip?: string;
      register_ip?: string;
      mobile?: string;
      email?: string;
      birthday?: string;
      sex?: number;
      status?: number;
      balance?: string;
      remark?: string;
      is_online?: number;
      last_login_address?: string;
      device?: string;
      banks?: any[];
    };
  }

  /** 更新用户请求参数 */
  export interface UpdateUserParams {
    id: number;
    login_password?: string;
    pay_password?: string;
    grade_id?: number;
    agent_id?: number;
    mobile?: string;
    email?: string;
    birthday?: string;
    sex?: number; // 1=男, 2=女, 0=未知
    status?: number; // 账号状态 1=启用, 0=停用
    remark?: string;
  }

  /** 会员等级选项 */
  export interface UserGradeOption {
    id: number;
    name: string;
    sort: number;
    status: number;
  }

  /** 会员等级选项响应 */
  export interface UserGradeOptionsResponse {
    grades: UserGradeOption[];
  }

  /** 用户列表响应 */
  export interface UserListResponse {
    list: UserItem[];
    count: number;
  }

  /** 用户等级配置项 */
  export interface UserGradeItem {
    id: number;
    gradeName: string; // 等级名称
    memberCount: number; // 会员数量
    upgradeCondition: number; // 晋级条件(有效投注)
    depositBonus: number; // 存款奖金
    withdrawBonus: number; // 提款奖金
    lottery: number; // 彩票返水比例
    sports: number; // 体育返水比例
    live: number; // 真人视讯返水比例
    esports: number; // 电子竞技返水比例
    fishing: number; // 捕鱼返水比例
    sort?: number; // 排序
    status?: number; // 状态
    created_at?: string; // 创建时间
    updated_at?: string; // 更新时间
  }

  /** 后端API期望的用户等级数据结构 */
  export interface BackendUserGradeItem {
    id: number;
    activities: any[];
    name: string; // 等级名称
    points_upgrade: number; // 晋级条件(积分)
    bonus_upgrade: number; // 晋级奖金
    bonus_birthday: number; // 生日奖金
    rebate_percent_sports: number; // 体育返水比例
    rebate_percent_lottery: number; // 彩票返水比例
    rebate_percent_live: number; // 真人返水比例
    rebate_percent_egame: number; // 电子游戏返水比例
    rebate_percent_poker: number; // 扑克返水比例
    user_count: number; // 用户数量
    fields_disable: string;
    auto_providing: string;
  }

  /** 用户等级列表响应 */
  export interface UserGradeListResponse {
    list: UserGradeItem[];
    count: number;
  }

  /** 保存用户等级请求参数 */
  export interface SaveUserGradeParams {
    site_id: number;
    data: BackendUserGradeItem[];
    fields_disable?: string;
    auto_providing?: string;
  }

  /** 删除用户等级请求参数 */
  export interface DeleteUserGradeParams {
    id: number;
  }
}

/**
 * 获取用户列表 - 支持 GET 和 POST form-data
 */
export async function getUsersApi(params: UserApi.UserListParams) {
  console.log("API调用 - 请求参数:", params);

  try {
    // 方法1: 使用 GET 请求，让网关的 RequestParser 中间件处理查询参数
    console.log("尝试 GET 请求，参数:", params);
    const response = await requestClient.get<UserApi.UserListResponse>(
      "/app/users",
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
      formData.append("grade_id", params.grade_id);
      formData.append("start", params.start);
      formData.append("end", params.end);

      console.log("尝试 POST form-data 请求，FormData内容:");
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`);
      }

      const response2 = await requestClient.post<UserApi.UserListResponse>(
        "/app/users",
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

/**
 * 更新用户信息 - 支持 GET 和 POST form-data
 */
export async function updateUserApi(params: UserApi.UpdateUserParams) {
  console.log("API调用 - 更新用户参数:", params);

  try {
    // 方法1: 使用 POST form-data 请求
    const formData = new FormData();
    formData.append("id", params.id.toString());

    if (params.login_password)
      formData.append("login_password", params.login_password);
    if (params.pay_password)
      formData.append("pay_password", params.pay_password);
    if (params.grade_id !== undefined)
      formData.append("grade_id", params.grade_id.toString());
    if (params.agent_id !== undefined)
      formData.append("agent_id", params.agent_id.toString());
    if (params.mobile) formData.append("mobile", params.mobile);
    if (params.email) formData.append("email", params.email);
    if (params.birthday) formData.append("birthday", params.birthday);
    if (params.sex !== undefined) formData.append("sex", params.sex.toString());
    if (params.status !== undefined)
      formData.append("status", params.status.toString());
    if (params.remark) formData.append("remark", params.remark);

    console.log("尝试 POST form-data 请求，FormData内容:");
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    const response = await requestClient.post<{
      success: boolean;
      message?: string;
    }>("/app/update-user", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    console.log("✅ POST form-data 请求成功，响应:", response);
    return response;
  } catch (error) {
    console.log("❌ 更新用户请求失败:", error);
    throw error;
  }
}

/**
 * 获取用户详情
 */
export async function getUserDetailApi(userId: number) {
  console.log("API调用 - 获取用户详情，用户ID:", userId);

  try {
    const response = await requestClient.get<UserApi.UserDetailResponse>(
      "/app/user-basic-info",
      { params: { id: userId } }
    );
    console.log("✅ 获取用户详情成功，响应:", response);
    return response;
  } catch (error) {
    console.log("❌ 获取用户详情失败:", error);
    throw error;
  }
}

/**
 * 获取会员等级选项
 */
export async function getUserGradeOptionsApi() {
  console.log("API调用 - 获取会员等级选项");

  try {
    const response = await requestClient.get<UserApi.UserGradeOptionsResponse>(
      "/app/options-user-grade"
    );
    console.log("✅ 获取会员等级选项成功，响应:", response);
    return response;
  } catch (error) {
    console.log("❌ 获取会员等级选项失败:", error);
    throw error;
  }
}

/**
 * 获取用户等级列表
 */
export async function getUserGradeListApi() {
  console.log("API调用 - 获取用户等级列表");

  try {
    const response = await requestClient.get<UserApi.UserGradeListResponse>(
      "/app/user-grades"
    );
    console.log("✅ 获取用户等级列表成功，响应:", response);
    return response;
  } catch (error) {
    console.log("❌ 获取用户等级列表失败:", error);
    throw error;
  }
}

/**
 * 保存用户等级配置
 */
export async function saveUserGradesApi(params: UserApi.SaveUserGradeParams) {
  console.log("API调用 - 保存用户等级配置，参数:", params);

  try {
    const response = await requestClient.post<{
      success: boolean;
      message?: string;
      
    }>("/app/save-user-grades", params, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log("✅ 保存用户等级配置成功，响应:", response);
    return response;
  } catch (error) {
    console.log("❌ 保存用户等级配置失败:", error);
    throw error;
  }
}

/**
 * 删除用户等级
 */
export async function deleteUserGradeApi(
  params: UserApi.DeleteUserGradeParams
) {
  console.log("API调用 - 删除用户等级，参数:", params);

  try {
    // 使用 POST form-data 请求
    const formData = new FormData();
    formData.append("id", params.id.toString());

    console.log("尝试 POST form-data 请求，FormData内容:");
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    const response = await requestClient.post<{
      success: boolean;
      message?: string;
    }>("/app/delete-user-grades", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    console.log("✅ 删除用户等级成功，响应:", response);
    return response;
  } catch (error) {
    console.log("❌ 删除用户等级失败:", error);
    throw error;
  }
}
