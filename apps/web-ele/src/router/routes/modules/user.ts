import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: { icon: "lucide:users", order: 10, title: "用户管理" },
    name: "UserManage",
    path: "/user",
    component: () => import("#/views/user/index.vue"),
  },
];

export default routes;
