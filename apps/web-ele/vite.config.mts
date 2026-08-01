import { defineConfig } from "@vben/vite-config";

import ElementPlus from "unplugin-element-plus/vite";

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      plugins: [
        ElementPlus({
          format: "esm",
        }),
      ],
      // 修复 "message compiler isn't included": 让 vue-i18n 按含编译器的 esm-bundler 预构建
      // 注意: 不能在此定义 resolve.alias, 会覆盖 vben 的 #/ 别名导致编译崩溃
      optimizeDeps: {
        include: ["vue-i18n"],
      },
      server: {
        host: "0.0.0.0",
        proxy: {
          "/backend": {
            changeOrigin: true,
            target: "http://host.docker.internal:8000",
            ws: true,
          },
        },
      },
    },
  };
});
