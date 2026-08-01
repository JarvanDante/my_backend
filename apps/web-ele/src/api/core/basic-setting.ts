import { requestClient } from "#/api/request";

export namespace BasicSettingApi {
  // 基本设置数据项
  export interface BasicSettingItem {
    code: string; // 应用代码
    name: string; // 应用名称
    register_time_interval: number; // 同一IP重复注册次数
    switch_register: boolean | number; // 是否开放注册
    is_close: boolean | number; // 是否关站
    close_reason: string; // 关站提示语
    url_service: string; // 在线客服链接地址
    url_agent_pc: string; // 代理平台链接地址
    url_mobile: string; // 手机APP下载地址
    url_agent_register: string; // 代理推广地址
    min_withdraw: string; // 默认单笔最小提现金额
    max_withdraw: string; // 默认单笔最大提现金额
    game_free_play: string; // 游戏试玩地址
    mobile_logo: string; // 手机logo地址
    default_agent_id: string; // 默认代理ID
    default_agent_name: string; // 默认代理名称
    balance: string; // 默认额度
    balance_reset: string; // 可用额度
  }

  // 获取基本设置响应
  export interface GetBasicSettingResponse {
    code: number; // 状态码
    msg: string; // 提示说明
    data: BasicSettingItem[]; // 数组
  }

  // 更新基本设置请求参数
  export interface UpdateBasicSettingParams {
    code: string;
    name: string;
    register_time_interval: number;
    switch_register: boolean;
    is_close: boolean;
    close_reason: string;
    url_service: string;
    url_agent_pc: string;
    url_mobile: string;
    url_agent_register: string;
    min_withdraw: string;
    max_withdraw: string;
    game_free_play: string;
    mobile_logo: string;
    default_agent_id: string;
    default_agent_name: string;
    balance: string;
    balance_reset: string;
  }

  // 更新基本设置响应
  export interface UpdateBasicSettingResponse {
    code: number;
    msg: string;
    data?: any;
  }
}

/**
 * 获取基本设置
 */
export async function getBasicSettingApi(): Promise<BasicSettingApi.BasicSettingItem> {
  return requestClient.get("/app/basic-setting");
}

/**
 * 上传图片
 */
export async function uploadImageApi(file: File): Promise<{ image: string }> {
  const formData = new FormData();
  formData.append("image", file);

  return requestClient.post("/app/upload-image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}
/**
 * 更新基本设置
 */
export async function updateBasicSettingApi(
  data: BasicSettingApi.UpdateBasicSettingParams
): Promise<BasicSettingApi.UpdateBasicSettingResponse> {
  return requestClient.post("/app/update-basic-setting", data);
}
