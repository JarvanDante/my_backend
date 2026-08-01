import { requestClient } from "#/api/request";

export namespace UserGradeApi {
  /** 后端返回的用户等级数据结构 */
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

  /** 前端使用的用户等级数据结构 */
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
  }

  /** 用户等级列表响应 */
  export interface UserGradeListResponse {
    code: number;
    data: BackendUserGradeItem[];
    message: string;
  }

  /** 保存用户等级请求参数 */
  export interface SaveUserGradeParams {
    site_id: number;
    data: BackendUserGradeItem[];
    fields_disable?: string;
    auto_providing?: string;
  }

  /** 保存用户等级响应 */
  export interface SaveUserGradeResponse {
    code: number;
    data: {
      code: number;
      message: string;
    };
    msg: string;
  }

  /** 删除用户等级请求参数 */
  export interface DeleteUserGradeParams {
    site_id: number;
    id: number;
  }

  /** 删除用户等级响应 */
  export interface DeleteUserGradeResponse {
    code: number;
    data: {
      code: number;
      message: string;
    };
    msg: string;
  }
}

/**
 * 获取用户等级列表
 */
export async function getUserGradeListApi(): Promise<UserGradeApi.UserGradeListResponse> {
  return requestClient.get("/app/user-grades");
}

/**
 * 保存用户等级配置
 */
export async function saveUserGradesApi(
  data: UserGradeApi.SaveUserGradeParams
): Promise<UserGradeApi.SaveUserGradeResponse> {
  return requestClient.post("/app/save-user-grades", data);
}

/**
 * 删除用户等级
 */
export async function deleteUserGradeApi(
  data: UserGradeApi.DeleteUserGradeParams
): Promise<UserGradeApi.DeleteUserGradeResponse> {
  return requestClient.post("/app/delete-user-grades", data);
}

/**
 * 将后端数据转换为前端格式
 */
export function transformToFrontend(
  item: UserGradeApi.BackendUserGradeItem
): UserGradeApi.UserGradeItem {
  return {
    id: item.id,
    gradeName: item.name || `VIP${item.id}`,
    memberCount: item.user_count || 0,
    upgradeCondition: item.points_upgrade || 0,
    depositBonus: item.bonus_upgrade || 0,
    withdrawBonus: item.bonus_birthday || 0,
    lottery: item.rebate_percent_lottery || 0,
    sports: item.rebate_percent_sports || 0,
    live: item.rebate_percent_live || 0,
    esports: item.rebate_percent_egame || 0,
    fishing: item.rebate_percent_poker || 0,
    sort: item.id,
    status: 1,
  };
}

/**
 * 将前端数据转换为后端格式
 */
export function transformToBackend(
  item: UserGradeApi.UserGradeItem
): UserGradeApi.BackendUserGradeItem {
  return {
    id: item.id,
    activities: [],
    name: item.gradeName,
    points_upgrade: item.upgradeCondition,
    bonus_upgrade: item.depositBonus,
    bonus_birthday: item.withdrawBonus,
    rebate_percent_sports: item.sports,
    rebate_percent_lottery: item.lottery,
    rebate_percent_live: item.live,
    rebate_percent_egame: item.esports,
    rebate_percent_poker: item.fishing,
    user_count: item.memberCount,
    fields_disable: "",
    auto_providing: "",
  };
}
