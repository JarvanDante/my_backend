import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: { icon: "lucide:ticket", order: 30, title: "兑换码" },
    name: "PromoManage",
    path: "/promo",
    redirect: "/promo/list",
    children: [
      {
        name: "PromoList",
        path: "list",
        component: () => import("#/views/promo/index.vue"),
        meta: { icon: "lucide:ticket", title: "兑换码管理" },
      },
    ],
  },
];

export default routes;
