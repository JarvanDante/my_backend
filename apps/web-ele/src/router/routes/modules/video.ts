import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: { icon: "lucide:video", order: 55, title: "视频管理" },
    name: "VideoManage",
    path: "/video",
    component: () => import("#/views/video/index.vue"),
  },
];

export default routes;
