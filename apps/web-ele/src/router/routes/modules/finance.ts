import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: { icon: "lucide:wallet", order: 20, title: "财务管理" },
    name: "FinanceManage",
    path: "/finance",
    component: () => import("#/views/finance/index.vue"),
  },
];

export default routes;
