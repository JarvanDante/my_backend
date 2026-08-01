import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: { icon: "lucide:ticket", order: 30, title: "兑换码" },
    name: "PromoManage",
    path: "/promo",
    component: () => import("#/views/promo/index.vue"),
  },
];

export default routes;
