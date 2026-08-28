import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    meta: { icon: "lucide:tv", order: 56, title: "动漫管理" },
    name: "CartoonManage",
    path: "/cartoon",
    redirect: "/cartoon/list",
    children: [
      {
        name: "CartoonList",
        path: "list",
        component: () => import("#/views/cartoon/index.vue"),
        meta: { icon: "lucide:clapperboard", title: "动漫列表" },
      },
      {
        name: "CartoonCategory",
        path: "category",
        component: () => import("#/views/content/cartoon-category.vue"),
        meta: { icon: "lucide:folders", title: "动漫分类" },
      },
      {
        name: "CartoonTag",
        path: "tag",
        component: () => import("#/views/content/cartoon-tag.vue"),
        meta: { icon: "lucide:tags", title: "动漫标签" },
      },
      {
        name: "CartoonModule",
        path: "module",
        component: () => import("#/views/content/cartoon-module.vue"),
        meta: { icon: "lucide:layout-grid", title: "动漫模块" },
      },
    ],
  },
];

export default routes;
