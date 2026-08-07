import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: { icon: "lucide:users", order: 10, title: "用户管理" },
    name: "UserManage",
    path: "/user",
    redirect: "/user/list",
    children: [
      {
        name: "UserList",
        path: "list",
        component: () => import("#/views/user/index.vue"),
        meta: { icon: "lucide:list", title: "用户列表" },
      },
    ],
  },
];

export default routes;
