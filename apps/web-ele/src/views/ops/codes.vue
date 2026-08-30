<script lang="ts" setup>
import { ref } from "vue";

import { ElTabPane, ElTabs } from "element-plus";

import OpsRedeemCode from "#/views/ops/redeemcode.vue";
import PromoManage from "#/views/promo/index.vue";

defineOptions({ name: "OpsCodes" });

const kind = ref("promo");
</script>

<template>
  <div class="p-5">
    <p class="text-muted-foreground mb-3 text-xs">
      推广兑换对应 H5「兑换中心」（批量生成金币/用户组码）；通用兑换是一码多次的单独建码。
    </p>
    <ElTabs v-model="kind" type="border-card">
      <ElTabPane label="推广兑换" name="promo">
        <PromoManage />
      </ElTabPane>
      <ElTabPane label="通用兑换" name="redeem">
        <OpsRedeemCode />
      </ElTabPane>
    </ElTabs>
  </div>
</template>
