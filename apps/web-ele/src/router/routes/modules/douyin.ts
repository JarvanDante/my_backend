import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: { icon: "lucide:smartphone", order: 55.5, title: "抖音管理" },
    name: "DouyinManage",
    path: "/douyin",
    redirect: "/douyin/list",
    children: [
      {
        name: "DouyinList",
        path: "list",
        component: () => import("#/views/douyin/index.vue"),
        meta: { icon: "lucide:clapperboard", title: "抖音列表" },
      },
      {
        name: "DouyinCategory",
        path: "category",
        component: () => import("#/views/content/douyin-category.vue"),
        meta: { icon: "lucide:folders", title: "抖音分类" },
      },
      {
        name: "DouyinTag",
        path: "tag",
        component: () => import("#/views/content/douyin-tag.vue"),
        meta: { icon: "lucide:tags", title: "抖音标签" },
      },
    ],
  },
];

export default routes;
