import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: { icon: "lucide:wallet", order: 20, title: "财务管理" },
    name: "FinanceManage",
    path: "/finance",
    redirect: "/finance/list",
    children: [
      {
        name: "FinanceList",
        path: "list",
        component: () => import("#/views/finance/index.vue"),
        meta: { icon: "lucide:wallet", title: "财务中心" },
      },
    ],
  },
];

export default routes;
