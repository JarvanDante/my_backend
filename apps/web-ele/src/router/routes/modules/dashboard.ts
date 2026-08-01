import type { RouteRecordRaw } from "vue-router";

import { $t } from "#/locales";

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: "lucide:layout-dashboard",
      order: -1,
      title: $t("page.dashboard.title"),
      menuKey: "dashboard",
    },
    name: "Dashboard",
    path: "/dashboard",
    children: [
      {
        name: "Analytics",
        path: "/analytics",
        component: () => import("#/views/dashboard/analytics/index.vue"),
        meta: {
          affixTab: true,
          icon: "lucide:area-chart",
          title: $t("page.dashboard.analytics"),
          menuKey: "analytics",
        },
      },
    ],
  },
];

export default routes;
