# Token 401 错误处理说明

## 功能描述

在 jh_backend 项目中，已经实现了对所有 API 请求中 token 401 错误的统一处理。当后端返回以下错误时，系统会自动跳转到登录页面：

- `code: 401`
- `msg: "token无效或已过期，请重新登录"`

## 实现位置

文件：`apps/web-ele/src/api/request.ts`

## 处理逻辑

1. **错误检测**：在 `errorMessageResponseInterceptor` 中检测响应数据
2. **条件匹配**：
   - 响应码为 401
   - 错误消息包含 "token 无效或已过期，请重新登录" 或包含 "token 无效" 或 "已过期"
3. **自动处理**：
   - 调用 `doReAuthenticate()` 函数
   - 清空当前 token
   - 根据配置决定显示登录弹窗或直接跳转登录页
   - 保存当前页面路径作为登录后的重定向地址

## 代码实现

```typescript
// 检查是否为 401 token 无效错误
if (
  responseData?.code === 401 &&
  (errorMessage === "token无效或已过期，请重新登录" ||
    errorMessage.includes("token无效") ||
    errorMessage.includes("已过期"))
) {
  // token 无效，执行重新认证逻辑
  doReAuthenticate();
  return; // 不显示错误消息，因为会跳转到登录页
}
```

## 用户体验

- 当 token 过期时，用户不会看到错误提示
- 系统会自动跳转到登录页面
- 登录成功后会自动返回到之前访问的页面
- 整个过程对用户来说是无缝的

## 配置选项

可以通过 `preferences.app.loginExpiredMode` 配置登录过期的处理方式：

- `"modal"`：显示登录过期弹窗
- 其他值：直接跳转到登录页面

## 测试方法

1. 登录系统
2. 手动清除或修改 localStorage 中的 token
3. 发起任何 API 请求
4. 观察是否自动跳转到登录页面

## 注意事项

- 此功能会拦截所有通过 `requestClient` 发起的请求
- 不会显示 401 错误的提示消息，避免用户困惑
- 支持多种错误消息格式的匹配，提高兼容性
