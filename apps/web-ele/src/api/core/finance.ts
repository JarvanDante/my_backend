import { requestClient } from "#/api/request";

export namespace FinanceApi {
  export interface RechargePkg {
    id: number;
    name: string;
    amount: number;
    coin: number;
    bonus: number;
    sort: number;
    status: number;
  }
  export interface VipPkg {
    id: number;
    name: string;
    days: number;
    price: number;
    group_id: number;
    sort: number;
    status: number;
  }
  export interface OrderItem {
    id: number;
    order_no: string;
    user_id: number;
    package_id: number;
    amount: number;
    coin: number;
    status: number; // 0待支付 1已支付 -1取消
    pay_at: string;
    created_at: string;
  }
  export interface BalanceLogItem {
    id: number;
    user_id: number;
    direction: number;
    scene: string;
    amount: number;
    balance_before: number;
    balance_after: number;
    ref_id: string;
    remark: string;
    created_at: string;
  }
  export interface Page<T> {
    list: T[];
    total: number;
    page: number;
    size: number;
  }
}

// 充值套餐
export function getRechargePkgListApi() {
  return requestClient.get<{ list: FinanceApi.RechargePkg[] }>("/recharge-packages");
}
export function createRechargePkgApi(p: Partial<FinanceApi.RechargePkg>) {
  return requestClient.post<{ id: number }>("/recharge-packages", p);
}
export function updateRechargePkgApi(p: Partial<FinanceApi.RechargePkg>) {
  return requestClient.put(`/recharge-packages/${p.id}`, p);
}
export function deleteRechargePkgApi(id: number) {
  return requestClient.delete(`/recharge-packages/${id}`);
}

// VIP 套餐
export function getVipPkgListApi() {
  return requestClient.get<{ list: FinanceApi.VipPkg[] }>("/vip-packages");
}
export function createVipPkgApi(p: Partial<FinanceApi.VipPkg>) {
  return requestClient.post<{ id: number }>("/vip-packages", p);
}
export function updateVipPkgApi(p: Partial<FinanceApi.VipPkg>) {
  return requestClient.put(`/vip-packages/${p.id}`, p);
}
export function deleteVipPkgApi(id: number) {
  return requestClient.delete(`/vip-packages/${id}`);
}

// 订单 / 流水
export function getOrderListApi(params: {
  order_no?: string;
  user_id?: number;
  status?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  size?: number;
}) {
  return requestClient.get<FinanceApi.Page<FinanceApi.OrderItem>>("/recharge-orders", { params });
}
export function getBalanceLogListApi(params: {
  user_id?: number;
  scene?: string;
  direction?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  size?: number;
}) {
  return requestClient.get<FinanceApi.Page<FinanceApi.BalanceLogItem>>("/balance-logs", { params });
}
