<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

import {
  ElAlert,
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElImage,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";

import {
  createLotteryActivityApi,
  createLotteryPrizeApi,
  deleteLotteryActivityApi,
  deleteLotteryPrizeApi,
  getLotteryActivitiesApi,
  getLotteryAddressesApi,
  getLotteryHistoriesApi,
  getLotteryPrizesApi,
  type LotteryApi,
  shipLotteryAddressApi,
  updateLotteryActivityApi,
  updateLotteryPrizeApi,
} from "#/api/core/lottery";

defineOptions({ name: "OpsLottery" });

const activeTab = ref("activity");

/* ------------------------- 常量(与后端 service 常量一一对应) ------------------------- */

// service.TypeVipDay=1 / TypeWelfare=2
const lotteryTypeMap: Record<number, string> = { 1: "会员日抽奖", 2: "福利抽奖" };
// service.PayFree=1 / PayGold=2
const payTypeMap: Record<number, string> = { 1: "仅免费次数", 2: "金币" };
// service.PrizeGold=1 / PrizeVip=2 / PrizeCoupon=3 / PrizeGoods=4 / PrizeThanks=5
const prizeTypeMap: Record<number, string> = {
  1: "金币",
  2: "VIP天数",
  3: "优惠券",
  4: "实物",
  5: "谢谢参与",
};
// service.HistoryDone=1 / HistoryWaitShip=2 / HistoryShipped=3
const historyStatusMap: Record<
  number,
  { text: string; type: "info" | "success" | "warning" }
> = {
  1: { text: "已发放", type: "success" },
  2: { text: "待发货", type: "warning" },
  3: { text: "已发货", type: "info" },
};
// service.AddrWaitFill=0 / AddrWaitShip=1 / AddrShipped=2
const deliveryStatusMap: Record<
  number,
  { text: string; type: "danger" | "success" | "warning" }
> = {
  0: { text: "待用户填写", type: "danger" },
  1: { text: "待发货", type: "warning" },
  2: { text: "已发货", type: "success" },
};

/* --------------------------------- Tab1: 活动 --------------------------------- */

const actLoading = ref(false);
const activities = ref<LotteryApi.Activity[]>([]);
// 活动列表后端不分页(ActivityListRes 只有 list), 所以这里没有分页器
const actSearch = reactive({ status: "" });

async function fetchActivities() {
  actLoading.value = true;
  try {
    const res = await getLotteryActivitiesApi({ status: actSearch.status });
    activities.value = res.list || [];
  } finally {
    actLoading.value = false;
  }
}
function resetActSearch() {
  actSearch.status = "";
  fetchActivities();
}

const actDialog = ref(false);
const actIsEdit = ref(false);
const actSaving = ref(false);
const actFormRef = ref();
const emptyAct = () => ({
  id: 0,
  name: "",
  lottery_type: 2,
  pay_type: 2,
  cost_gold: 10,
  daily_free: 1,
  daily_limit: 0,
  notice: "",
  status: 1,
});
const actForm = reactive(emptyAct());
const actRules = {
  name: [{ required: true, message: "活动名必填", trigger: "blur" }],
};

function openActCreate() {
  actIsEdit.value = false;
  Object.assign(actForm, emptyAct());
  actDialog.value = true;
}
function openActEdit(row: LotteryApi.Activity) {
  actIsEdit.value = true;
  Object.assign(actForm, {
    id: row.id,
    name: row.name,
    lottery_type: row.lottery_type,
    pay_type: row.pay_type,
    cost_gold: row.cost_gold,
    daily_free: row.daily_free,
    daily_limit: row.daily_limit,
    notice: row.notice,
    status: row.status,
  });
  actDialog.value = true;
}
async function saveActivity() {
  await actFormRef.value?.validate();
  const body: LotteryApi.ActivityBody = {
    name: actForm.name.trim(),
    pay_type: actForm.pay_type,
    cost_gold: Number(actForm.cost_gold) || 0,
    daily_free: Number(actForm.daily_free) || 0,
    daily_limit: Number(actForm.daily_limit) || 0,
    notice: actForm.notice,
    status: actForm.status,
  };
  // lottery_type 只在新增时提交: 后端 ActivityUpdateReq 里根本没有这个字段,
  // 玩法类型是活动的身份(前台按 type 找活动), 建好后不允许改。
  if (!actIsEdit.value) body.lottery_type = actForm.lottery_type;
  actSaving.value = true;
  try {
    if (actIsEdit.value) {
      await updateLotteryActivityApi(actForm.id, body);
      ElMessage.success("已保存");
    } else {
      await createLotteryActivityApi(body);
      ElMessage.success("已新增");
    }
    actDialog.value = false;
    fetchActivities();
  } finally {
    actSaving.value = false;
  }
}
async function deleteActivity(row: LotteryApi.Activity) {
  await ElMessageBox.confirm(
    `确认删除活动「${row.name}」? 它下面的**所有奖品会被一并删除**, 已产生的中奖记录保留。`,
    "危险操作",
    { type: "warning" },
  );
  await deleteLotteryActivityApi(row.id);
  ElMessage.success("已删除");
  fetchActivities();
  if (prizeSearch.activity_id === String(row.id)) {
    prizeSearch.activity_id = "";
    fetchPrizes();
  }
}

/* --------------------------------- Tab2: 奖品 --------------------------------- */

const prizeLoading = ref(false);
const prizes = ref<LotteryApi.Prize[]>([]);
// 奖品列表同样不分页; activity_id 是 string 筛选参数, 空串=全部活动
const prizeSearch = reactive({ activity_id: "" });

async function fetchPrizes() {
  prizeLoading.value = true;
  try {
    const res = await getLotteryPrizesApi({
      activity_id: prizeSearch.activity_id,
    });
    prizes.value = res.list || [];
  } finally {
    prizeLoading.value = false;
  }
}

/**
 * 每个活动的"启用奖品 odds 总和"。
 * 后端抽奖是按权重轮盘: 命中概率 = 本奖品 odds / 该活动所有 status=1 奖品的 odds 之和,
 * 所以总和必须按 activity_id 分组算 —— 跨活动求和会算出完全错误的概率。
 * 禁用(status=0)的奖品不进轮盘, 不计入分母。
 */
const oddsSumByActivity = computed(() => {
  const sum: Record<number, number> = {};
  for (const p of prizes.value) {
    if (p.status !== 1) continue;
    sum[p.activity_id] = (sum[p.activity_id] || 0) + (Number(p.odds) || 0);
  }
  return sum;
});
/** 实时折算的中奖概率; 禁用奖品不进轮盘、总权重为 0 时无意义, 统一显示 "-" */
function prizeRateText(row: LotteryApi.Prize): string {
  if (row.status !== 1) return "-";
  const total = oddsSumByActivity.value[row.activity_id] || 0;
  if (total <= 0) return "-";
  return `${(((Number(row.odds) || 0) / total) * 100).toFixed(2)}%`;
}
function activityName(id: number) {
  return activities.value.find((a) => a.id === id)?.name ?? `#${id}`;
}

const prizeDialog = ref(false);
const prizeIsEdit = ref(false);
const prizeSaving = ref(false);
const prizeFormRef = ref();
const emptyPrize = () => ({
  id: 0,
  activity_id: 0,
  name: "",
  cover: "",
  desc: "",
  type: 1,
  amount: 0,
  coupon_tpl_id: 0,
  odds: 100,
  stock: -1,
  rank: 0,
  status: 1,
  // stock=-1 是后端约定的"不限量"哨兵值, 表单里用开关表达, 提交时再翻译回去
  unlimitedStock: true,
});
const prizeForm = reactive(emptyPrize());
const prizeRules = {
  name: [{ required: true, message: "奖品名必填", trigger: "blur" }],
};

function openPrizeCreate() {
  prizeIsEdit.value = false;
  Object.assign(prizeForm, emptyPrize());
  // 默认落到当前筛选的活动上, 省得运营再选一次
  prizeForm.activity_id = Number(prizeSearch.activity_id) || 0;
  prizeDialog.value = true;
}
function openPrizeEdit(row: LotteryApi.Prize) {
  prizeIsEdit.value = true;
  Object.assign(prizeForm, {
    id: row.id,
    activity_id: row.activity_id,
    name: row.name,
    cover: row.cover,
    desc: row.desc,
    type: row.type,
    amount: row.amount,
    coupon_tpl_id: row.coupon_tpl_id,
    odds: row.odds,
    stock: row.stock < 0 ? 0 : row.stock,
    rank: row.rank,
    status: row.status,
    unlimitedStock: row.stock < 0,
  });
  prizeDialog.value = true;
}
async function savePrize() {
  await prizeFormRef.value?.validate();
  if (!prizeIsEdit.value && !prizeForm.activity_id) {
    ElMessage.warning("请选择所属活动");
    return;
  }
  // 优惠券奖品必须绑券模板, 后端 PrizeCreate 也会拦, 这里先给即时反馈
  if (prizeForm.type === 3 && Number(prizeForm.coupon_tpl_id) <= 0) {
    ElMessage.warning("优惠券奖品必须指定券模板 ID");
    return;
  }
  const body: LotteryApi.PrizeBody = {
    name: prizeForm.name.trim(),
    cover: prizeForm.cover,
    desc: prizeForm.desc,
    type: prizeForm.type,
    amount: Number(prizeForm.amount) || 0,
    coupon_tpl_id: Number(prizeForm.coupon_tpl_id) || 0,
    odds: Number(prizeForm.odds) || 0,
    stock: prizeForm.unlimitedStock ? -1 : Number(prizeForm.stock) || 0,
    rank: Number(prizeForm.rank) || 0,
    status: prizeForm.status,
  };
  if (!prizeIsEdit.value) body.activity_id = prizeForm.activity_id;
  prizeSaving.value = true;
  try {
    if (prizeIsEdit.value) {
      await updateLotteryPrizeApi(prizeForm.id, body);
      ElMessage.success("已保存");
    } else {
      await createLotteryPrizeApi(body);
      ElMessage.success("已新增");
    }
    prizeDialog.value = false;
    fetchPrizes();
  } finally {
    prizeSaving.value = false;
  }
}
async function deletePrize(row: LotteryApi.Prize) {
  await ElMessageBox.confirm(
    `确认删除奖品「${row.name}」? 删除后同活动其它奖品的中奖概率会随权重总和变化而改变。`,
    "提示",
    { type: "warning" },
  );
  await deleteLotteryPrizeApi(row.id);
  ElMessage.success("已删除");
  fetchPrizes();
}

/* ------------------------------- Tab3: 中奖记录 ------------------------------- */

const hisLoading = ref(false);
const histories = ref<LotteryApi.History[]>([]);
const hisPage = reactive({ current: 1, size: 20, total: 0 });
// 筛选项一律 string, 空串=全部
const hisSearch = reactive({
  user_id: "",
  lottery_type: "",
  prize_type: "",
  status: "",
});

async function fetchHistories() {
  hisLoading.value = true;
  try {
    const res = await getLotteryHistoriesApi({
      user_id: hisSearch.user_id,
      lottery_type: hisSearch.lottery_type,
      prize_type: hisSearch.prize_type,
      status: hisSearch.status,
      page: hisPage.current,
      size: hisPage.size,
    });
    histories.value = res.list || [];
    hisPage.total = res.total || 0;
  } finally {
    hisLoading.value = false;
  }
}
function doHisSearch() {
  hisPage.current = 1;
  fetchHistories();
}
function resetHisSearch() {
  hisSearch.user_id = "";
  hisSearch.lottery_type = "";
  hisSearch.prize_type = "";
  hisSearch.status = "";
  doHisSearch();
}

/* -------------------------------- Tab4: 收货单 -------------------------------- */

const addrLoading = ref(false);
const addrs = ref<LotteryApi.Addr[]>([]);
const addrPage = reactive({ current: 1, size: 20, total: 0 });
const addrSearch = reactive({ delivery_status: "", user_id: "" });

async function fetchAddrs() {
  addrLoading.value = true;
  try {
    const res = await getLotteryAddressesApi({
      delivery_status: addrSearch.delivery_status,
      user_id: addrSearch.user_id,
      page: addrPage.current,
      size: addrPage.size,
    });
    addrs.value = res.list || [];
    addrPage.total = res.total || 0;
  } finally {
    addrLoading.value = false;
  }
}
function doAddrSearch() {
  addrPage.current = 1;
  fetchAddrs();
}
function resetAddrSearch() {
  addrSearch.delivery_status = "";
  addrSearch.user_id = "";
  doAddrSearch();
}

const shipDialog = ref(false);
const shipping = ref(false);
const shipForm = reactive({ id: 0, express_no: "", receiver: "", address: "" });

/**
 * 发货状态机: 0待用户填写 → 1待发货 → 2已发货, 只能单向前进。
 * 后端是条件更新 `WHERE delivery_status=1`, 影响行数为 0 就报错, 所以:
 * - 0 状态点发货必然失败(地址都还没有, 发给谁?), 这里直接在前端拦掉并提示;
 * - 2 状态重复点也会被拦(天然幂等), 这里同样不给按钮。
 */
function openShip(row: LotteryApi.Addr) {
  if (row.delivery_status === 0) {
    ElMessage.warning("该用户尚未填写收货地址, 请等用户填写后再发货");
    return;
  }
  if (row.delivery_status === 2) {
    ElMessage.info("该收货单已发货, 不能重复发货");
    return;
  }
  Object.assign(shipForm, {
    id: row.id,
    express_no: "",
    receiver: row.receiver,
    address: row.address,
  });
  shipDialog.value = true;
}
async function confirmShip() {
  if (!shipForm.express_no.trim()) {
    ElMessage.warning("快递单号必填");
    return;
  }
  shipping.value = true;
  try {
    await shipLotteryAddressApi(shipForm.id, shipForm.express_no.trim());
    ElMessage.success("已标记发货, 对应中奖记录同步为已发货");
    shipDialog.value = false;
    fetchAddrs();
  } finally {
    shipping.value = false;
  }
}

function onTabChange(name: number | string) {
  if (name === "activity") fetchActivities();
  else if (name === "prize") fetchPrizes();
  else if (name === "history") fetchHistories();
  else if (name === "addr") fetchAddrs();
}

onMounted(async () => {
  // 活动列表是奖品 Tab 的下拉数据源, 无论进哪个 Tab 都先拉一次
  await fetchActivities();
});
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <ElTabs v-model="activeTab" type="border-card" @tab-change="onTabChange">
        <!-- ---------------------------- 活动 ---------------------------- -->
        <ElTabPane label="抽奖活动" name="activity">
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <ElSelect
              v-model="actSearch.status"
              style="width: 130px"
              @change="fetchActivities"
            >
              <ElOption label="全部状态" value="" />
              <ElOption label="启用" value="1" />
              <ElOption label="停用" value="0" />
            </ElSelect>
            <ElButton type="primary" @click="fetchActivities">查询</ElButton>
            <ElButton @click="resetActSearch">重置</ElButton>
            <div class="flex-1"></div>
            <ElButton type="primary" @click="openActCreate">新增活动</ElButton>
          </div>

          <ElTable v-loading="actLoading" :data="activities" border stripe>
            <ElTableColumn prop="id" label="ID" width="70" />
            <ElTableColumn prop="name" label="活动名" min-width="150" show-overflow-tooltip />
            <ElTableColumn label="玩法" width="110" align="center">
              <template #default="{ row }">
                <ElTag :type="row.lottery_type === 1 ? 'warning' : 'success'" size="small">
                  {{ lotteryTypeMap[row.lottery_type] ?? row.lottery_type }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="消耗方式" width="110" align="center">
              <template #default="{ row }">
                {{ payTypeMap[row.pay_type] ?? row.pay_type }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="单次金币" width="110" align="right">
              <template #default="{ row }">
                {{ Number(row.cost_gold).toFixed(2) }}
              </template>
            </ElTableColumn>
            <ElTableColumn prop="daily_free" label="每日免费" width="100" align="center" />
            <ElTableColumn label="每日上限" width="100" align="center">
              <template #default="{ row }">
                {{ row.daily_limit === 0 ? "不限" : row.daily_limit }}
              </template>
            </ElTableColumn>
            <ElTableColumn prop="notice" label="活动说明" min-width="200" show-overflow-tooltip />
            <ElTableColumn label="状态" width="90" align="center">
              <template #default="{ row }">
                <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? "启用" : "停用" }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="created_at" label="创建时间" width="170" />
            <ElTableColumn label="操作" width="190" fixed="right">
              <template #default="{ row }">
                <ElButton
                  link
                  type="primary"
                  @click="
                    activeTab = 'prize';
                    prizeSearch.activity_id = String(row.id);
                    fetchPrizes();
                  "
                >
                  奖品
                </ElButton>
                <ElButton link type="primary" @click="openActEdit(row)">编辑</ElButton>
                <ElButton link type="danger" @click="deleteActivity(row)">删除</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>

        <!-- ---------------------------- 奖品 ---------------------------- -->
        <ElTabPane label="奖品配置" name="prize">
          <ElAlert type="warning" :closable="false" show-icon class="mb-4">
            <template #title>odds 是整数权重, 不是百分比</template>
            <div class="text-xs leading-5">
              后端按权重轮盘抽奖:
              <b>某奖品中奖概率 = 该奖品 odds ÷ 同一活动内所有「启用」奖品 odds 之和</b>。
              所以填 10 不等于 10%; 改任意一个奖品的 odds, 同活动其它奖品的实际概率都会跟着变。
              下表「实时概率」列就是按当前列表数据算出来的折算值(禁用奖品不进轮盘, 不计入分母,
              显示为 -)。跨活动查看时按各自活动分别求和, 不会串。
            </div>
          </ElAlert>

          <div class="mb-4 flex flex-wrap items-center gap-2">
            <ElSelect
              v-model="prizeSearch.activity_id"
              placeholder="全部活动"
              style="width: 220px"
              clearable
              @change="fetchPrizes"
            >
              <ElOption
                v-for="a in activities"
                :key="a.id"
                :label="`#${a.id} ${a.name}`"
                :value="String(a.id)"
              />
            </ElSelect>
            <ElButton type="primary" @click="fetchPrizes">查询</ElButton>
            <ElButton
              @click="
                prizeSearch.activity_id = '';
                fetchPrizes();
              "
            >
              重置
            </ElButton>
            <div class="flex-1"></div>
            <ElButton type="primary" @click="openPrizeCreate">新增奖品</ElButton>
          </div>

          <ElTable v-loading="prizeLoading" :data="prizes" border stripe>
            <ElTableColumn prop="id" label="ID" width="70" />
            <ElTableColumn label="所属活动" width="150" show-overflow-tooltip>
              <template #default="{ row }">
                {{ activityName(row.activity_id) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="封面" width="80">
              <template #default="{ row }">
                <ElImage
                  v-if="row.cover"
                  :src="row.cover"
                  fit="cover"
                  style="width: 44px; height: 44px"
                  preview-teleported
                  :preview-src-list="[row.cover]"
                />
                <span v-else class="text-gray-400">-</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="name" label="奖品名" min-width="130" show-overflow-tooltip />
            <ElTableColumn label="类型" width="100" align="center">
              <template #default="{ row }">
                <ElTag size="small">{{ prizeTypeMap[row.type] ?? row.type }}</ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="数额" width="110" align="right">
              <template #default="{ row }">
                <span v-if="row.type === 3">券模板 #{{ row.coupon_tpl_id }}</span>
                <span v-else-if="row.type === 5" class="text-gray-400">-</span>
                <span v-else>{{ Number(row.amount).toFixed(2) }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="权重 odds" width="100" align="center">
              <template #default="{ row }">
                <ElTag type="warning" size="small">{{ row.odds }}</ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="实时概率" width="110" align="center">
              <template #default="{ row }">
                <span v-if="prizeRateText(row) === '-'" class="text-gray-400">-</span>
                <b v-else class="text-blue-500">{{ prizeRateText(row) }}</b>
              </template>
            </ElTableColumn>
            <ElTableColumn label="库存" width="90" align="center">
              <template #default="{ row }">
                <ElTag v-if="row.stock < 0" type="info" size="small">不限量</ElTag>
                <span v-else>{{ row.stock }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="awarded" label="已发放" width="80" align="center" />
            <ElTableColumn prop="rank" label="排序" width="70" align="center" />
            <ElTableColumn label="状态" width="90" align="center">
              <template #default="{ row }">
                <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? "启用" : "停用" }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="130" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="openPrizeEdit(row)">编辑</ElButton>
                <ElButton link type="danger" @click="deletePrize(row)">删除</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>

        <!-- --------------------------- 中奖记录 --------------------------- -->
        <ElTabPane label="中奖记录" name="history">
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <ElInput
              v-model="hisSearch.user_id"
              placeholder="用户ID"
              style="width: 130px"
              clearable
              @keyup.enter="doHisSearch"
            />
            <ElSelect v-model="hisSearch.lottery_type" style="width: 140px" @change="doHisSearch">
              <ElOption label="全部玩法" value="" />
              <ElOption label="会员日抽奖" value="1" />
              <ElOption label="福利抽奖" value="2" />
            </ElSelect>
            <ElSelect v-model="hisSearch.prize_type" style="width: 140px" @change="doHisSearch">
              <ElOption label="全部奖品类型" value="" />
              <ElOption label="金币" value="1" />
              <ElOption label="VIP天数" value="2" />
              <ElOption label="优惠券" value="3" />
              <ElOption label="实物" value="4" />
              <ElOption label="谢谢参与" value="5" />
            </ElSelect>
            <ElSelect v-model="hisSearch.status" style="width: 130px" @change="doHisSearch">
              <ElOption label="全部状态" value="" />
              <ElOption label="已发放" value="1" />
              <ElOption label="待发货" value="2" />
              <ElOption label="已发货" value="3" />
            </ElSelect>
            <ElButton type="primary" @click="doHisSearch">查询</ElButton>
            <ElButton @click="resetHisSearch">重置</ElButton>
          </div>

          <ElTable v-loading="hisLoading" :data="histories" border stripe>
            <ElTableColumn prop="id" label="ID" width="80" />
            <ElTableColumn prop="user_id" label="用户ID" width="90" />
            <ElTableColumn prop="nickname" label="昵称" width="130" show-overflow-tooltip />
            <ElTableColumn label="玩法" width="110" align="center">
              <template #default="{ row }">
                {{ lotteryTypeMap[row.lottery_type] ?? row.lottery_type }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="消耗" width="130" align="right">
              <template #default="{ row }">
                <span v-if="row.pay_type === 1" class="text-gray-500">免费次数</span>
                <span v-else>{{ Number(row.cost_gold).toFixed(2) }} 金币</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="prize_name" label="奖品" min-width="140" show-overflow-tooltip />
            <ElTableColumn label="奖品类型" width="100" align="center">
              <template #default="{ row }">
                <ElTag size="small">
                  {{ row.prize_text || prizeTypeMap[row.prize_type] || row.prize_type }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="奖品数额" width="110" align="right">
              <template #default="{ row }">
                {{ Number(row.prize_amount).toFixed(2) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="状态" width="100" align="center">
              <template #default="{ row }">
                <ElTag :type="historyStatusMap[row.status]?.type" size="small">
                  {{ historyStatusMap[row.status]?.text ?? row.status }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="remark" label="备注" min-width="120" show-overflow-tooltip />
            <ElTableColumn prop="created_at" label="中奖时间" width="170" />
          </ElTable>

          <div class="mt-4 flex justify-end">
            <ElPagination
              v-model:current-page="hisPage.current"
              v-model:page-size="hisPage.size"
              :total="hisPage.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              @size-change="fetchHistories"
              @current-change="fetchHistories"
            />
          </div>
        </ElTabPane>

        <!-- ---------------------------- 收货单 ---------------------------- -->
        <ElTabPane label="实物收货单" name="addr">
          <ElAlert type="info" :closable="false" show-icon class="mb-4">
            <template #title>发货状态机</template>
            <div class="text-xs leading-5">
              <b>0 待用户填写 → 1 待发货 → 2 已发货</b>, 单向流转。
              用户中实物奖后系统先建一张空收货单(0), 用户在前台填完地址才变成 1;
              <b>只有 1 待发货能点「标记发货」</b>。后端用条件更新(WHERE delivery_status=1)保证幂等,
              重复发货或对 0 状态发货都会被拒绝并报错。发货成功会在同一事务里把对应中奖记录
              置为「已发货」。
            </div>
          </ElAlert>

          <div class="mb-4 flex flex-wrap items-center gap-2">
            <ElSelect
              v-model="addrSearch.delivery_status"
              style="width: 150px"
              @change="doAddrSearch"
            >
              <ElOption label="全部状态" value="" />
              <ElOption label="待用户填写" value="0" />
              <ElOption label="待发货" value="1" />
              <ElOption label="已发货" value="2" />
            </ElSelect>
            <ElInput
              v-model="addrSearch.user_id"
              placeholder="用户ID"
              style="width: 130px"
              clearable
              @keyup.enter="doAddrSearch"
            />
            <ElButton type="primary" @click="doAddrSearch">查询</ElButton>
            <ElButton @click="resetAddrSearch">重置</ElButton>
          </div>

          <ElTable v-loading="addrLoading" :data="addrs" border stripe>
            <ElTableColumn prop="id" label="ID" width="70" />
            <ElTableColumn prop="history_id" label="中奖记录" width="100" />
            <ElTableColumn prop="user_id" label="用户ID" width="90" />
            <ElTableColumn prop="nickname" label="昵称" width="120" show-overflow-tooltip />
            <ElTableColumn prop="prize_name" label="奖品" min-width="130" show-overflow-tooltip />
            <ElTableColumn label="收货人" width="100">
              <template #default="{ row }">
                {{ row.receiver || "-" }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="电话" width="130">
              <template #default="{ row }">
                {{ row.phone || "-" }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="收货地址" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.address || "-" }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="发货状态" width="110" align="center">
              <template #default="{ row }">
                <ElTag :type="deliveryStatusMap[row.delivery_status]?.type" size="small">
                  {{ deliveryStatusMap[row.delivery_status]?.text ?? row.delivery_status }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="快递单号" width="160">
              <template #default="{ row }">
                {{ row.express_no || "-" }}
              </template>
            </ElTableColumn>
            <ElTableColumn prop="created_at" label="创建时间" width="170" />
            <ElTableColumn label="操作" width="110" fixed="right">
              <template #default="{ row }">
                <ElButton
                  v-if="row.delivery_status === 1"
                  link
                  type="primary"
                  @click="openShip(row)"
                >
                  标记发货
                </ElButton>
                <span v-else-if="row.delivery_status === 0" class="text-xs text-gray-400">
                  等用户填写收货地址
                </span>
                <span v-else class="text-xs text-gray-400">已发货</span>
              </template>
            </ElTableColumn>
          </ElTable>

          <div class="mt-4 flex justify-end">
            <ElPagination
              v-model:current-page="addrPage.current"
              v-model:page-size="addrPage.size"
              :total="addrPage.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              @size-change="fetchAddrs"
              @current-change="fetchAddrs"
            />
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <!-- 活动表单 -->
    <ElDialog v-model="actDialog" :title="actIsEdit ? '编辑活动' : '新增活动'" width="600px">
      <ElForm ref="actFormRef" :model="actForm" :rules="actRules" label-width="110px">
        <ElFormItem label="活动名" prop="name">
          <ElInput v-model="actForm.name" />
        </ElFormItem>
        <ElFormItem label="玩法类型">
          <ElSelect v-model="actForm.lottery_type" style="width: 180px" :disabled="actIsEdit">
            <ElOption label="会员日抽奖" :value="1" />
            <ElOption label="福利抽奖" :value="2" />
          </ElSelect>
          <span class="ml-2 text-xs text-gray-400">
            前台按玩法找活动, 建好后不可修改
          </span>
        </ElFormItem>
        <ElFormItem label="消耗方式">
          <ElSelect v-model="actForm.pay_type" style="width: 180px">
            <ElOption label="仅免费次数" :value="1" />
            <ElOption label="金币" :value="2" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="单次金币">
          <ElInputNumber v-model="actForm.cost_gold" :min="0" :precision="2" />
          <span class="ml-2 text-xs text-gray-400">免费次数用完后每次扣的金币</span>
        </ElFormItem>
        <ElFormItem label="每日免费次数">
          <ElInputNumber v-model="actForm.daily_free" :min="0" />
        </ElFormItem>
        <ElFormItem label="每日抽奖上限">
          <ElInputNumber v-model="actForm.daily_limit" :min="0" />
          <span class="ml-2 text-xs text-gray-400">0 = 不限次</span>
        </ElFormItem>
        <ElFormItem label="活动说明">
          <ElInput v-model="actForm.notice" type="textarea" :rows="3" placeholder="展示给用户的规则文案" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="actForm.status" style="width: 140px">
            <ElOption label="启用" :value="1" />
            <ElOption label="停用" :value="0" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="actDialog = false">取消</ElButton>
        <ElButton type="primary" :loading="actSaving" @click="saveActivity">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 奖品表单 -->
    <ElDialog v-model="prizeDialog" :title="prizeIsEdit ? '编辑奖品' : '新增奖品'" width="620px">
      <ElForm ref="prizeFormRef" :model="prizeForm" :rules="prizeRules" label-width="110px">
        <ElFormItem label="所属活动">
          <ElSelect
            v-model="prizeForm.activity_id"
            style="width: 240px"
            :disabled="prizeIsEdit"
            placeholder="请选择活动"
          >
            <ElOption
              v-for="a in activities"
              :key="a.id"
              :label="`#${a.id} ${a.name}`"
              :value="a.id"
            />
          </ElSelect>
          <span v-if="prizeIsEdit" class="ml-2 text-xs text-gray-400">
            奖品不支持换活动
          </span>
        </ElFormItem>
        <ElFormItem label="奖品名" prop="name">
          <ElInput v-model="prizeForm.name" />
        </ElFormItem>
        <ElFormItem label="封面">
          <ElInput v-model="prizeForm.cover" placeholder="图片 URL" />
        </ElFormItem>
        <ElFormItem label="奖品描述">
          <ElInput v-model="prizeForm.desc" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="奖品类型">
          <ElSelect v-model="prizeForm.type" style="width: 180px">
            <ElOption label="金币" :value="1" />
            <ElOption label="VIP天数" :value="2" />
            <ElOption label="优惠券" :value="3" />
            <ElOption label="实物" :value="4" />
            <ElOption label="谢谢参与" :value="5" />
          </ElSelect>
        </ElFormItem>
        <!-- 金币/VIP天数/实物 才有数额; 优惠券走券模板, 谢谢参与没有数额 -->
        <ElFormItem v-if="[1, 2, 4].includes(prizeForm.type)" label="数额">
          <ElInputNumber v-model="prizeForm.amount" :min="0" :precision="2" />
          <span class="ml-2 text-xs text-gray-400">
            {{
              prizeForm.type === 1
                ? "发放的金币数"
                : prizeForm.type === 2
                  ? "赠送的 VIP 天数"
                  : "实物件数"
            }}
          </span>
        </ElFormItem>
        <ElFormItem v-if="prizeForm.type === 3" label="券模板ID">
          <ElInputNumber v-model="prizeForm.coupon_tpl_id" :min="0" />
          <span class="ml-2 text-xs text-gray-400">优惠券奖品必填, 后端会校验 &gt; 0</span>
        </ElFormItem>
        <ElFormItem label="权重 odds">
          <ElInputNumber v-model="prizeForm.odds" :min="0" />
          <span class="ml-2 text-xs text-gray-400">
            整数权重, 不是百分比! 实际概率 = 本值 ÷ 同活动全部启用奖品权重之和
          </span>
        </ElFormItem>
        <ElFormItem label="不限量">
          <ElSwitch v-model="prizeForm.unlimitedStock" />
          <span class="ml-2 text-xs text-gray-400">
            开启后提交 stock = -1(后端约定的不限量哨兵值, 不做库存递减)
          </span>
        </ElFormItem>
        <ElFormItem v-if="!prizeForm.unlimitedStock" label="库存">
          <ElInputNumber v-model="prizeForm.stock" :min="0" />
          <span class="ml-2 text-xs text-gray-400">发完即止, 0 表示已抽完</span>
        </ElFormItem>
        <ElFormItem label="排序">
          <ElInputNumber v-model="prizeForm.rank" :min="0" />
          <span class="ml-2 text-xs text-gray-400">升序展示, 只影响转盘展示顺序</span>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="prizeForm.status" style="width: 140px">
            <ElOption label="启用" :value="1" />
            <ElOption label="停用" :value="0" />
          </ElSelect>
          <span class="ml-2 text-xs text-gray-400">停用的奖品不进轮盘, 不计入权重分母</span>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="prizeDialog = false">取消</ElButton>
        <ElButton type="primary" :loading="prizeSaving" @click="savePrize">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 发货 -->
    <ElDialog v-model="shipDialog" title="标记发货" width="480px">
      <ElForm :model="shipForm" label-width="90px">
        <ElFormItem label="收货人">
          <span>{{ shipForm.receiver }}</span>
        </ElFormItem>
        <ElFormItem label="收货地址">
          <span>{{ shipForm.address }}</span>
        </ElFormItem>
        <ElFormItem label="快递单号">
          <ElInput v-model="shipForm.express_no" placeholder="必填, 如 SF1234567890" />
        </ElFormItem>
      </ElForm>
      <div class="text-xs text-gray-400">
        提交后收货单变为「已发货」且不可回退, 对应中奖记录同步为已发货。
      </div>
      <template #footer>
        <ElButton @click="shipDialog = false">取消</ElButton>
        <ElButton type="primary" :loading="shipping" @click="confirmShip">确认发货</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
