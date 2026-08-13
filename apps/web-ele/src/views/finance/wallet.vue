<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import {
  adjustWalletApi,
  getWalletLogsApi,
  type WalletApi,
} from "#/api/core/wallet";

defineOptions({ name: "FinanceWallet" });

// 场景码与 internal/shared/balance/balance.go 的 Scene* 常量逐字对齐,
// 后端是按字符串精确匹配过滤的, 拼错就查不到数据。
const sceneOpts = [
  { label: "全部场景", value: "" },
  { label: "提现冻结", value: "withdraw_freeze" },
  { label: "提现退款", value: "withdraw_refund" },
  { label: "人工调账", value: "admin_adjust" },
  { label: "内容购买", value: "content_buy" },
  { label: "抽奖消耗", value: "lottery_cost" },
  { label: "抽奖奖励", value: "lottery_prize" },
  { label: "AI扣费", value: "ai_cost" },
  { label: "AI退款", value: "ai_refund" },
];
const sceneTextMap: Record<string, string> = Object.fromEntries(
  sceneOpts.filter((o) => o.value).map((o) => [o.value, o.label]),
);
// 收入=绿色进项, 支出=红色出项; 场景码未知时原样显示, 便于发现后端新增场景
const sceneTagType = (scene: string) =>
  scene in sceneTextMap ? "info" : "warning";

const directionOpts = [
  { label: "全部方向", value: "" },
  { label: "收入", value: "1" },
  { label: "支出", value: "2" },
];

/** 金额统一两位小数, 后端 float64 直出可能是 3080 这种整数形态 */
function money(v: number | undefined) {
  return Number(v ?? 0).toFixed(2);
}

const loading = ref(false);
const list = ref<WalletApi.LogItem[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
// 筛选值全部是 string, 空串=不筛选(后端按 string 收, 传 0 会被当成筛选 direction=0)
const search = reactive({ user_id: "", direction: "", scene: "" });

async function fetchList() {
  loading.value = true;
  try {
    const res = await getWalletLogsApi({
      user_id: search.user_id,
      direction: search.direction,
      scene: search.scene,
      page: page.current,
      size: page.size,
    });
    list.value = res.list || [];
    page.total = res.total || 0;
  } finally {
    loading.value = false;
  }
}
function doSearch() {
  page.current = 1;
  fetchList();
}
function resetSearch() {
  search.user_id = "";
  search.direction = "";
  search.scene = "";
  doSearch();
}

// ---------- 人工调账 ----------
const adjDialog = ref(false);
const adjSaving = ref(false);
const adjRef = ref();
const adjForm = reactive({ user_id: 0, amount: 0, remark: "" });
const adjRules = {
  user_id: [{ required: true, message: "用户ID必填", trigger: "blur" }],
  remark: [{ required: true, message: "调账备注必填", trigger: "blur" }],
};

function openAdjust(userId = 0) {
  Object.assign(adjForm, { user_id: userId, amount: 0, remark: "" });
  adjDialog.value = true;
}

async function submitAdjust() {
  await adjRef.value?.validate();
  if (!adjForm.user_id || adjForm.user_id <= 0) {
    ElMessage.warning("用户ID必填");
    return;
  }
  // 后端 Adjust 明确拒绝 amount=0, 这里先拦一次避免白跑一趟
  if (!adjForm.amount) {
    ElMessage.warning("调账金额不能为 0");
    return;
  }
  adjSaving.value = true;
  try {
    const res = await adjustWalletApi({
      user_id: Number(adjForm.user_id),
      amount: Number(adjForm.amount),
      remark: adjForm.remark,
    });
    ElMessage.success(`调账成功，该用户当前余额 ${money(res?.balance)} 金币`);
    adjDialog.value = false;
    doSearch(); // 调账会写一条 admin_adjust 流水, 刷新列表让运营立刻看到
  } finally {
    adjSaving.value = false;
  }
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <ElInput
          v-model="search.user_id"
          placeholder="用户ID"
          style="width: 140px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElSelect
          v-model="search.direction"
          style="width: 130px"
          @change="doSearch"
        >
          <ElOption
            v-for="o in directionOpts"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </ElSelect>
        <ElSelect v-model="search.scene" style="width: 160px" @change="doSearch">
          <ElOption
            v-for="o in sceneOpts"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </ElSelect>
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
        <div class="flex-1"></div>
        <ElButton type="warning" @click="openAdjust()">人工调账</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="80" />
        <ElTableColumn prop="user_id" label="用户ID" width="90" />
        <ElTableColumn label="方向" width="80" align="center">
          <template #default="{ row }">
            <ElTag
              :type="row.direction === 1 ? 'success' : 'danger'"
              size="small"
            >
              {{ row.direction === 1 ? "收入" : "支出" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="场景" width="120">
          <template #default="{ row }">
            <ElTag :type="sceneTagType(row.scene)" size="small">
              {{ sceneTextMap[row.scene] ?? row.scene }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="金额" width="130" align="right">
          <template #default="{ row }">
            <!-- 收入绿 + 前缀 "+", 支出红 + 前缀 "-", 金额本身后端一律存正数 -->
            <span
              :class="
                row.direction === 1
                  ? 'font-medium text-green-600'
                  : 'font-medium text-red-500'
              "
            >
              {{ row.direction === 1 ? "+" : "-" }}{{ money(row.amount) }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="变动前" width="120" align="right">
          <template #default="{ row }">
            <span class="text-gray-500">{{ money(row.balance_before) }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="变动后" width="120" align="right">
          <template #default="{ row }">
            <span
              :class="
                row.direction === 1 ? 'text-green-600' : 'text-red-500'
              "
            >
              {{ money(row.balance_after) }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn
          prop="ref_id"
          label="关联单号"
          min-width="180"
          show-overflow-tooltip
        />
        <ElTableColumn
          prop="remark"
          label="备注"
          min-width="160"
          show-overflow-tooltip
        />
        <ElTableColumn prop="created_at" label="时间" width="170" />
        <ElTableColumn label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openAdjust(row.user_id)">
              调账
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-4 flex justify-end">
        <ElPagination
          v-model:current-page="page.current"
          v-model:page-size="page.size"
          :total="page.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </ElCard>

    <!-- 人工调账 -->
    <ElDialog v-model="adjDialog" title="人工调账" width="520px">
      <ElForm ref="adjRef" :model="adjForm" :rules="adjRules" label-width="90px">
        <ElFormItem label="用户ID" prop="user_id">
          <ElInputNumber v-model="adjForm.user_id" :min="0" :controls="false" />
        </ElFormItem>
        <ElFormItem label="调账金额">
          <ElInputNumber v-model="adjForm.amount" :precision="2" :step="10" />
        </ElFormItem>
        <ElFormItem label="备注" prop="remark">
          <ElInput
            v-model="adjForm.remark"
            type="textarea"
            :rows="3"
            placeholder="必填，写清调账原因（工单号 / 补偿依据），会记进流水备注"
          />
        </ElFormItem>
        <div class="ml-[90px] rounded bg-amber-50 p-2 text-xs leading-6 text-amber-700">
          <div>
            <b>正数 = 加币</b>，<b>负数 = 扣币</b>（如 -100 表示扣除 100 金币）。
          </div>
          <div>
            扣款不会把余额扣成负数：后端用条件更新
            <code>WHERE balance &gt;= 扣款额</code>
            拦截，余额不足会直接失败，不会出现负余额。
          </div>
          <div>调账会写入一条 admin_adjust 场景的流水，可追溯到操作管理员。</div>
        </div>
      </ElForm>
      <template #footer>
        <ElButton @click="adjDialog = false">取消</ElButton>
        <ElButton type="primary" :loading="adjSaving" @click="submitAdjust">
          确认调账
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>
