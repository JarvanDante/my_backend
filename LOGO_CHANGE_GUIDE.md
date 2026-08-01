# Logo 修改指南

## 当前 Logo 配置

后台管理系统的 Logo 显示在侧边栏顶部，当前使用的是默认的 Vben Admin Logo。

## 修改方法

### 方法一：使用本地图片（推荐）

1. **准备 Logo 图片**

   - 建议尺寸：宽度 120-180px，高度 40-50px
   - 支持格式：PNG、SVG、WebP、JPG
   - 建议使用 SVG 或 PNG（带透明背景）

2. **放置图片文件**

   将 logo 图片放到 `apps/web-ele/public/` 目录下，例如：

   ```
   apps/web-ele/public/logo.png
   apps/web-ele/public/logo-dark.png  (可选，暗色主题使用)
   ```

3. **修改配置文件**

   编辑 `apps/web-ele/src/preferences.ts`：

   ```typescript
   export const overridesPreferences = defineOverridesPreferences({
     app: {
       name: import.meta.env.VITE_APP_TITLE,
       authPageLayout: "panel-center",
       accessMode: "backend",
     },
     // 添加 logo 配置
     logo: {
       enable: true,
       source: "/logo.png", // 亮色主题 logo
       sourceDark: "/logo-dark.png", // 暗色主题 logo（可选）
     },
     theme: {
       builtinType: "violet",
       colorPrimary: "hsl(245 82% 67%)",
     },
   });
   ```

4. **清空缓存并重启**
   ```bash
   # 清空浏览器缓存或使用无痕模式
   # 重启开发服务器
   pnpm dev
   ```

### 方法二：使用在线图片

如果 logo 托管在 CDN 或其他服务器上：

```typescript
logo: {
  enable: true,
  source: "https://your-cdn.com/logo.png",
  sourceDark: "https://your-cdn.com/logo-dark.png",
}
```

### 方法三：修改应用名称

如果只想修改文字，不使用图片 logo：

```typescript
app: {
  name: "您的系统名称",  // 修改这里
}
```

## Logo 配置选项

```typescript
logo: {
  enable: true,           // 是否显示 logo
  fit: "contain",         // 图片适应方式: contain | cover | fill | none | scale-down
  source: "/logo.png",    // 亮色主题 logo 路径
  sourceDark: "/logo-dark.png",  // 暗色主题 logo 路径（可选）
}
```

## 注意事项

1. **路径说明**

   - 以 `/` 开头的路径表示 `public` 目录下的文件
   - 例如 `/logo.png` 对应 `apps/web-ele/public/logo.png`

2. **缓存问题**

   - 修改配置后需要清空浏览器缓存
   - 或者在浏览器中使用 Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac) 强制刷新

3. **图片优化**

   - 建议使用压缩后的图片以提高加载速度
   - SVG 格式最适合 logo，因为它可以无损缩放

4. **暗色主题**
   - 如果不设置 `sourceDark`，暗色主题会使用 `source` 的图片
   - 建议为暗色主题准备单独的 logo（浅色版本）

## 当前配置位置

- **配置文件**：`apps/web-ele/src/preferences.ts`
- **默认配置**：`packages/@core/preferences/src/config.ts`
- **图片目录**：`apps/web-ele/public/`

## 示例

### 完整配置示例

```typescript
import { defineOverridesPreferences } from "@vben/preferences";

export const overridesPreferences = defineOverridesPreferences({
  app: {
    name: "金华管理系统",
    authPageLayout: "panel-center",
    accessMode: "backend",
  },
  logo: {
    enable: true,
    fit: "contain",
    source: "/logo.png",
    sourceDark: "/logo-dark.png",
  },
  theme: {
    builtinType: "violet",
    colorPrimary: "hsl(245 82% 67%)",
  },
});
```
