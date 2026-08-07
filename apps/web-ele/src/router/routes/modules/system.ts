import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: { icon: "lucide:settings", order: 90, title: "系统管理" },
    name: "System",
    path: "/system",
    children: [
      {
        name: "SystemRole",
        path: "role",
        component: () => import("#/views/system/role.vue"),
        meta: { icon: "lucide:shield-check", title: "角色权限" },
      },
      {
        name: "SystemAdmin",
        path: "admin",
        component: () => import("#/views/system/admin.vue"),
        meta: { icon: "lucide:users", title: "管理员" },
      },
      {
        name: "SystemPermission",
        path: "permission",
        component: () => import("#/views/system/permission.vue"),
        meta: { icon: "lucide:list-tree", title: "菜单权限" },
      },
    ],
  },
];

export default routes;
