# 菜单图标层级显示修改说明

## 修改内容

已成功修改 jh_backend 项目的菜单图标显示逻辑：

- **一级菜单**：显示图标
- **二级菜单**：不显示图标
- **三级菜单**：不显示图标

## 修改的文件

### 1. `packages/@core/ui-kit/menu-ui/src/components/menu-item.vue`

**修改内容**：

- 添加了 `isFirstLevelMenuItem` 计算属性来判断是否为一级菜单项
- 在模板中使用 `v-if="isFirstLevelMenuItem"` 条件渲染图标

**关键代码**：

```typescript
// 判断是否为一级菜单项（只有一级菜单显示图标）
const isFirstLevelMenuItem = computed(() => {
  const currentLevel = subMenu?.level ?? 1;
  return currentLevel === 1;
});
```

```vue
<VbenIcon
  v-if="isFirstLevelMenuItem"
  :class="nsMenu.e('icon')"
  :icon="menuIcon"
/>
```

### 2. `packages/@core/ui-kit/menu-ui/src/components/sub-menu-content.vue`

**修改内容**：

- 添加了 `shouldShowIcon` 计算属性来控制子菜单图标显示
- 在模板中使用 `v-if="!isMenuMore && shouldShowIcon"` 条件渲染图标

**关键代码**：

```typescript
// 只有一级菜单显示图标
const shouldShowIcon = computed(() => {
  return isFirstLevel.value;
});
```

```vue
<VbenIcon
  v-if="!isMenuMore && shouldShowIcon"
  :class="nsMenu.e('icon')"
  :icon="icon"
  fallback
/>
```

## 官方图标推荐

项目使用 Iconify 图标库，支持多个图标集合。以下是一些常用的官方图标建议：

### Lucide 图标集（推荐使用）

**系统管理类**：

- `lucide:settings` - 系统设置
- `lucide:users` - 用户管理
- `lucide:shield` - 权限管理
- `lucide:database` - 数据管理
- `lucide:server` - 服务管理

**业务功能类**：

- `lucide:layout-dashboard` - 仪表盘
- `lucide:shopping-cart` - 订单管理
- `lucide:credit-card` - 支付管理
- `lucide:package` - 商品管理
- `lucide:truck` - 物流管理

**内容管理类**：

- `lucide:file-text` - 文档管理
- `lucide:image` - 图片管理
- `lucide:video` - 视频管理
- `lucide:message-square` - 消息管理
- `lucide:bell` - 通知管理

**统计分析类**：

- `lucide:bar-chart` - 统计报表
- `lucide:pie-chart` - 数据分析
- `lucide:trending-up` - 趋势分析
- `lucide:activity` - 活动监控

**工具类**：

- `lucide:wrench` - 工具箱
- `lucide:calendar` - 日程管理
- `lucide:map` - 地图服务
- `lucide:help-circle` - 帮助中心

### Carbon 图标集

**系统类**：

- `carbon:dashboard` - 控制台
- `carbon:user-management` - 用户管理
- `carbon:security` - 安全中心
- `carbon:data-management` - 数据管理

**业务类**：

- `carbon:commerce` - 电商管理
- `carbon:finance` - 财务管理
- `carbon:analytics` - 分析中心
- `carbon:workspace` - 工作台

### Ion 图标集

**常用类**：

- `ion:home` - 首页
- `ion:person` - 个人中心
- `ion:settings` - 设置
- `ion:stats-chart` - 统计

## 使用方法

在路由配置文件中设置图标：

```typescript
{
  meta: {
    icon: 'lucide:layout-dashboard', // 一级菜单图标
    title: '仪表盘',
  },
  name: 'Dashboard',
  path: '/dashboard',
  children: [
    {
      name: 'Analytics',
      path: '/analytics',
      meta: {
        // 二级菜单不需要设置图标，即使设置了也不会显示
        title: '数据分析',
      },
    },
  ],
}
```

## 注意事项

1. **图标格式**：使用 `图标集:图标名` 的格式，如 `lucide:home`
2. **一级菜单**：只有一级菜单会显示图标
3. **二级及以下**：二级、三级等子菜单不会显示图标，即使在配置中设置了图标也不会显示
4. **激活状态**：支持 `activeIcon` 属性，在菜单激活时显示不同的图标
5. **兼容性**：修改保持了原有的所有功能，只是控制了图标的显示层级

## 测试建议

1. 检查一级菜单是否正常显示图标
2. 确认二级、三级菜单不显示图标
3. 测试菜单的展开/收缩功能
4. 验证激活状态的图标切换
5. 检查折叠模式下的图标显示
