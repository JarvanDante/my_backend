import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: { icon: "lucide:trophy", order: 40, title: "用户组与成长" },
    name: "GrowthManage",
    path: "/growth",
    component: () => import("#/views/growth/index.vue"),
  },
];

export default routes;
