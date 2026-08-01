import { defineConfig } from "@vben/vite-config";

import ElementPlus from "unplugin-element-plus/vite";

export default defineConfig(async () => {
  return {
    application: {
      // 关闭 unplugin-vue-i18n 的 runtime-only 别名(它把 vue-i18n 指向无编译器的 runtime 版,导致 message 无法编译)
      i18n: false,
    },
    vite: {
      plugins: [
        ElementPlus({
          format: "esm",
        }),
      ],
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
