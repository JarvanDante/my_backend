<script setup lang="ts">
import type { SupportedLanguagesType } from "@vben/locales";

import { SUPPORT_LANGUAGES } from "@vben/constants";
import { Languages } from "@vben/icons";
import { loadLocaleMessages } from "@vben/locales";
import { preferences, updatePreferences } from "@vben/preferences";

import { VbenDropdownRadioMenu, VbenIconButton } from "@vben-core/shadcn-ui";

defineOptions({
  name: "LanguageToggle",
});

async function handleUpdate(value: string | undefined) {
  if (!value) return;
  const locale = value as SupportedLanguagesType;

  // 保存语言偏好到 localStorage（用于菜单翻译）
  localStorage.setItem("language", locale);

  updatePreferences({
    app: {
      locale,
    },
  });
  await loadLocaleMessages(locale);

  // 刷新页面以重新翻译菜单
  location.reload();
}
</script>

<template>
  <div>
    <VbenDropdownRadioMenu
      :menus="SUPPORT_LANGUAGES"
      :model-value="preferences.app.locale"
      @update:model-value="handleUpdate"
    >
      <VbenIconButton class="hover:animate-[shrink_0.3s_ease-in-out]">
        <Languages class="text-foreground size-4" />
      </VbenIconButton>
    </VbenDropdownRadioMenu>
  </div>
</template>
