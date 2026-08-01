import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: { icon: "lucide:megaphone", order: 50, title: "运营管理" },
    name: "OpsManage",
    path: "/ops",
    component: () => import("#/views/ops/index.vue"),
  },
];

export default routes;
