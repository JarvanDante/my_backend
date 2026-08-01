<script lang="ts" setup>
import type { EchartsUIType } from "@vben/plugins/echarts";

import { computed, onMounted, reactive, ref } from "vue";
import {
  ElButton,
  ElButtonGroup,
  ElCard,
  ElDatePicker,
  ElEmpty,
  ElMessage,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTooltip,
} from "element-plus";
import { EchartsUI, useEcharts } from "@vben/plugins/echarts";
import {
  SvgBellIcon,
  SvgCardIcon,
  SvgDownloadIcon,
} from "@vben/icons";

import { getCustomerListApi, type CustomerApi } from "#/api/core/customer";
import { getSiteOptionsApi, type DomainApi } from "#/api/core/domain";
import { getGlobalReportApi, type OperationsApi } from "#/api/core/operations";

interface SiteMeta {
  site_code: string;
  site_name: string;
  customer_name: string;
  site_id?: number;
  customer_status?: number;
}

type ReportLoadStatus = "error" | "skipped" | "success";

interface SiteReportRow extends OperationsApi.GlobalReportData {
  site_code: string;
  site_name: string;
  customer_name: string;
  site_id?: number;
  customer_status?: number;
  load_status: ReportLoadStatus;
  load_message: string;
}

interface MainMetricCard {
  title: string;
  value: string;
  icon_theme: string;
  iconComponent?: unknown;
  iconText?: string;
  danger?: boolean;
  success?: boolean;
}

const loading = ref(false);
const initialized = ref(false);
const trendLoading = ref(false);

const siteList = ref<SiteMeta[]>([]);
const reportRows = ref<SiteReportRow[]>([]);
const trendChartRef = ref<EchartsUIType>();
const registerChartRef = ref<EchartsUIType>();
const trendBucketCount = ref(0);
const { renderEcharts: renderTrendEcharts } = useEcharts(trendChartRef);
const { renderEcharts: renderRegisterEcharts } = useEcharts(registerChartRef);

const searchForm = reactive({
  site_code: "",
  date_range: [] as string[],
});

const pagination = reactive({
  page: 1,
  size: 20,
  total: 0,
});

function toNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function padZero(value: number) {
  return value.toString().padStart(2, "0");
}

function formatDateTime(value: Date) {
  const year = value.getFullYear();
  const month = padZero(value.getMonth() + 1);
  const day = padZero(value.getDate());
  const hour = padZero(value.getHours());
  const minute = padZero(value.getMinutes());
  const second = padZero(value.getSeconds());
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function getDateRange(days: number) {
  const end = new Date();
  end.setHours(23, 59, 59, 0);
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return [formatDateTime(start), formatDateTime(end)];
}

function resetDefaultDateRange() {
  searchForm.date_range = getDateRange(1);
}

function createEmptyReport(): OperationsApi.GlobalReportData {
  return {
    new_register_users: 0,
    recharge_users: 0,
    first_deposit_users: 0,
    first_deposit_amount: 0,
    valid_bet_amount: 0,
    net_amount: 0,
    deposit_total: 0,
    withdraw_total: 0,
    bonus_total: 0,
    rebate_total: 0,
    deposit_success_orders: 0,
    deposit_orders: 0,
    deposit_success_rate: 0,
  };
}

function normalizeReport(data?: Partial<OperationsApi.GlobalReportData>) {
  const fallback = createEmptyReport();
  if (!data) {
    return fallback;
  }
  return {
    new_register_users: toNumber(data.new_register_users),
    recharge_users: toNumber(data.recharge_users),
    first_deposit_users: toNumber(data.first_deposit_users),
    first_deposit_amount: toNumber(data.first_deposit_amount),
    valid_bet_amount: toNumber(data.valid_bet_amount),
    net_amount: toNumber(data.net_amount),
    deposit_total: toNumber(data.deposit_total),
    withdraw_total: toNumber(data.withdraw_total),
    bonus_total: toNumber(data.bonus_total),
    rebate_total: toNumber(data.rebate_total),
    deposit_success_orders: toNumber(data.deposit_success_orders),
    deposit_orders: toNumber(data.deposit_orders),
    deposit_success_rate: toNumber(data.deposit_success_rate),
  };
}

function formatAmount(value: number) {
  return toNumber(value).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCount(value: number) {
  return toNumber(value).toLocaleString("zh-CN");
}

function formatRate(value: number) {
  return `${toNumber(value).toFixed(2)}%`;
}

function parseDateTimeString(value: string) {
  const [datePart = "", timePart = "00:00:00"] = value.split(" ");
  const [year = 0, month = 1, day = 1] = datePart
    .split("-")
    .map((item) => Number(item));
  const [hour = 0, minute = 0, second = 0] = timePart
    .split(":")
    .map((item) => Number(item));
  return new Date(year, month - 1, day, hour, minute, second);
}

function addDays(date: Date, days: number) {
  const target = new Date(date);
  target.setDate(target.getDate() + days);
  return target;
}

function startOfDay(date: Date) {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return target;
}

function endOfDay(date: Date) {
  const target = new Date(date);
  target.setHours(23, 59, 59, 0);
  return target;
}

function formatDayLabel(date: Date) {
  return `${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
}

function getCustomerStatusText(status?: number) {
  if (status === 1) return "启用";
  if (status === 0) return "禁用";
  return "未知";
}

function getCustomerStatusTagType(status?: number) {
  if (status === 1) return "success";
  if (status === 0) return "danger";
  return "info";
}

function getReportStatusTagType(status: ReportLoadStatus) {
  if (status === "success") return "success";
  if (status === "error") return "danger";
  return "warning";
}

function getReportStatusText(status: ReportLoadStatus) {
  if (status === "success") return "成功";
  if (status === "error") return "失败";
  return "未配置";
}

function getErrorMessage(error: unknown) {
  const err = error as {
    message?: string;
    response?: { data?: { msg?: string; message?: string } };
  };

  return (
    err?.response?.data?.msg ||
    err?.response?.data?.message ||
    err?.message ||
    "请求失败"
  );
}

async function fetchAllCustomers() {
  const size = 200;
  let page = 1;
  const list: CustomerApi.CustomerItem[] = [];
  const maxPages = 100;

  while (page <= maxPages) {
    const response = await getCustomerListApi({ page, size });
    const currentPageList = response.list || [];
    list.push(...currentPageList);

    if (currentPageList.length < size) {
      break;
    }
    page += 1;
  }

  return list;
}

function buildSiteList(
  siteOptions: DomainApi.OptionItem[],
  customers: CustomerApi.CustomerItem[],
) {
  const customerMap = new Map<string, CustomerApi.CustomerItem>();
  customers.forEach((customer) => {
    customerMap.set(customer.code, customer);
  });

  const mergedMap = new Map<string, SiteMeta>();

  siteOptions.forEach((site) => {
    const siteCode = String(site.value || "").trim();
    if (!siteCode) {
      return;
    }
    const customer = customerMap.get(siteCode);
    mergedMap.set(siteCode, {
      site_code: siteCode,
      site_name: String(site.label || customer?.name || siteCode),
      customer_name: customer?.name || "-",
      site_id: customer?.id,
      customer_status: customer?.status,
    });
  });

  customers.forEach((customer) => {
    if (mergedMap.has(customer.code)) {
      return;
    }

    mergedMap.set(customer.code, {
      site_code: customer.code,
      site_name: customer.name || customer.code,
      customer_name: customer.name || "-",
      site_id: customer.id,
      customer_status: customer.status,
    });
  });

  return Array.from(mergedMap.values()).sort((a, b) =>
    a.site_code.localeCompare(b.site_code),
  );
}

async function loadSiteData() {
  try {
    const [siteOptionsResponse, customers] = await Promise.all([
      getSiteOptionsApi(),
      fetchAllCustomers(),
    ]);

    const siteOptions = siteOptionsResponse.list || [];
    siteList.value = buildSiteList(siteOptions, customers);
  } catch (error) {
    console.error("加载站点数据失败:", error);
    ElMessage.error("加载站点列表失败");
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
) {
  if (items.length === 0) {
    return [] as R[];
  }

  const safeLimit = Math.max(1, Math.min(limit, items.length));
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: safeLimit }, async () => {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await task(items[current]);
    }
  });

  await Promise.all(workers);
  return results;
}

async function fetchSiteReport(
  site: SiteMeta,
  startTime: string,
  endTime: string,
) {
  if (!site.site_id) {
    return {
      ...site,
      ...createEmptyReport(),
      load_status: "skipped" as const,
      load_message: "站点缺少ID映射，无法查询",
    };
  }

  try {
    const data = await getGlobalReportApi({
      site_id: site.site_id,
      start_time: startTime,
      end_time: endTime,
    });

    const report = normalizeReport(data);
    return {
      ...site,
      ...report,
      load_status: "success" as const,
      load_message: "查询成功",
    };
  } catch (error) {
    return {
      ...site,
      ...createEmptyReport(),
      load_status: "error" as const,
      load_message: getErrorMessage(error),
    };
  }
}

const selectedSites = computed(() => {
  if (!searchForm.site_code) {
    return siteList.value;
  }
  return siteList.value.filter((site) => site.site_code === searchForm.site_code);
});

const selectedSiteForTrend = computed(
  () =>
    siteList.value.find((site) => site.site_code === searchForm.site_code) ||
    null,
);

const trendSubtitle = computed(() => {
  if (!searchForm.site_code) {
    return "请选择站点后查看趋势";
  }
  const selected = selectedSiteForTrend.value;
  if (!selected?.site_id) {
    return "当前站点缺少ID映射，无法展示趋势";
  }
  return `${selected.site_name}（${selected.site_code}） · ${trendBucketCount.value} 个区间`;
});

const pagedRows = computed(() => {
  const start = (pagination.page - 1) * pagination.size;
  const end = start + pagination.size;
  return reportRows.value.slice(start, end);
});

const successfulRows = computed(() =>
  reportRows.value.filter((row) => row.load_status === "success"),
);

const overview = computed(() => {
  const result = createEmptyReport();

  successfulRows.value.forEach((row) => {
    result.recharge_users += row.recharge_users;
    result.first_deposit_users += row.first_deposit_users;
    result.first_deposit_amount += row.first_deposit_amount;
    result.valid_bet_amount += row.valid_bet_amount;
    result.net_amount += row.net_amount;
    result.deposit_total += row.deposit_total;
    result.withdraw_total += row.withdraw_total;
    result.bonus_total += row.bonus_total;
    result.rebate_total += row.rebate_total;
    result.deposit_success_orders += row.deposit_success_orders;
    result.deposit_orders += row.deposit_orders;
  });

  result.deposit_success_rate =
    result.deposit_orders > 0
      ? (result.deposit_success_orders / result.deposit_orders) * 100
      : 0;

  return result;
});

const mainMetricCards = computed<MainMetricCard[]>(() => [
  {
    title: "充值总额",
    value: `${formatAmount(overview.value.deposit_total)} 元`,
    iconText: "💰",
    iconComponent: undefined,
    icon_theme: "money",
  },
  {
    title: "提现总额",
    value: `${formatAmount(overview.value.withdraw_total)} 元`,
    iconComponent: SvgCardIcon,
    iconText: "",
    icon_theme: "blue",
  },
  {
    title: "有效投注",
    value: `${formatAmount(overview.value.valid_bet_amount)} 元`,
    iconComponent: SvgDownloadIcon,
    iconText: "",
    icon_theme: "green",
  },
  {
    title: "输赢",
    value: `${formatAmount(overview.value.net_amount)} 元`,
    iconComponent: SvgBellIcon,
    iconText: "",
    icon_theme: "amber",
    danger: overview.value.net_amount < 0,
    success: overview.value.net_amount > 0,
  },
]);

const subMetricCards = computed(() => [
  {
    title: "充值会员数",
    value: `${formatCount(overview.value.recharge_users)} 人`,
  },
  {
    title: "首存用户数",
    value: `${formatCount(overview.value.first_deposit_users)} 人`,
  },
  {
    title: "首存总额",
    value: `${formatAmount(overview.value.first_deposit_amount)} 元`,
  },
  {
    title: "红利",
    value: `${formatAmount(overview.value.bonus_total)} 元`,
  },
  {
    title: "返水",
    value: `${formatAmount(overview.value.rebate_total)} 元`,
  },
  {
    title: "成功充值订单",
    value: `${formatCount(overview.value.deposit_success_orders)} 笔`,
  },
  {
    title: "充值订单数",
    value: `${formatCount(overview.value.deposit_orders)} 笔`,
  },
  {
    title: "充值成功率",
    value: formatRate(overview.value.deposit_success_rate),
  },
]);

function buildTrendBuckets(startTime: string, endTime: string) {
  const start = parseDateTimeString(startTime);
  const end = parseDateTimeString(endTime);
  const startDay = startOfDay(start);
  const endDay = startOfDay(end);
  const totalDays =
    Math.floor((endDay.getTime() - startDay.getTime()) / 86_400_000) + 1;
  const maxPoints = 30;
  const step = Math.max(1, Math.ceil(totalDays / maxPoints));

  const buckets: Array<{
    label: string;
    start_time: string;
    end_time: string;
  }> = [];

  for (let index = 0; index < totalDays; index += step) {
    const bucketStartDate = addDays(startDay, index);
    const bucketEndDate = addDays(
      startDay,
      Math.min(totalDays - 1, index + step - 1),
    );
    const label =
      step === 1
        ? formatDayLabel(bucketStartDate)
        : `${formatDayLabel(bucketStartDate)}~${formatDayLabel(bucketEndDate)}`;
    buckets.push({
      label,
      start_time: formatDateTime(startOfDay(bucketStartDate)),
      end_time: formatDateTime(endOfDay(bucketEndDate)),
    });
  }

  return buckets;
}

async function renderEmptyTrend(message: string) {
  trendBucketCount.value = 0;
  await renderTrendEcharts({
    animation: false,
    title: {
      left: "center",
      text: message,
      textStyle: {
        color: "#94a3b8",
        fontSize: 13,
        fontWeight: "normal",
      },
      top: "center",
    },
    xAxis: {
      data: [],
      type: "category",
    },
    yAxis: {
      type: "value",
    },
  });
}

async function renderEmptyRegisterChart(message: string) {
  await renderRegisterEcharts({
    animation: false,
    title: {
      left: "center",
      text: message,
      textStyle: {
        color: "#94a3b8",
        fontSize: 13,
        fontWeight: "normal",
      },
      top: "center",
    },
    xAxis: {
      data: [],
      type: "category",
    },
    yAxis: {
      type: "value",
    },
  });
}

async function loadTrendChart() {
  if (searchForm.date_range.length !== 2) {
    await renderEmptyTrend("请选择统计时间范围");
    await renderEmptyRegisterChart("请选择统计时间范围");
    return;
  }

  if (!searchForm.site_code) {
    await renderEmptyTrend("请选择站点后查看趋势");
    await renderEmptyRegisterChart("请选择站点后查看趋势");
    return;
  }

  const selected = selectedSiteForTrend.value;
  if (!selected?.site_id) {
    await renderEmptyTrend("当前站点缺少ID映射，无法展示趋势");
    await renderEmptyRegisterChart("当前站点缺少ID映射，无法展示趋势");
    return;
  }

  const [startTime, endTime] = searchForm.date_range;
  const buckets = buildTrendBuckets(startTime, endTime);
  trendBucketCount.value = buckets.length;

  trendLoading.value = true;
  try {
    const bucketData = await runWithConcurrency(buckets, 4, async (bucket) => {
      try {
        const data = await getGlobalReportApi({
          site_id: selected.site_id as number,
          start_time: bucket.start_time,
          end_time: bucket.end_time,
        });
        return {
          label: bucket.label,
          report: normalizeReport(data),
        };
      } catch {
        return {
          label: bucket.label,
          report: createEmptyReport(),
        };
      }
    });

    const xAxisData = bucketData.map((item) => item.label);
    const depositSeries = bucketData.map((item) => item.report.deposit_total);
    const withdrawSeries = bucketData.map((item) => item.report.withdraw_total);
    const betSeries = bucketData.map((item) => item.report.valid_bet_amount);
    const netSeries = bucketData.map((item) => item.report.net_amount);
    const registerSeries = bucketData.map(
      (item) => item.report.new_register_users,
    );

    await renderTrendEcharts({
      grid: {
        bottom: 10,
        containLabel: true,
        left: "2%",
        right: "2%",
        top: 40,
      },
      legend: {
        data: ["充值总额", "提现总额", "有效投注", "输赢"],
        top: 4,
      },
      series: [
        {
          areaStyle: {
            opacity: 0.08,
          },
          data: depositSeries,
          itemStyle: {
            color: "#4f7df3",
          },
          name: "充值总额",
          smooth: true,
          type: "line",
        },
        {
          areaStyle: {
            opacity: 0.06,
          },
          data: withdrawSeries,
          itemStyle: {
            color: "#ef4444",
          },
          name: "提现总额",
          smooth: true,
          type: "line",
        },
        {
          areaStyle: {
            opacity: 0.06,
          },
          data: betSeries,
          itemStyle: {
            color: "#22c55e",
          },
          name: "有效投注",
          smooth: true,
          type: "line",
        },
        {
          data: netSeries,
          itemStyle: {
            color: "#f59e0b",
          },
          name: "输赢",
          smooth: true,
          type: "line",
        },
      ],
      tooltip: {
        trigger: "axis",
      },
      xAxis: {
        axisTick: {
          show: false,
        },
        boundaryGap: false,
        data: xAxisData,
        type: "category",
      },
      yAxis: {
        splitLine: {
          lineStyle: {
            type: "dashed",
          },
          show: true,
        },
        type: "value",
      },
    });

    await renderRegisterEcharts({
      grid: {
        bottom: 12,
        containLabel: true,
        left: "2%",
        right: "2%",
        top: 36,
      },
      legend: {
        data: ["新注册会员"],
        top: 4,
      },
      series: [
        {
          barMaxWidth: 26,
          data: registerSeries,
          itemStyle: {
            borderRadius: [8, 8, 2, 2],
            color: {
              colorStops: [
                {
                  color: "rgba(99,102,241,0.95)",
                  offset: 0,
                },
                {
                  color: "rgba(79,70,229,0.75)",
                  offset: 1,
                },
              ],
              type: "linear",
              x: 0,
              x2: 0,
              y: 0,
              y2: 1,
            },
          },
          name: "新注册会员",
          type: "bar",
        },
      ],
      tooltip: {
        axisPointer: {
          type: "shadow",
        },
        trigger: "axis",
      },
      xAxis: {
        axisTick: {
          show: false,
        },
        data: xAxisData,
        type: "category",
      },
      yAxis: {
        minInterval: 1,
        splitLine: {
          lineStyle: {
            type: "dashed",
          },
          show: true,
        },
        type: "value",
      },
    });
  } finally {
    trendLoading.value = false;
  }
}

async function loadReports() {
  if (searchForm.date_range.length !== 2) {
    ElMessage.warning("请选择完整的统计时间范围");
    void loadTrendChart();
    return;
  }

  const sites = selectedSites.value;
  if (sites.length === 0) {
    reportRows.value = [];
    pagination.total = 0;
    initialized.value = true;
    void loadTrendChart();
    return;
  }

  loading.value = true;
  try {
    const [startTime, endTime] = searchForm.date_range;
    const rows = await runWithConcurrency(sites, 6, (site) =>
      fetchSiteReport(site, startTime, endTime),
    );

    reportRows.value = rows;
    pagination.total = rows.length;
    if ((pagination.page - 1) * pagination.size >= rows.length) {
      pagination.page = 1;
    }
    initialized.value = true;
    void loadTrendChart();
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  loadReports();
}

function handleReset() {
  searchForm.site_code = "";
  resetDefaultDateRange();
  pagination.page = 1;
  loadReports();
}

function handleQuickRange(days: number) {
  searchForm.date_range = getDateRange(days);
  pagination.page = 1;
  loadReports();
}

function handleCurrentChange(page: number) {
  pagination.page = page;
}

function handleSizeChange(size: number) {
  pagination.size = size;
  pagination.page = 1;
}

onMounted(async () => {
  resetDefaultDateRange();
  await loadSiteData();
  await loadReports();
});
</script>

<template>
  <div class="operations-page p-4">
    <ElCard class="query-card" shadow="never">
      <div class="query-header">
        <div>
          <div class="query-title">站点全局报表</div>
          <div class="query-subtitle">按站点快速查看充值、提现、投注和输赢关键指标</div>
        </div>
      </div>

      <div class="query-row">
        <div class="query-item">
          <span class="query-label">站点</span>
          <ElSelect
            v-model="searchForm.site_code"
            placeholder="全部站点"
            clearable
            filterable
            style="width: 260px"
          >
            <ElOption
              v-for="site in siteList"
              :key="site.site_code"
              :label="`${site.site_name} (${site.site_code})`"
              :value="site.site_code"
            />
          </ElSelect>
        </div>

        <div class="query-item">
          <span class="query-label">统计时间</span>
          <ElDatePicker
            v-model="searchForm.date_range"
            type="datetimerange"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm:ss"
            style="width: 380px"
          />
        </div>

        <div class="query-item ml-auto">
          <ElButtonGroup>
            <ElButton @click="handleQuickRange(1)">今天</ElButton>
            <ElButton @click="handleQuickRange(7)">近7天</ElButton>
            <ElButton @click="handleQuickRange(30)">近30天</ElButton>
          </ElButtonGroup>
        </div>

        <div class="query-item">
          <ElButton type="primary" @click="handleSearch">查询</ElButton>
          <ElButton @click="handleReset">重置</ElButton>
        </div>
      </div>
    </ElCard>

    <ElCard class="summary-card mt-4" shadow="never">
      <div class="summary-meta">
        <span>
          覆盖站点
          <b>{{ successfulRows.length }}</b>
          /
          {{ selectedSites.length }}
        </span>
        <span>
          查询区间
          <b>{{
            searchForm.date_range.length === 2
              ? `${searchForm.date_range[0]} ~ ${searchForm.date_range[1]}`
              : "-"
          }}</b>
        </span>
      </div>

      <div class="metric-grid">
        <div v-for="metric in mainMetricCards" :key="metric.title" class="metric-card">
          <div class="metric-top">
            <span class="metric-icon" :class="`is-${metric.icon_theme}`">
              <span v-if="metric.iconText" class="metric-icon-emoji">{{
                metric.iconText
              }}</span>
              <component
                v-else
                :is="metric.iconComponent"
                class="metric-icon-svg"
              />
            </span>
            <span class="metric-title">{{ metric.title }}</span>
          </div>
          <div
            class="metric-value"
            :class="{
              'is-danger': metric.danger,
              'is-success': metric.success,
            }"
          >
            {{ metric.value }}
          </div>
        </div>
      </div>

      <div class="sub-metric-grid">
        <div
          v-for="metric in subMetricCards"
          :key="metric.title"
          class="sub-metric-card"
        >
          <div class="sub-title">{{ metric.title }}</div>
          <div class="sub-value">{{ metric.value }}</div>
        </div>
      </div>
    </ElCard>

    <ElCard class="mt-4" shadow="never">
      <template #header>
        <div class="table-header">
          <span>趋势折线</span>
          <span class="table-hint">{{ trendSubtitle }}</span>
        </div>
      </template>

      <div v-loading="trendLoading" class="trend-chart-wrap">
        <EchartsUI ref="trendChartRef" height="320px" />
      </div>
    </ElCard>

    <ElCard class="mt-4" shadow="never">
      <template #header>
        <div class="table-header">
          <span>每日新注册会员</span>
          <span class="table-hint">按当前筛选区间分桶统计</span>
        </div>
      </template>

      <div v-loading="trendLoading" class="trend-chart-wrap">
        <EchartsUI ref="registerChartRef" height="280px" />
      </div>
    </ElCard>

    <ElCard class="mt-4" shadow="never">
      <template #header>
        <div class="table-header">
          <span>站点明细</span>
          <span class="table-hint">
            成功 {{ successfulRows.length }} 个，失败/未配置
            {{ reportRows.length - successfulRows.length }} 个
          </span>
        </div>
      </template>

      <ElTable
        v-loading="loading"
        :data="pagedRows"
        border
        stripe
        style="width: 100%"
        :header-cell-style="{ background: '#f8fafc', color: '#334155' }"
      >
        <ElTableColumn prop="site_name" label="站点" min-width="180">
          <template #default="{ row }">
            <div class="site-name-cell">
              <div>{{ row.site_name }}</div>
              <div class="site-code">{{ row.site_code }}</div>
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn label="站点状态" width="96" align="center">
          <template #default="{ row }">
            <ElTag
              :type="getCustomerStatusTagType(row.customer_status)"
              size="small"
            >
              {{ getCustomerStatusText(row.customer_status) }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn label="查询状态" width="96" align="center">
          <template #default="{ row }">
            <ElTooltip
              :content="row.load_message"
              placement="top"
              :disabled="row.load_status === 'success'"
            >
              <ElTag :type="getReportStatusTagType(row.load_status)" size="small">
                {{ getReportStatusText(row.load_status) }}
              </ElTag>
            </ElTooltip>
          </template>
        </ElTableColumn>

        <ElTableColumn label="充值总额" width="130" align="right">
          <template #default="{ row }">
            {{ formatAmount(row.deposit_total) }}
          </template>
        </ElTableColumn>

        <ElTableColumn label="提现总额" width="130" align="right">
          <template #default="{ row }">
            {{ formatAmount(row.withdraw_total) }}
          </template>
        </ElTableColumn>

        <ElTableColumn label="有效投注" width="130" align="right">
          <template #default="{ row }">
            {{ formatAmount(row.valid_bet_amount) }}
          </template>
        </ElTableColumn>

        <ElTableColumn label="输赢" width="130" align="right">
          <template #default="{ row }">
            <span
              :class="{
                'text-emerald-600': row.net_amount > 0,
                'text-rose-600': row.net_amount < 0,
              }"
            >
              {{ formatAmount(row.net_amount) }}
            </span>
          </template>
        </ElTableColumn>

        <ElTableColumn label="充值会员" width="100" align="center">
          <template #default="{ row }">
            {{ formatCount(row.recharge_users) }}
          </template>
        </ElTableColumn>

        <ElTableColumn label="首存用户" width="100" align="center">
          <template #default="{ row }">
            {{ formatCount(row.first_deposit_users) }}
          </template>
        </ElTableColumn>

        <ElTableColumn label="首存总额" width="120" align="right">
          <template #default="{ row }">
            {{ formatAmount(row.first_deposit_amount) }}
          </template>
        </ElTableColumn>

        <ElTableColumn label="充值成功率" width="110" align="center">
          <template #default="{ row }">
            {{ formatRate(row.deposit_success_rate) }}
          </template>
        </ElTableColumn>
      </ElTable>

      <ElEmpty
        v-if="!loading && pagedRows.length === 0 && initialized"
        description="暂无站点统计数据"
        class="py-8"
      />

      <div class="pagination-wrap">
        <ElPagination
          :current-page="pagination.page"
          :page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handleCurrentChange"
          @size-change="handleSizeChange"
        />
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.operations-page {
  --primary-1: #eef4ff;
  --primary-2: #d8e6ff;
  --brand: #2563eb;
}

.query-card {
  border: 1px solid var(--primary-2);
  background: linear-gradient(135deg, #f8fbff 0%, #f3f7ff 100%);
}

.query-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.query-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.query-subtitle {
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
}

.query-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: center;
}

.query-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.query-label {
  color: #475569;
  font-size: 13px;
  white-space: nowrap;
}

.summary-card {
  border: 1px solid #e7eef9;
}

.summary-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 14px;
}

.summary-meta b {
  color: #0f172a;
  font-weight: 600;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
  background: #fff;
  transition: all 0.18s ease;
}

.metric-card:hover {
  border-color: #bfdbfe;
  box-shadow: 0 8px 18px rgb(37 99 235 / 8%);
}

.metric-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.metric-icon {
  width: 28px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: 1px solid #dbeafe;
  background: #eff6ff;
}

.metric-icon-svg {
  width: 14px;
  height: 14px;
}

.metric-icon-emoji {
  font-size: 13px;
  line-height: 1;
}

.metric-icon.is-money {
  color: #16a34a;
  background: #ecfdf3;
  border-color: #bbf7d0;
}

.metric-icon.is-blue {
  color: #2563eb;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.metric-icon.is-green {
  color: #059669;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.metric-icon.is-amber {
  color: #d97706;
  background: #fffbeb;
  border-color: #fde68a;
}

.metric-title {
  font-size: 13px;
  color: #64748b;
}

.metric-value {
  margin-top: 8px;
  font-size: 28px;
  line-height: 1.1;
  color: #0f172a;
  font-weight: 700;
}

.metric-value.is-danger {
  color: #dc2626;
}

.metric-value.is-success {
  color: #059669;
}

.sub-metric-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.sub-metric-card {
  border-radius: 10px;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.sub-title {
  font-size: 12px;
  color: #64748b;
}

.sub-value {
  margin-top: 2px;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.table-hint {
  font-size: 13px;
  color: #64748b;
  font-weight: 400;
}

.trend-chart-wrap {
  min-height: 320px;
}

.site-name-cell {
  line-height: 1.25;
}

.site-code {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

@media (max-width: 1440px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sub-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .metric-grid,
  .sub-metric-grid {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }

  .query-item {
    width: 100%;
  }
}
</style>
