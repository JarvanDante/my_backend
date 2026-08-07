import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: { icon: "lucide:video", order: 55, title: "视频管理" },
    name: "VideoManage",
    path: "/video",
    redirect: "/video/list",
    children: [
      {
        name: "VideoList",
        path: "list",
        component: () => import("#/views/video/index.vue"),
        meta: { icon: "lucide:clapperboard", title: "视频列表" },
      },
    ],
  },
];

export default routes;
