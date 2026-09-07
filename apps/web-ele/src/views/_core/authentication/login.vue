<script lang="ts" setup>
import type { VbenFormSchema } from "@vben/common-ui";
import type { Recordable } from "@vben/types";

import { computed, ref } from "vue";

import { AuthenticationLogin, z } from "@vben/common-ui";
import { $t } from "@vben/locales";

import { useAuthStore } from "#/store";

defineOptions({ name: "Login" });

const authStore = useAuthStore();

const totpStep = ref<"none" | "bind" | "verify">("none");
const totpQr = ref("");
const totpSecret = ref("");
const checkedUsername = ref("");

const formSchema = computed((): VbenFormSchema[] => {
  const locked = totpStep.value !== "none";
  const fields: VbenFormSchema[] = [
    {
      component: "VbenInput",
      componentProps: {
        placeholder: $t("authentication.usernameTip"),
        disabled: locked,
      },
      fieldName: "username",
      label: $t("authentication.username"),
      rules: z.string().min(1, { message: $t("authentication.usernameTip") }),
    },
    {
      component: "VbenInputPassword",
      componentProps: {
        placeholder: $t("authentication.passwordTip"),
        disabled: locked,
      },
      fieldName: "password",
      label: $t("authentication.password"),
      rules: z.string().min(1, { message: $t("authentication.passwordTip") }),
    },
  ];
  if (totpStep.value !== "none") {
    fields.push({
      component: "VbenInput",
      componentProps: {
        placeholder: $t("authentication.totpCodePlaceholder"),
        maxlength: 6,
        autocomplete: "one-time-code",
        inputmode: "numeric",
      },
      fieldName: "totp_code",
      rules: z.string().min(1, {
        message: $t("authentication.totpCodePlaceholder"),
      }),
    });
  }
  return fields;
});

function resetTotp() {
  totpStep.value = "none";
  totpQr.value = "";
  totpSecret.value = "";
  checkedUsername.value = "";
}

async function handleSubmit(values: Recordable<any>) {
  const username = String(values?.username ?? "");
  if (checkedUsername.value && username !== checkedUsername.value) {
    resetTotp();
  }
  const result = await authStore.authLogin({
    username,
    password: values?.password,
    totp_code: String(values?.totp_code ?? "").trim(),
  });
  if (result.totp) {
    checkedUsername.value = username;
    totpStep.value = result.totp.bound ? "verify" : "bind";
    totpQr.value = result.totp.qr;
    totpSecret.value = result.totp.secret;
  }
}
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    @submit="handleSubmit"
  >
    <template #extra>
      <div v-if="totpStep !== 'none'" class="mb-4">
        <div
          v-if="totpStep === 'bind'"
          class="border-border mb-4 rounded-md border p-3 text-center"
        >
          <p class="text-muted-foreground mb-2 text-sm">
            {{ $t("authentication.totpBindTip") }}
          </p>
          <img
            v-if="totpQr"
            :src="totpQr"
            alt="Google Authenticator"
            class="mx-auto h-44 w-44"
          />
          <p class="text-muted-foreground mt-2 break-all text-xs">
            {{ $t("authentication.totpSecretLabel") }} {{ totpSecret }}
          </p>
        </div>
        <button
          class="text-muted-foreground w-full text-center text-xs"
          type="button"
          @click="resetTotp"
        >
          更换账号
        </button>
      </div>
    </template>
  </AuthenticationLogin>
</template>
