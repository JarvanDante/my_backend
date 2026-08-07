import type { Recordable, UserInfo } from "@vben/types";

import { ref } from "vue";
import { useRouter } from "vue-router";

import { LOGIN_PATH } from "@vben/constants";
import { preferences } from "@vben/preferences";
import { resetAllStores, useAccessStore, useUserStore } from "@vben/stores";

import { ElNotification } from "element-plus";
import { defineStore } from "pinia";

import { getUserInfoApi, loginApi, logoutApi } from "#/api";
import { $t } from "#/locales";
import { applySiteBrand, clearSiteBrand } from "#/utils/site-brand";

export const useAuthStore = defineStore("auth", () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);

  /**
   * 异步处理登录操作
   * Asynchronously handle the login process
   * @param params 登录表单数据
   */
  async function authLogin(
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void
  ) {
    // 异步处理用户登录操作并获取 accessToken
    let userInfo: null | UserInfo = null;
    try {
      loginLoading.value = true;
      const { accessToken } = await loginApi(params);

      // 如果成功获取到 accessToken
      if (accessToken) {
        // 将 accessToken 存储到 accessStore 中
        accessStore.setAccessToken(accessToken);
        // 切换账号必须重新拉 /auth/menus, 否则会沿用上一用户的动态路由
        accessStore.setIsAccessChecked(false);
        accessStore.setAccessMenus([]);
        accessStore.setAccessRoutes([]);

        // 菜单权限由 /auth/menus 下发; 按钮级 accessCodes 暂未接入
        userInfo = await fetchUserInfo();
        userStore.setUserInfo(userInfo);
        accessStore.setAccessCodes([]);

        if (accessStore.loginExpired) {
          accessStore.setLoginExpired(false);
        } else {
          onSuccess
            ? await onSuccess?.()
            : await router.push(
                userInfo.homePath || preferences.app.defaultHomePath
              );
        }

        if (userInfo?.realName) {
          ElNotification({
            message: `${$t("authentication.loginSuccessDesc")}:${
              userInfo?.realName
            }`,
            title: $t("authentication.loginSuccess"),
            type: "success",
          });
        }
      }
    } finally {
      loginLoading.value = false;
    }

    return {
      userInfo,
    };
  }

  async function logout(redirect: boolean = true) {
    // 已在登录页且无 token: 本地已登出, 勿再打 logout 接口
    const token = accessStore.accessToken;
    if (token) {
      try {
        await logoutApi();
      } catch {
        // token 已失效等场景静默处理
      }
    }
    clearSiteBrand();
    resetAllStores();
    accessStore.setLoginExpired(false);

    // 已在登录页时不要再 replace, 避免路由抖动引发重复请求
    if (router.currentRoute.value.path === LOGIN_PATH) {
      return;
    }

    await router.replace({
      path: LOGIN_PATH,
      query: redirect
        ? {
            redirect: encodeURIComponent(router.currentRoute.value.fullPath),
          }
        : {},
    });
  }

  async function fetchUserInfo() {
    let userInfo: null | UserInfo = null;
    userInfo = await getUserInfoApi();
    userStore.setUserInfo(userInfo);
    // 动态品牌: 登录后立刻刷新侧栏「中文名 + 英文简称」
    applySiteBrand(
      (userInfo as any)?.site_name,
      (userInfo as any)?.site_code
    );
    return userInfo;
  }

  function $reset() {
    loginLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    fetchUserInfo,
    loginLoading,
    logout,
  };
});
