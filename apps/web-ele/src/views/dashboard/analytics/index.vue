<script lang="ts" setup>
import { onMounted, ref } from "vue";

import { ElCard, ElProgress, ElTable, ElTableColumn } from "element-plus";

import {
  getChannelsApi,
  getOverviewApi,
  getRechargeTrendApi,
  getUserTrendApi,
  type StatsApi,
} from "#/api/core/stats";

defineOptions({ name: "Analytics" });

const overview = ref<StatsApi.Overview | null>(null);
const userTrend = ref<StatsApi.UserTrendItem[]>([]);
const rechargeTrend = ref<StatsApi.RechargeTrendItem[]>([]);
const channels = ref<StatsApi.ChannelItem[]>([]);

async function loadAll() {
  const [o, u, r, c] = await Promise.all([
    getOverviewApi(),
    getUserTrendApi(7),
    getRechargeTrendApi(7),
    getChannelsApi(),
  ]);
  overview.value = o;
  userTrend.value = u.list || [];
  rechargeTrend.value = r.list || [];
  channels.value = c.list || [];
}

const cards = [
  { key: "total_users", label: "用户总数", unit: "人" },
  { key: "today_new", label: "今日新增", unit: "人" },
  { key: "today_active", label: "今日活跃", unit: "人" },
  { key: "today_paid_amount", label: "今日充值", unit: "元" },
  { key: "total_paid_amount", label: "累计充值", unit: "元" },
  { key: "total_paid_orders", label: "累计单数", unit: "笔" },
] as const;
function ov(k: string) {
  const o = overview.value as any;
  return o ? (o[k] ?? "-") : "-";
}
function fmtDate(d: number) {
  const s = String(d);
  return s.length === 8 ? `${s.slice(4, 6)}-${s.slice(6, 8)}` : s;
}
function maxNew() {
  return Math.max(1, ...userTrend.value.map((x) => x.new_users));
}
function maxAmount() {
  return Math.max(1, ...rechargeTrend.value.map((x) => x.amount));
}

onMounted(loadAll);
</script>

<template>
  <div class="p-5">
    <div class="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <ElCard v-for="c in cards" :key="c.key" shadow="hover">
        <div class="text-muted-foreground text-sm">{{ c.label }}</div>
        <div class="mt-1 text-2xl font-semibold">
          {{ ov(c.key) }}<span class="text-muted-foreground ml-1 text-xs">{{ c.unit }}</span>
        </div>
      </ElCard>
    </div>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ElCard shadow="never">
        <div class="mb-3 font-medium">近7日注册趋势</div>
        <div class="space-y-2">
          <div v-for="d in userTrend" :key="d.date" class="flex items-center gap-3">
            <span class="w-14 text-right text-sm">{{ fmtDate(d.date) }}</span>
            <ElProgress
              :percentage="Math.round((d.new_users / maxNew()) * 100)"
              :stroke-width="14"
              style="flex: 1"
              :format="() => d.new_users + ' 人'"
            />
          </div>
        </div>
      </ElCard>

      <ElCard shadow="never">
        <div class="mb-3 font-medium">近7日充值趋势</div>
        <div class="space-y-2">
          <div v-for="d in rechargeTrend" :key="d.date" class="flex items-center gap-3">
            <span class="w-14 text-right text-sm">{{ fmtDate(d.date) }}</span>
            <ElProgress
              :percentage="Math.round((d.amount / maxAmount()) * 100)"
              :stroke-width="14"
              color="#67c23a"
              style="flex: 1"
              :format="() => d.amount + ' 元 / ' + d.orders + ' 单'"
            />
          </div>
        </div>
      </ElCard>
    </div>

    <ElCard shadow="never" class="mt-4">
      <div class="mb-3 font-medium">渠道分析</div>
      <ElTable :data="channels" border stripe>
        <ElTableColumn prop="channel" label="渠道" min-width="160" />
        <ElTableColumn prop="user_count" label="用户数" width="120" align="right" />
        <ElTableColumn prop="total_recharge" label="累计充值(元)" width="160" align="right" />
      </ElTable>
    </ElCard>
  </div>
</template>
