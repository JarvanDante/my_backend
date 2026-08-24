# 后台页面 ↔ 接口对照

> 菜单**不在前端配置**。`preferences.ts` 里 `accessMode: "backend"`，侧栏来自
> `GET /backend/auth/menus`，数据在 my_service 的 `admin_permission` 表。
> 所以**加/改菜单 = 改 my_service 的迁移，不要动 `src/router/**`**。
> 本次菜单由 `my_service/manifest/sql/migrations/00042_seed_backend_menus.sql` 落库，`00043_menu_split_content.sql` 拆分内容一级菜单。

## 菜单结构（12 个一级）

| 一级 | 二级 | 页面文件 | API 文件 |
|---|---|---|---|
| 数据概览 | 分析页 | `views/dashboard/analytics/index.vue` | `api/core/stats.ts` |
| 用户管理 | 用户列表 | `views/user/index.vue` | `api/core/bkuser.ts` |
| | 会员等级 | `views/growth/index.vue` | `api/core/bkgroup.ts` |
| | 站内消息 | `views/user/message.vue` | `api/core/message.ts` |
| 视频管理 | 视频列表 | `views/video/index.vue` | `api/core/video.ts` |
| 漫画管理 | 漫画列表 | `views/content/comics.vue` | `api/core/comics.ts` |
| 小说管理 | 小说列表 | `views/content/novel.vue` | `api/core/novel.ts` |
| 图集管理 | 图集列表 | `views/content/photo.vue` | `api/core/photo.ts` |
| 社区管理 | 帖子管理 | `views/community/post.vue` | `api/core/post.ts` |
| | 意见反馈 | `views/community/feedback.vue` | `api/core/feedback.ts` |
| 审核管理 | 投稿审核 | `views/content/publish.vue` | `api/core/publish.ts` |
| 资金管理 | 财务中心 | `views/finance/index.vue` | `api/core/finance.ts` |
| | 金币钱包 | `views/finance/wallet.vue` | `api/core/wallet.ts` |
| | 提现审核 | `views/finance/withdrawal.vue` | `api/core/withdrawal.ts` |
| | 优惠券 | `views/finance/coupon.vue` | `api/core/coupon.ts` |
| 运营管理 | 运营中心 | `views/ops/index.vue` | `api/core/ops.ts` |
| | 运营配置 | `views/ops/config.vue` | `api/core/opsconfig.ts` |
| | 推广兑换码 | `views/promo/index.vue` | `api/core/promo.ts` |
| | 兑换码 | `views/ops/redeemcode.vue` | `api/core/redeemcode.ts` |
| | 商品兑换 | `views/ops/redeem-goods.vue` | `api/core/redeemgoods.ts` |
| | 推广应用 | `views/ops/application.vue` | `api/core/application.ts` |
| | 排行热搜 | `views/ops/rank.vue` | `api/core/ranks.ts` |
| | 抽奖活动 | `views/ops/lottery.vue` | `api/core/lottery.ts` |
| | 标签管理 | `views/content/tag.vue` | `api/core/tag.ts` |
| AI管理 | AI模板 | `views/ai/template.vue` | `api/core/aitemplate.ts` |
| | 换脸-图片模版 | `views/ai/faceswap-template.vue` | `api/core/aitemplate.ts` |
| | AI任务 | `views/ai/task.vue` | `api/core/aitask.ts` |
| | 订单管理 | `views/ai/order.vue` | `api/core/aitask.ts` |
| 系统设置 | 基础配置 | `views/system/config.vue` | `api/core/config.ts` |
| | 角色权限 | `views/system/role.vue` | `api/core/system.ts` |
| | 管理员 | `views/system/admin.vue` | `api/core/system.ts` |
| | 菜单权限 | `views/system/permission.vue` | `api/core/system.ts` |

**归类原则**：视频/漫画/小说/图集/社区各占一个一级（对齐公司后台的习惯，00043 调整）；
投稿审核提为「审核管理」一级（以后评论审核也挂这）；标签是跨内容共用一张表，单独一份放运营管理，
不像公司后台那样在每个内容菜单里重复放；钱相关（充值/钱包/提现/券）集中在资金管理便于对账。
菜单是数据不是代码：想再挪动，直接在 系统设置→菜单权限 里改节点的父级即可。

## 写新页面的约定

1. **文件名必须和 `admin_permission.component` 逐字一致**，写错了菜单点进去就是空白（组件是
   `import.meta.glob('../views/**/*.vue')` 按字符串匹配的，不会报错）。
2. **筛选参数一律用 string，空串=不筛选**。后端大部分列表接口就是按 string 收的
   （空=全部、`"0"`=精确筛 0）；传数字 0 会被当成"筛选 status=0"。少数接口是 int
   （标签的 `content_type`、跳转位的 `location`、各种 `user_id`），已在对应 ts 文件里注释标明。
3. `requestClient` 已把 `{code,message,data}` 解包成 `data`，baseURL 是 `/backend`，
   所以 api 里写 `/comics` 就是 `/backend/comics`。
4. 后端返回的 `status_text` / `xxx_text` 直接用，**不要在前端再翻译一遍**，否则状态机一改两边就不一致。
5. 涉及状态机的操作（审核/打款/发货/退款）后端都是条件更新，重复点会返回"当前状态不允许该操作"，
   属于正常防重；操作成功后必须刷新列表。
6. 金额统一 `toFixed(2)`。

## 本地联调

```bash
pnpm dev            # :5779, vite 已把 /backend 代理到 :8000
```
后端跑 `cd my_service && gf run main.go`（:8000），管理员 admin / admin123。

## 验证记录

这批页面在沙箱里做过真实浏览器冒烟：Chromium 登录后逐个访问 30 个二级页面，
**0 个空白页、0 个控制台报错、0 个非 0 业务码**；每个页面的接口字段也用 curl 对着
Go 契约逐字段核对过（后端返回全是 snake_case）。
