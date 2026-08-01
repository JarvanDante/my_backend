<script lang="ts" setup>
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ElMessage,
  ElMessageBox,
  ElButton,
  ElCard,
  ElForm,
  ElFormItem,
  ElInput,
  ElRadioGroup,
  ElRadio,
  ElTag,
  ElDivider,
  ElRow,
  ElCol,
  ElTable,
  ElTableColumn,
  ElDialog,
  ElPagination,
  ElSwitch,
} from "element-plus";
import {
  getCustomerDetailApi,
  updateCustomerApi,
  getCustomerVersionHistoryApi,
  rollbackCustomerApi,
  type CustomerApi,
} from "#/api/core/customer";
import { getDomainListApi, type DomainApi } from "#/api/core/domain";
import { getGameListApi, type GameApi } from "#/api/core/game";
import {
  getSiteGameListApi,
  updateSiteGameStatusApi,
  bindSiteGameApi,
  unbindSiteGameApi,
  type SiteGameApi,
} from "#/api/core/siteGame";
import { getActivityListApi, type ActivityApi } from "#/api/core/activity";
import { getPaymentListApi, type PaymentApi } from "#/api/core/payment";
import {
  getSitePaymentListApi,
  updateSitePaymentStatusApi,
  bindSitePaymentApi,
  unbindSitePaymentApi,
  type SitePaymentApi,
} from "#/api/core/sitePayment";
import { getWithdrawListApi, type WithdrawApi } from "#/api/core/withdraw";
import {
  getSiteWithdrawListApi,
  updateSiteWithdrawStatusApi,
  bindSiteWithdrawApi,
  unbindSiteWithdrawApi,
  type SiteWithdrawApi,
} from "#/api/core/siteWithdraw";
import {
  getSiteActivityListApi,
  updateSiteActivityStatusApi,
  bindSiteActivityApi,
  unbindSiteActivityApi,
  type SiteActivityApi,
} from "#/api/core/siteActivity";

const route = useRoute();
const router = useRouter();

// 获取客户ID
const customerId = ref(Number(route.query.id));

// 页面状态
const loading = ref(false);
const saving = ref(false);
const domainLoading = ref(false);
const versionDialogVisible = ref(false);
const versionHistoryLoading = ref(false);
const rollbackLoading = ref(false);
const bindGameDialogVisible = ref(false);
const bindingGame = ref(false);

// 支付相关状态
const paymentList = ref<PaymentApi.PaymentItem[]>([]);
const paymentLoading = ref(false);
const sitePaymentList = ref<SitePaymentApi.SitePaymentItem[]>([]);
const sitePaymentLoading = ref(false);
const bindPaymentDialogVisible = ref(false);
const bindingPayment = ref(false);

// 提现相关状态
const withdrawList = ref<WithdrawApi.WithdrawItem[]>([]);
const withdrawLoading = ref(false);
const siteWithdrawList = ref<SiteWithdrawApi.SiteWithdrawItem[]>([]);
const siteWithdrawLoading = ref(false);
const bindWithdrawDialogVisible = ref(false);
const bindingWithdraw = ref(false);

// 活动相关状态
const activityList = ref<ActivityApi.ActivityItem[]>([]);
const activityLoading = ref(false);
const siteActivityList = ref<SiteActivityApi.SiteActivityItem[]>([]);
const siteActivityLoading = ref(false);
const bindActivityDialogVisible = ref(false);
const bindingActivity = ref(false);

// 版本历史数据
const versionHistory = ref<CustomerApi.VersionHistoryItem[]>([]);
const versionTotal = ref(0);
const currentVersion = ref(0);
const versionPage = ref(1);
const versionSize = ref(10);

// 客户基本信息
const customerInfo = reactive({
  id: 0,
  name: "",
  code: "",
  timezone: "",
  currency: "",
  status: 1,
  kv_config: "",
  db_link_site: "",
  db_link_balance: "",
  db_link_game: "",
  is_sync: 1,
  created_at: "",
  updated_at: "",
});

// 域名列表数据
const domainList = ref<DomainApi.DomainItem[]>([]);

// 游戏列表数据
const gameList = ref<GameApi.GameItem[]>([]);
const gameLoading = ref(false);

// 站点游戏列表数据
const siteGameList = ref<SiteGameApi.SiteGameItem[]>([]);
const siteGameLoading = ref(false);

// 选项数据
const statusOptions = [
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 },
];

// 表单验证规则
const basicFormRules = {
  name: [
    {
      required: true,
      message: "请输入客户名称",
      trigger: "blur",
    },
  ],
};

// 获取客户详情
async function fetchCustomerDetail() {
  if (!customerId.value) return;

  loading.value = true;
  try {
    const response = await getCustomerDetailApi(customerId.value);
    Object.assign(customerInfo, response);

    console.log("获取到的客户详情:", response);

    // 获取客户详情后，加载对应的域名列表
    await fetchDomainList();
    await fetchSiteGameList();
    await fetchSitePaymentList();
    await fetchSiteWithdrawList();
    await fetchSiteActivityList();
  } catch (error) {
    console.error("获取客户详情失败:", error);
    ElMessage.error("获取客户详情失败");

    // 如果API失败，使用模拟数据
    const mockData = {
      id: customerId.value,
      name: "测试客户",
      code: "TEST001",
      timezone: "Asia/Shanghai",
      currency: "CNY",
      status: 1,
      kv_config: "test_config",
      is_sync: 1,
      created_at: "2024-01-01 10:00:00",
      updated_at: "2024-01-02 15:30:00",
    };

    Object.assign(customerInfo, mockData);
  } finally {
    loading.value = false;
  }
}

// 获取域名列表
async function fetchDomainList() {
  if (!customerInfo.code) return;

  domainLoading.value = true;
  try {
    const response = await getDomainListApi({
      page: 1,
      size: 200,
      site_code: customerInfo.code,
      status: 1,
    });
    domainList.value = response.list || [];
    console.log("获取到的域名列表:", response);
  } catch (error) {
    console.error("获取域名列表失败:", error);
    ElMessage.error("获取域名列表失败");
  } finally {
    domainLoading.value = false;
  }
}

// 保存配置
async function handleSave() {
  saving.value = true;
  try {
    const params: CustomerApi.UpdateCustomerParams = {
      id: customerInfo.id,
      name: customerInfo.name,
      timezone: customerInfo.timezone,
      currency: customerInfo.currency,
      status: customerInfo.status,
      kv_config: customerInfo.kv_config,
      db_link_site: customerInfo.db_link_site,
      db_link_balance: customerInfo.db_link_balance,
      db_link_game: customerInfo.db_link_game,
    };

    await updateCustomerApi(params);
    ElMessage.success("保存成功");
  } catch (error) {
    console.error("保存失败:", error);
    ElMessage.error("保存失败");
  } finally {
    saving.value = false;
  }
}

// 返回列表
function handleBack() {
  router.push("/customerManage/customer");
}

// 打开版本历史弹窗
async function handleOpenVersionHistory() {
  versionDialogVisible.value = true;
  versionPage.value = 1;
  await fetchVersionHistory();
}

// 获取版本历史
async function fetchVersionHistory() {
  if (!customerInfo.code) return;

  versionHistoryLoading.value = true;
  try {
    const response = await getCustomerVersionHistoryApi({
      site_code: customerInfo.code,
      page: versionPage.value,
      size: versionSize.value,
    });
    versionHistory.value = response.list || [];
    versionTotal.value = response.total || 0;
    currentVersion.value = response.current_version || 0;
  } catch (error) {
    console.error("获取版本历史失败:", error);
    ElMessage.error("获取版本历史失败");
  } finally {
    versionHistoryLoading.value = false;
  }
}

// 版本历史分页变化
function handleVersionPageChange(page: number) {
  versionPage.value = page;
  fetchVersionHistory();
}

// 回滚到指定版本
async function handleRollback(version: number) {
  try {
    await ElMessageBox.confirm(`确定要回滚到版本 ${version} 吗？`, "回滚确认", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    rollbackLoading.value = true;
    const response = await rollbackCustomerApi(customerInfo.id, version);

    if (response.success) {
      ElMessage.success("回滚成功");
      versionDialogVisible.value = false;
      // 刷新页面数据
      await fetchCustomerDetail();
    } else {
      ElMessage.error(response.message || "回滚失败");
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("回滚失败:", error);
      ElMessage.error("回滚失败");
    }
  } finally {
    rollbackLoading.value = false;
  }
}

// 获取发布类型文本
function getPublishTypeText(type: number) {
  return type === 1 ? "正常发布" : "回滚";
}

// 获取发布类型标签类型
function getPublishTypeTagType(type: number) {
  return type === 1 ? "success" : "warning";
}

// 格式化时间
function formatDateTime(dateTime: string) {
  if (!dateTime) return "-";
  return new Date(dateTime).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// 获取状态标签类型
function getStatusTagType(status: number) {
  return status === 1 ? "success" : "danger";
}

// 获取状态文本
function getStatusText(status: number) {
  return status === 1 ? "启用" : "禁用";
}

// 获取游戏列表
async function fetchGameList() {
  gameLoading.value = true;
  try {
    const response = await getGameListApi({
      status: 1,
      page: 1,
      size: 1000,
    });
    gameList.value = response.list || [];
  } catch (error) {
    console.error("获取游戏列表失败:", error);
  } finally {
    gameLoading.value = false;
  }
}

// 获取站点游戏列表
async function fetchSiteGameList() {
  if (!customerInfo.code) return;

  siteGameLoading.value = true;
  try {
    const response = await getSiteGameListApi({
      site_code: customerInfo.code,
    });
    siteGameList.value = response.list || [];
  } catch (error) {
    console.error("获取站点游戏列表失败:", error);
    ElMessage.error("获取站点游戏列表失败");
  } finally {
    siteGameLoading.value = false;
  }
}

// 按类型分组游戏
const gamesByType = computed(() => {
  const types = [
    { type: 1, name: "体育", color: "#409eff" },
    { type: 2, name: "彩票", color: "#67c23a" },
    { type: 3, name: "真人", color: "#e6a23c" },
    { type: 4, name: "电子游戏", color: "#f56c6c" },
    { type: 5, name: "棋牌游戏", color: "#909399" },
  ];

  return types.map((typeInfo) => {
    const games = siteGameList.value.filter((g) => g.type === typeInfo.type);
    return {
      ...typeInfo,
      games,
    };
  });
});

// 切换游戏状态
async function handleToggleGameStatus(game: SiteGameApi.SiteGameItem) {
  const oldStatus = game.status === 1 ? 0 : 1; // 保存旧状态用于回滚
  try {
    await updateSiteGameStatusApi({
      id: game.id,
      status: game.status, // 使用Switch已经更新的值
    });
    ElMessage.success("更新成功");
  } catch (error) {
    console.error("更新游戏状态失败:", error);
    ElMessage.error("更新游戏状态失败");
    // 失败时回滚状态
    game.status = oldStatus;
  }
}

// 获取游戏类型文本
function getGameTypeText(type: number) {
  const typeMap: Record<number, string> = {
    1: "体育",
    2: "彩票",
    3: "真人",
    4: "电子游戏",
    5: "棋牌游戏",
  };
  return typeMap[type] || "未知";
}

// 获取游戏类型标签类型
function getGameTypeTagType(
  type: number,
): "primary" | "success" | "warning" | "danger" | "info" | undefined {
  const typeMap: Record<
    number,
    "primary" | "success" | "warning" | "danger" | "info" | undefined
  > = {
    1: undefined,
    2: "success",
    3: "warning",
    4: "danger",
    5: "info",
  };
  return typeMap[type];
}

// 打开绑定游戏对话框
function handleOpenBindGameDialog() {
  bindGameDialogVisible.value = true;
}

// 可绑定的游戏列表（排除已绑定的）
const availableGames = computed(() => {
  const boundGameIds = new Set(siteGameList.value.map((sg) => sg.game_id));
  return gameList.value.filter((game) => !boundGameIds.has(game.id));
});

// 按类型分组可绑定游戏
const availableGamesByType = computed(() => {
  const types = [
    { type: 1, name: "体育", color: "#409eff" },
    { type: 2, name: "彩票", color: "#67c23a" },
    { type: 3, name: "真人", color: "#e6a23c" },
    { type: 4, name: "电子游戏", color: "#f56c6c" },
    { type: 5, name: "棋牌游戏", color: "#909399" },
  ];

  return types.map((typeInfo) => {
    const games = availableGames.value.filter((g) => g.type === typeInfo.type);
    return {
      ...typeInfo,
      games,
    };
  });
});

// 绑定游戏到站点
async function handleBindGame(gameId: number) {
  if (!customerInfo.code) {
    ElMessage.error("站点编码不存在");
    return;
  }

  bindingGame.value = true;
  try {
    await bindSiteGameApi({
      site_code: customerInfo.code,
      game_id: gameId,
    });
    ElMessage.success("绑定成功");
    // 刷新站点游戏列表
    await fetchSiteGameList();
  } catch (error) {
    console.error("绑定游戏失败:", error);
    ElMessage.error("绑定游戏失败");
  } finally {
    bindingGame.value = false;
  }
}

// 取消绑定游戏
async function handleUnbindGame(siteGame: SiteGameApi.SiteGameItem) {
  try {
    await ElMessageBox.confirm(
      `确定要取消绑定游戏"${siteGame.name}"吗？`,
      "取消绑定确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    await unbindSiteGameApi({
      id: siteGame.id,
    });
    ElMessage.success("取消绑定成功");
    // 刷新站点游戏列表
    await fetchSiteGameList();
  } catch (error) {
    if (error !== "cancel") {
      console.error("取消绑定失败:", error);
      ElMessage.error("取消绑定失败");
    }
  }
}

// 获取域名类型文本
function getDomainTypeText(type: number) {
  const typeMap: Record<number, string> = {
    1: "API",
    2: "H5",
    3: "Admin",
    4: "Callback",
  };
  return typeMap[type] || "未知";
}

// 页面加载时获取数据
onMounted(() => {
  fetchCustomerDetail();
  fetchGameList();
  fetchPaymentList();
  fetchWithdrawList();
  fetchActivityList();
});

// 获取支付列表
async function fetchPaymentList() {
  paymentLoading.value = true;
  try {
    const response = await getPaymentListApi({
      status: 1,
      page: 1,
      size: 1000,
    });
    paymentList.value = response.list || [];
  } catch (error) {
    console.error("获取支付列表失败:", error);
  } finally {
    paymentLoading.value = false;
  }
}

// 获取站点支付列表
async function fetchSitePaymentList() {
  if (!customerInfo.code) return;

  sitePaymentLoading.value = true;
  try {
    const response = await getSitePaymentListApi({
      site_code: customerInfo.code,
    });
    sitePaymentList.value = response.list || [];
  } catch (error) {
    console.error("获取站点支付列表失败:", error);
    ElMessage.error("获取站点支付列表失败");
  } finally {
    sitePaymentLoading.value = false;
  }
}

// 切换支付状态
async function handleTogglePaymentStatus(
  payment: SitePaymentApi.SitePaymentItem,
) {
  const oldStatus = payment.status === 1 ? 0 : 1;
  try {
    await updateSitePaymentStatusApi({
      id: payment.id,
      status: payment.status,
    });
    ElMessage.success("更新成功");
  } catch (error) {
    console.error("更新支付状态失败:", error);
    ElMessage.error("更新支付状态失败");
    payment.status = oldStatus;
  }
}

// 打开绑定支付对话框
function handleOpenBindPaymentDialog() {
  bindPaymentDialogVisible.value = true;
}

// 可绑定的支付列表（排除已绑定的）
const availablePayments = computed(() => {
  const boundPaymentIds = new Set(
    sitePaymentList.value.map((sp) => sp.payment_id),
  );
  return paymentList.value.filter(
    (payment) => !boundPaymentIds.has(payment.id),
  );
});

// 绑定支付到站点
async function handleBindPayment(paymentId: number) {
  if (!customerInfo.code) {
    ElMessage.error("站点编码不存在");
    return;
  }

  bindingPayment.value = true;
  try {
    await bindSitePaymentApi({
      site_code: customerInfo.code,
      payment_id: paymentId,
    });
    ElMessage.success("绑定成功");
    await fetchSitePaymentList();
  } catch (error) {
    console.error("绑定支付失败:", error);
    ElMessage.error("绑定支付失败");
  } finally {
    bindingPayment.value = false;
  }
}

// 取消绑定支付
async function handleUnbindPayment(
  sitePayment: SitePaymentApi.SitePaymentItem,
) {
  try {
    await ElMessageBox.confirm(
      `确定要取消绑定支付"${sitePayment.name}"吗？`,
      "取消绑定确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    await unbindSitePaymentApi({
      id: sitePayment.id,
    });
    ElMessage.success("取消绑定成功");
    await fetchSitePaymentList();
  } catch (error) {
    if (error !== "cancel") {
      console.error("取消绑定失败:", error);
      ElMessage.error("取消绑定失败");
    }
  }
}

// 获取提现列表
async function fetchWithdrawList() {
  withdrawLoading.value = true;
  try {
    const response = await getWithdrawListApi({
      status: 1,
      page: 1,
      size: 1000,
    });
    withdrawList.value = response.list || [];
  } catch (error) {
    console.error("获取提现列表失败:", error);
  } finally {
    withdrawLoading.value = false;
  }
}

// 获取站点提现列表
async function fetchSiteWithdrawList() {
  if (!customerInfo.code) return;

  siteWithdrawLoading.value = true;
  try {
    const response = await getSiteWithdrawListApi({
      site_code: customerInfo.code,
    });
    siteWithdrawList.value = response.list || [];
  } catch (error) {
    console.error("获取站点提现列表失败:", error);
    ElMessage.error("获取站点提现列表失败");
  } finally {
    siteWithdrawLoading.value = false;
  }
}

// 切换提现状态
async function handleToggleWithdrawStatus(
  withdraw: SiteWithdrawApi.SiteWithdrawItem,
) {
  const oldStatus = withdraw.status === 1 ? 0 : 1;
  try {
    await updateSiteWithdrawStatusApi({
      id: withdraw.id,
      status: withdraw.status,
    });
    ElMessage.success("更新成功");
  } catch (error) {
    console.error("更新提现状态失败:", error);
    ElMessage.error("更新提现状态失败");
    withdraw.status = oldStatus;
  }
}

// 打开绑定提现对话框
function handleOpenBindWithdrawDialog() {
  bindWithdrawDialogVisible.value = true;
}

// 可绑定的提现列表（排除已绑定的）
const availableWithdraws = computed(() => {
  const boundWithdrawIds = new Set(
    siteWithdrawList.value.map((sw) => sw.withdraw_id),
  );
  return withdrawList.value.filter(
    (withdraw) => !boundWithdrawIds.has(withdraw.id),
  );
});

// 绑定提现到站点
async function handleBindWithdraw(withdrawId: number) {
  if (!customerInfo.code) {
    ElMessage.error("站点编码不存在");
    return;
  }

  bindingWithdraw.value = true;
  try {
    await bindSiteWithdrawApi({
      site_code: customerInfo.code,
      withdraw_id: withdrawId,
    });
    ElMessage.success("绑定成功");
    await fetchSiteWithdrawList();
  } catch (error) {
    console.error("绑定提现失败:", error);
    ElMessage.error("绑定提现失败");
  } finally {
    bindingWithdraw.value = false;
  }
}

// 取消绑定提现
async function handleUnbindWithdraw(
  siteWithdraw: SiteWithdrawApi.SiteWithdrawItem,
) {
  try {
    await ElMessageBox.confirm(
      `确定要取消绑定提现"${siteWithdraw.name}"吗？`,
      "取消绑定确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    await unbindSiteWithdrawApi({
      id: siteWithdraw.id,
    });
    ElMessage.success("取消绑定成功");
    await fetchSiteWithdrawList();
  } catch (error) {
    if (error !== "cancel") {
      console.error("取消绑定失败:", error);
      ElMessage.error("取消绑定失败");
    }
  }
}

// 获取活动列表
async function fetchActivityList() {
  activityLoading.value = true;
  try {
    const response = await getActivityListApi({
      status: 1,
      page: 1,
      size: 1000,
    });
    activityList.value = response.list || [];
  } catch (error) {
    console.error("获取活动列表失败:", error);
  } finally {
    activityLoading.value = false;
  }
}

// 获取站点活动列表
async function fetchSiteActivityList() {
  if (!customerInfo.code) return;

  siteActivityLoading.value = true;
  try {
    const response = await getSiteActivityListApi({
      site_code: customerInfo.code,
    });
    siteActivityList.value = response.list || [];
  } catch (error) {
    console.error("获取站点活动列表失败:", error);
    ElMessage.error("获取站点活动列表失败");
  } finally {
    siteActivityLoading.value = false;
  }
}

// 切换活动状态
async function handleToggleActivityStatus(
  activity: SiteActivityApi.SiteActivityItem,
) {
  const oldStatus = activity.status === 1 ? 0 : 1;
  try {
    await updateSiteActivityStatusApi({
      id: activity.id,
      status: activity.status,
    });
    ElMessage.success("更新成功");
  } catch (error) {
    console.error("更新活动状态失败:", error);
    ElMessage.error("更新活动状态失败");
    activity.status = oldStatus;
  }
}

// 打开绑定活动对话框
function handleOpenBindActivityDialog() {
  bindActivityDialogVisible.value = true;
}

// 可绑定的活动列表（排除已绑定的）
const availableActivities = computed(() => {
  const boundActivityIds = new Set(
    siteActivityList.value.map((sa) => sa.activity_id),
  );
  return activityList.value.filter(
    (activity) => !boundActivityIds.has(activity.id),
  );
});

// 绑定活动到站点
async function handleBindActivity(activityId: number) {
  if (!customerInfo.code) {
    ElMessage.error("站点编码不存在");
    return;
  }

  bindingActivity.value = true;
  try {
    await bindSiteActivityApi({
      site_code: customerInfo.code,
      activity_id: activityId,
    });
    ElMessage.success("绑定成功");
    await fetchSiteActivityList();
  } catch (error) {
    console.error("绑定活动失败:", error);
    ElMessage.error("绑定活动失败");
  } finally {
    bindingActivity.value = false;
  }
}

// 取消绑定活动
async function handleUnbindActivity(
  siteActivity: SiteActivityApi.SiteActivityItem,
) {
  try {
    await ElMessageBox.confirm(
      `确定要取消绑定活动\"${siteActivity.name}\"吗？`,
      "取消绑定确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    await unbindSiteActivityApi({
      id: siteActivity.id,
    });
    ElMessage.success("取消绑定成功");
    await fetchSiteActivityList();
  } catch (error) {
    if (error !== "cancel") {
      console.error("取消绑定失败:", error);
      ElMessage.error("取消绑定失败");
    }
  }
}
</script>

<template>
  <div class="p-4">
    <!-- 页面头部 -->
    <ElCard class="mb-4" shadow="never">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <ElButton @click="handleBack">
            <i class="i-ep-arrow-left mr-1"></i>
            返回列表
          </ElButton>
          <ElDivider direction="vertical" />
          <div>
            <h2 class="text-lg font-semibold mb-1">
              {{ customerInfo.name || "客户详情" }}
            </h2>
            <div class="flex items-center gap-4 text-sm text-gray-500">
              <span>客户编码: {{ customerInfo.code }}</span>
              <span
                >创建时间: {{ formatDateTime(customerInfo.created_at) }}</span
              >
              <span
                >更新时间: {{ formatDateTime(customerInfo.updated_at) }}</span
              >
              <ElTag :type="getStatusTagType(customerInfo.status)">
                {{ getStatusText(customerInfo.status) }}
              </ElTag>
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <ElButton @click="handleOpenVersionHistory">
            <i class="i-ep-clock mr-1"></i>
            版本历史
          </ElButton>
        </div>
      </div>
    </ElCard>

    <!-- 配置内容 -->
    <div class="space-y-4" v-loading="loading">
      <!-- 基本信息 -->
      <ElCard shadow="never" class="config-card">
        <template #header>
          <span class="font-semibold">基本配置</span>
        </template>
        <ElForm
          :model="customerInfo"
          :rules="basicFormRules"
          label-width="120px"
          label-position="right"
        >
          <ElRow :gutter="24">
            <ElCol :span="12">
              <ElFormItem label="客户名称" prop="name">
                <ElInput
                  v-model="customerInfo.name"
                  placeholder="请输入客户名称"
                  clearable
                />
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="客户编码" prop="code">
                <ElInput
                  v-model="customerInfo.code"
                  placeholder="客户编码"
                  disabled
                />
              </ElFormItem>
            </ElCol>
          </ElRow>

          <ElRow :gutter="24">
            <ElCol :span="12">
              <ElFormItem label="时区" prop="timezone">
                <ElInput
                  v-model="customerInfo.timezone"
                  placeholder="请输入时区"
                  clearable
                />
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="币种" prop="currency">
                <ElInput
                  v-model="customerInfo.currency"
                  placeholder="请输入币种"
                  clearable
                />
              </ElFormItem>
            </ElCol>
          </ElRow>

          <ElRow :gutter="24">
            <ElCol :span="24">
              <ElFormItem label="Site数据库" prop="db_link_site">
                <ElInput
                  v-model="customerInfo.db_link_site"
                  placeholder="请输入Site数据库连接"
                  disabled
                  readonly
                />
              </ElFormItem>
            </ElCol>
          </ElRow>

          <ElRow :gutter="24">
            <ElCol :span="24">
              <ElFormItem label="Balance数据库" prop="db_link_balance">
                <ElInput
                  v-model="customerInfo.db_link_balance"
                  placeholder="请输入Balance数据库连接"
                  disabled
                  readonly
                />
              </ElFormItem>
            </ElCol>
          </ElRow>

          <ElRow :gutter="24">
            <ElCol :span="24">
              <ElFormItem label="Game数据库" prop="db_link_game">
                <ElInput
                  v-model="customerInfo.db_link_game"
                  placeholder="请输入Game数据库连接"
                  disabled
                  readonly
                />
              </ElFormItem>
            </ElCol>
          </ElRow>

          <ElRow :gutter="24">
            <ElCol :span="12">
              <ElFormItem label="状态" prop="status">
                <ElRadioGroup v-model="customerInfo.status">
                  <ElRadio
                    v-for="option in statusOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </ElRadio>
                </ElRadioGroup>
              </ElFormItem>
            </ElCol>
          </ElRow>

          <ElFormItem label="KV配置" prop="kv_config">
            <ElInput
              v-model="customerInfo.kv_config"
              type="textarea"
              :rows="6"
              placeholder="请输入KV配置"
              clearable
            />
          </ElFormItem>

          <ElFormItem>
            <ElButton type="primary" @click="handleSave" :loading="saving">
              保存
            </ElButton>
          </ElFormItem>
        </ElForm>
      </ElCard>

      <!-- 域名列表 -->
      <ElCard shadow="never" class="config-card">
        <template #header>
          <span class="font-semibold">域名列表</span>
        </template>
        <ElTable
          :data="domainList"
          v-loading="domainLoading"
          stripe
          style="width: 100%"
        >
          <ElTableColumn prop="id" label="ID" width="80" />
          <ElTableColumn prop="domain" label="域名" min-width="200" />
          <ElTableColumn prop="domain_type" label="类型" width="100">
            <template #default="{ row }">
              <ElTag type="info">{{
                getDomainTypeText(row.domain_type)
              }}</ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="status" label="状态" width="80">
            <template #default="{ row }">
              <ElTag :type="getStatusTagType(row.status)">
                {{ getStatusText(row.status) }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="created_at" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </ElTableColumn>
          <ElTableColumn prop="updated_at" label="更新时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.updated_at) }}
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>

      <!-- 游戏管理 -->
      <ElCard shadow="never" class="config-card">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">游戏管理</span>
            <ElButton
              type="primary"
              size="small"
              @click="handleOpenBindGameDialog"
            >
              <i class="i-ep-plus mr-1"></i>
              绑定游戏
            </ElButton>
          </div>
        </template>
        <div v-loading="siteGameLoading">
          <div
            v-for="typeGroup in gamesByType"
            :key="typeGroup.type"
            class="game-type-section"
          >
            <div class="game-type-header">
              <ElTag :type="getGameTypeTagType(typeGroup.type)" size="large">
                {{ typeGroup.name }}
              </ElTag>
              <span class="game-count"
                >{{ typeGroup.games.length }} 个游戏</span
              >
            </div>
            <div v-if="typeGroup.games.length > 0" class="game-list">
              <div
                v-for="game in typeGroup.games"
                :key="game.id"
                class="game-item"
              >
                <div class="game-info">
                  <span class="game-name">{{ game.name }}</span>
                </div>
                <div class="game-actions">
                  <ElSwitch
                    v-model="game.status"
                    :active-value="1"
                    :inactive-value="0"
                    @change="handleToggleGameStatus(game)"
                  />
                  <ElButton
                    type="danger"
                    size="small"
                    link
                    @click.stop="handleUnbindGame(game)"
                  >
                    删除
                  </ElButton>
                </div>
              </div>
            </div>
            <div v-else class="empty-games">暂无游戏</div>
          </div>
        </div>
      </ElCard>

      <!-- 支付管理 -->
      <ElCard shadow="never" class="config-card">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">支付管理</span>
            <ElButton
              type="primary"
              size="small"
              @click="handleOpenBindPaymentDialog"
            >
              <i class="i-ep-plus mr-1"></i>
              绑定支付
            </ElButton>
          </div>
        </template>
        <div v-loading="sitePaymentLoading">
          <div v-if="sitePaymentList.length > 0" class="game-list">
            <div
              v-for="payment in sitePaymentList"
              :key="payment.id"
              class="game-item"
            >
              <div class="game-info">
                <span class="game-name">{{ payment.name }}</span>
              </div>
              <div class="game-actions">
                <ElSwitch
                  v-model="payment.status"
                  :active-value="1"
                  :inactive-value="0"
                  @change="handleTogglePaymentStatus(payment)"
                />
                <ElButton
                  type="danger"
                  size="small"
                  link
                  @click.stop="handleUnbindPayment(payment)"
                >
                  删除
                </ElButton>
              </div>
            </div>
          </div>
          <div v-else class="empty-games">暂无支付方式</div>
        </div>
      </ElCard>

      <!-- 提现管理 -->
      <ElCard shadow="never" class="config-card">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">提现管理</span>
            <ElButton
              type="primary"
              size="small"
              @click="handleOpenBindWithdrawDialog"
            >
              <i class="i-ep-plus mr-1"></i>
              绑定提现
            </ElButton>
          </div>
        </template>
        <div v-loading="siteWithdrawLoading">
          <div v-if="siteWithdrawList.length > 0" class="game-list">
            <div
              v-for="withdraw in siteWithdrawList"
              :key="withdraw.id"
              class="game-item"
            >
              <div class="game-info">
                <span class="game-name">{{ withdraw.name }}</span>
              </div>
              <div class="game-actions">
                <ElSwitch
                  v-model="withdraw.status"
                  :active-value="1"
                  :inactive-value="0"
                  @change="handleToggleWithdrawStatus(withdraw)"
                />
                <ElButton
                  type="danger"
                  size="small"
                  link
                  @click.stop="handleUnbindWithdraw(withdraw)"
                >
                  删除
                </ElButton>
              </div>
            </div>
          </div>
          <div v-else class="empty-games">暂无提现方式</div>
        </div>
      </ElCard>

      <!-- 活动管理 -->
      <ElCard shadow="never" class="config-card">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">活动管理</span>
            <ElButton
              type="primary"
              size="small"
              @click="handleOpenBindActivityDialog"
            >
              <i class="i-ep-plus mr-1"></i>
              绑定活动
            </ElButton>
          </div>
        </template>
        <div v-loading="siteActivityLoading">
          <div v-if="siteActivityList.length > 0" class="game-list">
            <div
              v-for="activity in siteActivityList"
              :key="activity.id"
              class="game-item"
            >
              <div class="game-info">
                <span class="game-name">{{ activity.name }}</span>
              </div>
              <div class="game-actions">
                <ElSwitch
                  v-model="activity.status"
                  :active-value="1"
                  :inactive-value="0"
                  @change="handleToggleActivityStatus(activity)"
                />
                <ElButton
                  type="danger"
                  size="small"
                  link
                  @click.stop="handleUnbindActivity(activity)"
                >
                  删除
                </ElButton>
              </div>
            </div>
          </div>
          <div v-else class="empty-games">暂无活动</div>
        </div>
      </ElCard>
    </div>

    <!-- 绑定游戏对话框 -->
    <ElDialog
      v-model="bindGameDialogVisible"
      title="绑定游戏"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-loading="gameLoading">
        <div
          v-for="typeGroup in availableGamesByType"
          :key="typeGroup.type"
          class="game-type-section"
        >
          <div class="game-type-header">
            <ElTag :type="getGameTypeTagType(typeGroup.type)" size="large">
              {{ typeGroup.name }}
            </ElTag>
            <span class="game-count"
              >{{ typeGroup.games.length }} 个可绑定</span
            >
          </div>
          <div v-if="typeGroup.games.length > 0" class="game-list">
            <div
              v-for="game in typeGroup.games"
              :key="game.id"
              class="game-item-bind"
            >
              <div class="game-info">
                <span class="game-name">{{ game.name }}</span>
                <span class="game-platform">{{ game.platform }}</span>
              </div>
              <ElButton
                type="primary"
                size="small"
                :loading="bindingGame"
                @click="handleBindGame(game.id)"
              >
                绑定
              </ElButton>
            </div>
          </div>
          <div v-else class="empty-games">暂无可绑定游戏</div>
        </div>
      </div>
    </ElDialog>

    <!-- 绑定支付对话框 -->
    <ElDialog
      v-model="bindPaymentDialogVisible"
      title="绑定支付"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-loading="paymentLoading">
        <div v-if="availablePayments.length > 0" class="game-list">
          <div
            v-for="payment in availablePayments"
            :key="payment.id"
            class="game-item-bind"
          >
            <div class="game-info">
              <span class="game-name">{{ payment.name }}</span>
              <span class="game-platform">{{ payment.code }}</span>
            </div>
            <ElButton
              type="primary"
              size="small"
              :loading="bindingPayment"
              @click="handleBindPayment(payment.id)"
            >
              绑定
            </ElButton>
          </div>
        </div>
        <div v-else class="empty-games">暂无可绑定支付方式</div>
      </div>
    </ElDialog>

    <!-- 绑定提现对话框 -->
    <ElDialog
      v-model="bindWithdrawDialogVisible"
      title="绑定提现"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-loading="withdrawLoading">
        <div v-if="availableWithdraws.length > 0" class="game-list">
          <div
            v-for="withdraw in availableWithdraws"
            :key="withdraw.id"
            class="game-item-bind"
          >
            <div class="game-info">
              <span class="game-name">{{ withdraw.name }}</span>
              <span class="game-platform">{{ withdraw.code }}</span>
            </div>
            <ElButton
              type="primary"
              size="small"
              :loading="bindingWithdraw"
              @click="handleBindWithdraw(withdraw.id)"
            >
              绑定
            </ElButton>
          </div>
        </div>
        <div v-else class="empty-games">暂无可绑定提现方式</div>
      </div>
    </ElDialog>

    <!-- 绑定活动对话框 -->
    <ElDialog
      v-model="bindActivityDialogVisible"
      title="绑定活动"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-loading="activityLoading">
        <div v-if="availableActivities.length > 0" class="game-list">
          <div
            v-for="activity in availableActivities"
            :key="activity.id"
            class="game-item-bind"
          >
            <div class="game-info">
              <span class="game-name">{{ activity.name }}</span>
              <span class="game-platform">
                {{ activity.code }}
                <span v-if="activity.activity_type"> | 类型：{{ activity.activity_type }}</span>
                <span v-if="activity.table"> | 表：{{ activity.table }}</span>
              </span>
            </div>
            <ElButton
              type="primary"
              size="small"
              :loading="bindingActivity"
              @click="handleBindActivity(activity.id)"
            >
              绑定
            </ElButton>
          </div>
        </div>
        <div v-else class="empty-games">暂无可绑定活动</div>
      </div>
    </ElDialog>

    <!-- 版本历史弹窗 -->
    <ElDialog
      v-model="versionDialogVisible"
      title="版本历史"
      width="900px"
      :close-on-click-modal="false"
    >
      <ElTable
        :data="versionHistory"
        v-loading="versionHistoryLoading"
        stripe
        style="width: 100%"
      >
        <ElTableColumn prop="version" label="版本号" width="120">
          <template #default="{ row }">
            <ElTag v-if="row.is_current" type="success">
              v{{ row.version }} (当前)
            </ElTag>
            <span v-else>v{{ row.version }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="rollback_from" label="回滚来源" width="120">
          <template #default="{ row }">
            <span v-if="row.rollback_from > 0">v{{ row.rollback_from }}</span>
            <span v-else>-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="operator_name" label="操作人" width="120" />
        <ElTableColumn prop="comment" label="说明" min-width="200" />
        <ElTableColumn prop="published_at" label="发布时间" width="180" />
        <ElTableColumn label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <ElButton
              v-if="!row.is_current"
              type="primary"
              size="small"
              :loading="rollbackLoading"
              @click="handleRollback(row.version)"
            >
              回滚
            </ElButton>
            <ElTag v-else type="success">当前版本</ElTag>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-4 flex justify-end">
        <ElPagination
          v-model:current-page="versionPage"
          :page-size="versionSize"
          :total="versionTotal"
          layout="total, prev, pager, next"
          @current-change="handleVersionPageChange"
        />
      </div>
    </ElDialog>
  </div>
</template>

<style scoped lang="scss">
.config-card {
  :deep(.el-card__body) {
    padding: 20px;
  }
}

h4 {
  border-left: 4px solid #409eff;
  padding-left: 12px;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.game-type-section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
}

.game-type-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;

  .game-count {
    color: #909399;
    font-size: 14px;
  }
}

.game-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.game-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 4px;
  transition: all 0.3s;

  &:hover {
    background: #ecf5ff;
  }

  .game-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.game-item-bind {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 4px;
  transition: all 0.3s;

  &:hover {
    background: #ecf5ff;
  }

  .game-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .game-platform {
    font-size: 12px;
    color: #909399;
  }
}

.game-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.game-name {
  font-size: 14px;
  color: #303133;
}

.empty-games {
  text-align: center;
  padding: 24px;
  color: #909399;
  font-size: 14px;
}
</style>
