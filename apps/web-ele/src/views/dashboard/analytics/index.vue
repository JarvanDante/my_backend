<script lang="ts" setup>
import type { EchartsUIType } from "@vben/plugins/echarts";

import { computed, onMounted, ref, watch } from "vue";

import { EchartsUI, useEcharts } from "@vben/plugins/echarts";

import { ElCard, ElRadioButton, ElRadioGroup, ElTable, ElTableColumn } from "element-plus";

import {
  getBalanceScenesApi,
  getChannelsApi,
  getContentStatsApi,
  getDeviceStatsApi,
  getHourDistApi,
  getOverviewApi,
  getRechargeTrendApi,
  getUserTrendApi,
  type StatsApi,
  type StatsExtApi,
} from "#/api/core/stats";

defineOptions({ name: "Analytics" });

/**
 * 图表配色: 每张图单一系列, 各图取调色板里的一个固定槽位(蓝/绿两色),
 * 双指标(金额+单数)不做双轴 —— 单轴画金额, 单数放 tooltip 里一起看。
 * 文案/轴/网格用中性灰, 颜色只落在数据 mark 上。
 */
const C = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  yellow: "#eda100",
  magenta: "#e87ba4",
  grid: "#e5e7eb",
  axis: "#9ca3af",
};
/** 分类色固定顺序(与 dataviz 调色板槽位一致), 饼图/玫瑰图按此顺序取色, 不循环生成 */
const PALETTE = [C.blue, C.orange, C.aqua, C.yellow, C.magenta];

// ---------------- KPI 概览 ----------------
const overview = ref<StatsApi.Overview | null>(null);

/** 今日 vs 昨日的变化标记(涨/平/跌), 让"今天怎么样"一眼可读 */
function delta(today: number, yest: number) {
  if (yest === 0) return today > 0 ? { text: "昨日 0", up: true } : null;
  const pct = Math.round(((today - yest) / yest) * 100);
  return { text: `较昨日 ${pct > 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
}
const cards = computed(() => {
  const o = overview.value;
  if (!o) return [];
  return [
    { label: "用户总数", value: o.total_users, unit: "人" },
    { label: "今日新增", value: o.today_new, unit: "人", d: delta(o.today_new, o.yesterday_new) },
    { label: "今日活跃", value: o.today_active, unit: "人" },
    {
      label: "今日充值",
      value: o.today_paid_amount.toFixed(2),
      unit: "元",
      d: delta(o.today_paid_amount, o.yest_paid_amount),
      sub: `今日 ${o.today_paid_orders} 单`,
    },
    { label: "累计充值", value: o.total_paid_amount.toFixed(2), unit: "元" },
    { label: "累计订单", value: o.total_paid_orders, unit: "笔" },
  ];
});

// ---------------- 趋势(注册/充值), 一个时间范围同时控制两张图 ----------------
const days = ref(7);
const userTrend = ref<StatsApi.UserTrendItem[]>([]);
const rechargeTrend = ref<StatsApi.RechargeTrendItem[]>([]);

const userRef = ref<EchartsUIType>();
const rechargeRef = ref<EchartsUIType>();
const { renderEcharts: renderUser } = useEcharts(userRef);
const { renderEcharts: renderRecharge } = useEcharts(rechargeRef);

function fmtDate(d: number) {
  const s = String(d);
  return s.length === 8 ? `${s.slice(4, 6)}-${s.slice(6, 8)}` : s;
}

/** 折线图公共骨架: 细线(2px)、隐轴刻度、浅网格、axis tooltip */
function lineBase(dates: string[]) {
  return {
    grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
    tooltip: { trigger: "axis" as const },
    xAxis: {
      type: "category" as const,
      data: dates,
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: C.grid } },
      axisLabel: { color: C.axis },
    },
    yAxis: {
      type: "value" as const,
      minInterval: 1,
      splitLine: { lineStyle: { color: C.grid } },
      axisLabel: { color: C.axis },
    },
  };
}

function drawUserTrend() {
  const list = userTrend.value;
  renderUser({
    ...lineBase(list.map((x) => fmtDate(x.date))),
    series: [
      {
        name: "注册人数",
        type: "line",
        data: list.map((x) => x.new_users),
        smooth: true,
        symbolSize: 7,
        lineStyle: { width: 2, color: C.blue },
        itemStyle: { color: C.blue },
        areaStyle: { opacity: 0.08, color: C.blue },
      },
    ],
  });
}

function drawRechargeTrend() {
  const list = rechargeTrend.value;
  renderRecharge({
    ...lineBase(list.map((x) => fmtDate(x.date))),
    tooltip: {
      trigger: "axis",
      // 金额与单数量纲不同, 不上第二根轴 —— 单数进 tooltip 一并展示
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        const row = list[p.dataIndex];
        return `${p.axisValue}<br/>充值金额: ${row ? row.amount.toFixed(2) : "-"} 元<br/>订单数: ${row ? row.orders : "-"} 单`;
      },
    },
    series: [
      {
        name: "充值金额",
        type: "line",
        data: list.map((x) => x.amount),
        smooth: true,
        symbolSize: 7,
        lineStyle: { width: 2, color: C.aqua },
        itemStyle: { color: C.aqua },
        areaStyle: { opacity: 0.08, color: C.aqua },
      },
    ],
  });
}

async function loadTrends() {
  const [u, r] = await Promise.all([getUserTrendApi(days.value), getRechargeTrendApi(days.value)]);
  userTrend.value = u.list || [];
  rechargeTrend.value = r.list || [];
  drawUserTrend();
  drawRechargeTrend();
}
watch(days, loadTrends);

// ---------------- 渠道分布 ----------------
const channels = ref<StatsApi.ChannelItem[]>([]);
const chUserRef = ref<EchartsUIType>();
const chPayRef = ref<EchartsUIType>();
const { renderEcharts: renderChUser } = useEcharts(chUserRef);
const { renderEcharts: renderChPay } = useEcharts(chPayRef);

/** 渠道横向条形图: 单指标单色, 按值降序取前 10, 其余合并为"其他" */
function drawChannelBar(
  render: (o: any) => void,
  metric: (c: StatsApi.ChannelItem) => number,
  color: string,
  unit: string,
) {
  const sorted = [...channels.value].sort((a, b) => metric(b) - metric(a));
  const top = sorted.slice(0, 10);
  const rest = sorted.slice(10);
  const rows = [...top];
  if (rest.length > 0) {
    rows.push({
      channel: `其他(${rest.length})`,
      user_count: rest.reduce((s, c) => s + c.user_count, 0),
      total_recharge: rest.reduce((s, c) => s + c.total_recharge, 0),
    });
  }
  rows.reverse(); // 横向条形图 y 轴从下往上, 反转让最大值在最上面
  render({
    grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v: number) => `${v} ${unit}`,
    },
    xAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: C.grid } },
      axisLabel: { color: C.axis },
    },
    yAxis: {
      type: "category",
      data: rows.map((c) => c.channel),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: C.grid } },
      axisLabel: { color: C.axis },
    },
    series: [
      {
        type: "bar",
        data: rows.map(metric),
        barMaxWidth: 18,
        itemStyle: { color, borderRadius: [0, 4, 4, 0] }, // 数据端 4px 圆角, 基线端直角
        label: { show: true, position: "right", color: "#6b7280" },
      },
    ],
  });
}

async function loadChannels() {
  channels.value = (await getChannelsApi()).list || [];
  drawChannelBar(renderChUser, (c) => c.user_count, C.blue, "人");
  drawChannelBar(renderChPay, (c) => c.total_recharge, C.aqua, "元");
}

// ---------------- 扩展维度: 时段/设备/内容/金币构成 ----------------
const hourRef = ref<EchartsUIType>();
const deviceRef = ref<EchartsUIType>();
const contentRef = ref<EchartsUIType>();
const buyShareRef = ref<EchartsUIType>();
const sceneRef = ref<EchartsUIType>();
const { renderEcharts: renderHour } = useEcharts(hourRef);
const { renderEcharts: renderDevice } = useEcharts(deviceRef);
const { renderEcharts: renderContent } = useEcharts(contentRef);
const { renderEcharts: renderBuyShare } = useEcharts(buyShareRef);
const { renderEcharts: renderScene } = useEcharts(sceneRef);

const contentStats = ref<StatsExtApi.ContentStatItem[]>([]);

/** 时段分布: 注册/支付都是"次数", 同轴双系列柱状图成立(近30天) */
async function loadHourDist() {
  const list = (await getHourDistApi(30)).list || [];
  renderHour({
    grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { top: 0, textStyle: { color: "#6b7280" } },
    xAxis: {
      type: "category",
      data: list.map((x) => `${x.hour}时`),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: C.grid } },
      axisLabel: { color: C.axis, interval: 1 },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: C.grid } },
      axisLabel: { color: C.axis },
    },
    series: [
      {
        name: "注册",
        type: "bar",
        data: list.map((x) => x.registers),
        barMaxWidth: 10,
        itemStyle: { color: C.blue, borderRadius: [3, 3, 0, 0] },
      },
      {
        name: "支付订单",
        type: "bar",
        data: list.map((x) => x.orders),
        barMaxWidth: 10,
        itemStyle: { color: C.orange, borderRadius: [3, 3, 0, 0] },
      },
    ],
  });
}

/** 设备分布: 份额型数据用环形图, 类别少(ios/android/h5)不会挤 */
async function loadDevices() {
  const list = (await getDeviceStatsApi()).list || [];
  renderDevice({
    tooltip: { trigger: "item", valueFormatter: (v: number) => `${v} 人` },
    legend: { bottom: 0, textStyle: { color: "#6b7280" } },
    series: [
      {
        name: "设备分布",
        type: "pie",
        radius: ["42%", "68%"],
        center: ["50%", "45%"],
        itemStyle: { borderColor: "#fff", borderWidth: 2 },
        label: { formatter: "{b}: {d}%", color: "#6b7280" },
        data: list.map((x, i) => ({
          name: x.device_type,
          value: x.count,
          itemStyle: { color: PALETTE[i % PALETTE.length] },
        })),
      },
    ],
  });
}

/** 内容库: 每类内容的 上架/待审/下架 堆叠条形图; 观看/购买放 tooltip */
function drawContentStack() {
  const list = contentStats.value;
  const mk = (name: string, key: "online" | "pending" | "offline", color: string) => ({
    name,
    type: "bar" as const,
    stack: "total",
    data: list.map((x) => x[key]),
    barMaxWidth: 18,
    itemStyle: { color, borderColor: "#fff", borderWidth: 1 },
  });
  renderContent({
    grid: { left: 8, right: 32, top: 36, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const idx = (Array.isArray(params) ? params[0] : params).dataIndex;
        const r = list[idx];
        if (!r) return "";
        return (
          `${r.type_name}<br/>已上架 ${r.online} · 待审 ${r.pending} · 下架 ${r.offline}` +
          `<br/>累计观看 ${r.views} · 购买 ${r.buys} 件 / ${r.buy_amount.toFixed(2)} 金币`
        );
      },
    },
    legend: { top: 0, textStyle: { color: "#6b7280" } },
    xAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: C.grid } },
      axisLabel: { color: C.axis },
    },
    yAxis: {
      type: "category",
      data: list.map((x) => x.type_name),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: C.grid } },
      axisLabel: { color: C.axis },
    },
    series: [
      mk("已上架", "online", C.aqua),
      mk("待审", "pending", C.yellow),
      mk("下架/拒绝", "offline", C.magenta),
    ],
  });
}

/** 内容购买金额占比: 玫瑰图(半径编码数值, 占比小时也看得见类别) */
function drawBuyShare() {
  const rows = contentStats.value.filter((x) => x.buy_amount > 0);
  renderBuyShare({
    tooltip: {
      trigger: "item",
      formatter: (p: any) => `${p.name}<br/>${Number(p.value).toFixed(2)} 金币 (${p.percent}%)`,
    },
    legend: { bottom: 0, textStyle: { color: "#6b7280" } },
    series: [
      {
        name: "购买金额",
        type: "pie",
        roseType: "radius",
        radius: ["18%", "68%"],
        center: ["50%", "45%"],
        itemStyle: { borderColor: "#fff", borderWidth: 2, borderRadius: 4 },
        label: { formatter: "{b}: {d}%", color: "#6b7280" },
        data: rows.map((x, i) => ({
          name: x.type_name,
          value: x.buy_amount,
          itemStyle: { color: PALETTE[i % PALETTE.length] },
        })),
      },
    ],
  });
}

async function loadContentStats() {
  contentStats.value = (await getContentStatsApi()).list || [];
  drawContentStack();
  drawBuyShare();
}

/** 金币场景中文名(与 shared/balance 的 scene 常量对应) */
const SCENE_NAMES: Record<string, string> = {
  withdraw_freeze: "提现冻结",
  withdraw_refund: "提现退款",
  admin_adjust: "人工调账",
  admin_balance: "人工调账(旧)",
  content_buy: "内容购买",
  lottery_cost: "抽奖消耗",
  lottery_prize: "抽奖奖励",
  ai_cost: "AI扣费",
  ai_refund: "AI退款",
  redeem_goods: "商品兑换",
  redeem_code: "兑换码",
  checkin: "签到奖励",
  task: "任务奖励",
};

/** 金币收支构成: 收入/支出同为金币, 双系列横向条形图(近30天, 场景取TOP8) */
async function loadBalanceScenes() {
  const list = ((await getBalanceScenesApi(30)).list || []).slice(0, 8).reverse();
  renderScene({
    grid: { left: 8, right: 48, top: 36, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v: number) => `${Number(v).toFixed(2)} 金币`,
    },
    legend: { top: 0, textStyle: { color: "#6b7280" } },
    xAxis: {
      type: "value",
      splitLine: { lineStyle: { color: C.grid } },
      axisLabel: { color: C.axis },
    },
    yAxis: {
      type: "category",
      data: list.map((x) => SCENE_NAMES[x.scene] ?? x.scene),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: C.grid } },
      axisLabel: { color: C.axis },
    },
    series: [
      {
        name: "收入",
        type: "bar",
        data: list.map((x) => x.income),
        barMaxWidth: 12,
        itemStyle: { color: C.aqua, borderRadius: [0, 4, 4, 0] },
      },
      {
        name: "支出",
        type: "bar",
        data: list.map((x) => x.expense),
        barMaxWidth: 12,
        itemStyle: { color: C.orange, borderRadius: [0, 4, 4, 0] },
      },
    ],
  });
}

onMounted(async () => {
  overview.value = await getOverviewApi();
  await loadTrends();
  await loadChannels();
  // 扩展维度并行加载, 单个失败不拖垮整页
  await Promise.allSettled([loadHourDist(), loadDevices(), loadContentStats(), loadBalanceScenes()]);
});
</script>

<template>
  <div class="p-5">
    <!-- KPI 概览 -->
    <div class="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <ElCard v-for="c in cards" :key="c.label" shadow="hover">
        <div class="text-muted-foreground text-sm">{{ c.label }}</div>
        <div class="mt-1 text-2xl font-semibold">
          {{ c.value }}<span class="text-muted-foreground ml-1 text-xs">{{ c.unit }}</span>
        </div>
        <div class="mt-1 h-4 text-xs">
          <span v-if="c.d" :class="c.d.up ? 'text-emerald-600' : 'text-red-500'">
            {{ c.d.up ? "▲" : "▼" }} {{ c.d.text }}
          </span>
          <span v-else-if="c.sub" class="text-muted-foreground">{{ c.sub }}</span>
        </div>
      </ElCard>
    </div>

    <!-- 时间范围: 一行筛选, 同时控制两张趋势图 -->
    <div class="mb-3 flex items-center">
      <span class="text-muted-foreground mr-3 text-sm">时间范围</span>
      <ElRadioGroup v-model="days" size="small">
        <ElRadioButton :value="7">近7天</ElRadioButton>
        <ElRadioButton :value="30">近30天</ElRadioButton>
        <ElRadioButton :value="90">近90天</ElRadioButton>
      </ElRadioGroup>
    </div>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ElCard shadow="never">
        <div class="mb-2 font-medium">注册趋势</div>
        <EchartsUI ref="userRef" height="280px" />
      </ElCard>
      <ElCard shadow="never">
        <div class="mb-2 font-medium">充值金额趋势</div>
        <EchartsUI ref="rechargeRef" height="280px" />
      </ElCard>
    </div>

    <!-- 渠道分布: 用户数与充值额量纲不同, 拆成两张单指标条形图 -->
    <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ElCard shadow="never">
        <div class="mb-2 font-medium">渠道用户数 TOP10</div>
        <EchartsUI ref="chUserRef" height="300px" />
      </ElCard>
      <ElCard shadow="never">
        <div class="mb-2 font-medium">渠道充值金额 TOP10</div>
        <EchartsUI ref="chPayRef" height="300px" />
      </ElCard>
    </div>

    <!-- 时段 + 设备 -->
    <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
      <ElCard shadow="never" class="xl:col-span-2">
        <div class="mb-2 font-medium">时段分布(近30天, 注册/支付按小时)</div>
        <EchartsUI ref="hourRef" height="300px" />
      </ElCard>
      <ElCard shadow="never">
        <div class="mb-2 font-medium">设备分布</div>
        <EchartsUI ref="deviceRef" height="300px" />
      </ElCard>
    </div>

    <!-- 内容库 + 购买占比 -->
    <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
      <ElCard shadow="never" class="xl:col-span-2">
        <div class="mb-2 font-medium">内容库概览(按审核状态)</div>
        <EchartsUI ref="contentRef" height="300px" />
      </ElCard>
      <ElCard shadow="never">
        <div class="mb-2 font-medium">内容购买金额占比</div>
        <EchartsUI ref="buyShareRef" height="300px" />
      </ElCard>
    </div>

    <!-- 金币流水构成 -->
    <ElCard shadow="never" class="mt-4">
      <div class="mb-2 font-medium">金币收支构成(近30天, 按场景 TOP8)</div>
      <EchartsUI ref="sceneRef" height="320px" />
    </ElCard>

    <!-- 明细表: 图表的可访问性兜底, 也方便复制数值 -->
    <ElCard shadow="never" class="mt-4">
      <div class="mb-3 font-medium">渠道明细</div>
      <ElTable :data="channels" border stripe size="small" max-height="320">
        <ElTableColumn prop="channel" label="渠道" min-width="160" />
        <ElTableColumn prop="user_count" label="用户数" width="120" align="right" />
        <ElTableColumn label="累计充值(元)" width="160" align="right">
          <template #default="{ row }">{{ row.total_recharge.toFixed(2) }}</template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>
