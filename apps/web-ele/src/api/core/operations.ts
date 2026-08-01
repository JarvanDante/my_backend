import { requestClient } from "#/api/request";

export namespace OperationsApi {
  export interface GlobalReportParams {
    site_id: number;
    start_time: string;
    end_time: string;
  }

  export interface GlobalReportData {
    new_register_users: number;
    recharge_users: number;
    first_deposit_users: number;
    first_deposit_amount: number;
    valid_bet_amount: number;
    net_amount: number;
    deposit_total: number;
    withdraw_total: number;
    bonus_total: number;
    rebate_total: number;
    deposit_success_orders: number;
    deposit_orders: number;
    deposit_success_rate: number;
  }
}

/**
 * 获取单个站点的全局报表
 */
export async function getGlobalReportApi(
  params: OperationsApi.GlobalReportParams,
) {
  return requestClient.get<OperationsApi.GlobalReportData>(
    "/operations/global-report",
    { params },
  );
}
