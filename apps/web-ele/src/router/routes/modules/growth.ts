import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: { icon: "lucide:trophy", order: 40, title: "用户组与成长" },
    name: "GrowthManage",
    path: "/growth",
    redirect: "/growth/list",
    children: [
      {
        name: "GrowthList",
        path: "list",
        component: () => import("#/views/growth/index.vue"),
        meta: { icon: "lucide:trophy", title: "成长中心" },
      },
    ],
  },
];

export default routes;
