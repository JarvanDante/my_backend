import { requestClient } from "#/api/request";

/**
 * 提现审核(对接 my_service /backend/withdrawals*)。
 *
 * 状态机(见 internal/modules/withdrawal/service/withdrawal.go):
 *   1 申请中(已冻结) → 2 审核通过待打款 → 4 已打款(终态)
 *   1 → 5 已拒绝(自动退款, 终态)
 *   2 → 5 已拒绝(打款失败退款, 终态)
 *   1 → 6 用户撤回(已退款, 终态)
 * 所有迁移在后端都是「WHERE status IN (...) 的条件更新」，重复提交只会生效一次，
 * 第二次会返回"当前状态不允许该操作(可能已被处理)"，所以每次操作后必须刷新列表。
 *
 * 约定: 筛选参数一律 string，空串=不筛选。
 */
export namespace WithdrawalApi {
  export interface Item {
    id: number;
    trade_no: string;
    user_id: number;
    nickname: string;
    amount: number;
    fee: number;
    real_amount: number;
    fee_rate: number;
    balance_after: number;
    account_name: string;
    account_no: string;
    bank_name: string;
    status: number;
    /** 后端已翻译好的状态中文，前端直接用，不要再翻一遍 */
    status_text: string;
    audit_by: number;
    audit_at: string;
    paid_at: string;
    remark: string;
    pay_voucher: string;
    created_at: string;
  }
  export interface ListParams {
    status?: string;
    user_id?: string;
    page?: number;
    size?: number;
  }
  export interface ListResult {
    list: Item[];
    total: number;
    /** 当前筛选条件下的申请总额 */
    sum_amount: number;
    /** 待审核笔数(status=1)，不受当前筛选影响，是全局待办数 */
    pending_num: number;
  }
}

export function getWithdrawalListApi(params: WithdrawalApi.ListParams) {
  return requestClient.get<WithdrawalApi.ListResult>("/withdrawals", { params });
}

/** 审核: pass=true → 2待打款; pass=false → 5拒绝并自动退回用户余额。仅 status=1 可调 */
export function auditWithdrawalApi(id: number, pass: boolean, remark: string) {
  return requestClient.post(`/withdrawals/${id}/audit`, { id, pass, remark });
}

/** 标记已打款(仅 status=2 可调)，voucher 为打款凭证图片 URL，进入终态 4 */
export function markPaidWithdrawalApi(
  id: number,
  voucher: string,
  remark: string,
) {
  return requestClient.post(`/withdrawals/${id}/mark-paid`, {
    id,
    voucher,
    remark,
  });
}

/** 打款失败退款(仅 status=2 可调)，退回余额并置为 5 已拒绝，用于线下打款失败兜底 */
export function refundWithdrawalApi(id: number, remark: string) {
  return requestClient.post(`/withdrawals/${id}/refund`, { id, remark });
}
