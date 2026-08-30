<script lang="ts" setup>
import { ref } from "vue";

import { ElTabPane, ElTabs } from "element-plus";

import OpsRedeemCode from "#/views/ops/redeemcode.vue";
import PromoManage from "#/views/promo/index.vue";

defineOptions({ name: "OpsCodes" });

const kind = ref("promo");
</script>

<template>
  <div>
    <p class="text-muted-foreground px-5 pt-4 text-xs">
      推广兑换对应 H5「兑换中心」（批量生成金币/用户组码）；通用兑换是一码多次的单独建码。
    </p>
    <ElTabs v-model="kind" class="px-5">
      <ElTabPane label="推广兑换" name="promo">
        <PromoManage />
      </ElTabPane>
      <ElTabPane label="通用兑换" name="redeem">
        <OpsRedeemCode />
      </ElTabPane>
    </ElTabs>
  </div>
</template>
