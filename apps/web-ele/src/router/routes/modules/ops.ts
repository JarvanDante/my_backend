import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: { icon: "lucide:megaphone", order: 50, title: "运营管理" },
    name: "OpsManage",
    path: "/ops",
    redirect: "/ops/list",
    children: [
      {
        name: "OpsList",
        path: "list",
        component: () => import("#/views/ops/index.vue"),
        meta: { icon: "lucide:megaphone", title: "运营中心" },
      },
    ],
  },
];

export default routes;
