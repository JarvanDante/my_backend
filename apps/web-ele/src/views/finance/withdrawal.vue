<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

import {
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import {
  auditWithdrawalApi,
  getWithdrawalListApi,
  markPaidWithdrawalApi,
  refundWithdrawalApi,
  type WithdrawalApi,
} from "#/api/core/withdrawal";

defineOptions({ name: "FinanceWithdrawal" });

// 状态取值见 internal/modules/withdrawal/service/withdrawal.go(没有 3)。
// 文案一律用后端返回的 status_text，前端只负责挑颜色，避免两边翻译不一致。
const statusOpts = [
  { label: "全部状态", value: "" },
  // 后端 StatusText(1) 返回的是"审核中"，筛选项跟它对齐，免得和表格里的文案对不上
  { label: "审核中", value: "1" },
  { label: "审核通过(待打款)", value: "2" },
  { label: "已打款", value: "4" },
  { label: "已拒绝", value: "5" },
  { label: "已撤回", value: "6" },
];
const statusTagType: Record<
  number,
  "danger" | "info" | "primary" | "success" | "warning"
> = {
  1: "warning",
  2: "primary",
  4: "success",
  5: "danger",
  6: "info",
};
/** 终态: 已打款/已拒绝/已撤回，后端条件更新不再接受任何迁移，前端也不给按钮 */
const isFinal = (status: number) => [4, 5, 6].includes(status);

function money(v: number | undefined) {
  return Number(v ?? 0).toFixed(2);
}

const loading = ref(false);
const list = ref<WithdrawalApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
// 筛选值全部是 string, 空串=不筛选
const search = reactive({ status: "", user_id: "" });
const stat = reactive({ sum_amount: 0, pending_num: 0 });

async function fetchList() {
  loading.value = true;
  try {
    const res = await getWithdrawalListApi({
      status: search.status,
      user_id: search.user_id,
      page: page.current,
      size: page.size,
    });
    list.value = res.list || [];
    page.total = res.total || 0;
    stat.sum_amount = res.sum_amount || 0;
    stat.pending_num = res.pending_num || 0;
  } finally {
    loading.value = false;
  }
}
function doSearch() {
  page.current = 1;
  fetchList();
}
function resetSearch() {
  search.status = "";
  search.user_id = "";
  doSearch();
}

async function copyText(text: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制账号");
  } catch {
    // 非 HTTPS 环境下 clipboard API 不可用，降级到 execCommand
    const el = document.createElement("textarea");
    el.value = text;
    document.body.append(el);
    el.select();
    document.execCommand("copy");
    el.remove();
    ElMessage.success("已复制账号");
  }
}

// ---------- 操作弹窗(审核 / 打款 / 退款共用一个) ----------
type ActMode = "paid" | "pass" | "refund" | "reject";
const actDialog = ref(false);
const actSaving = ref(false);
const actMode = ref<ActMode>("pass");
const actRow = ref<null | WithdrawalApi.Item>(null);
const actForm = reactive({ voucher: "", remark: "" });

const actTitle = computed(
  () =>
    ({
      paid: "标记已打款",
      pass: "审核通过",
      refund: "打款失败退款",
      reject: "审核拒绝",
    })[actMode.value],
);

function openAct(row: WithdrawalApi.Item, mode: ActMode) {
  actRow.value = row;
  actMode.value = mode;
  actForm.voucher = "";
  actForm.remark = "";
  actDialog.value = true;
}

async function submitAct() {
  const row = actRow.value;
  if (!row) return;
  // 会动余额的两个操作(拒绝、打款失败退款)必须二次确认，说明退款语义
  if (actMode.value === "reject") {
    await ElMessageBox.confirm(
      `确认拒绝 ${row.trade_no}（申请 ${money(row.amount)} 金币）？拒绝将自动退回用户余额。`,
      "拒绝提现",
      { type: "warning", confirmButtonText: "确认拒绝并退款" },
    );
  }
  if (actMode.value === "refund") {
    await ElMessageBox.confirm(
      `确认对 ${row.trade_no} 执行打款失败退款？${money(row.amount)} 金币将退回用户余额，单据置为已拒绝（终态）。`,
      "打款失败退款",
      { type: "warning", confirmButtonText: "确认退款" },
    );
  }
  actSaving.value = true;
  try {
    switch (actMode.value) {
      case "paid": {
        await markPaidWithdrawalApi(row.id, actForm.voucher, actForm.remark);
        ElMessage.success("已标记打款");
        break;
      }
      case "pass": {
        await auditWithdrawalApi(row.id, true, actForm.remark);
        ElMessage.success("已通过，等待打款");
        break;
      }
      case "refund": {
        await refundWithdrawalApi(row.id, actForm.remark);
        ElMessage.success("已退款");
        break;
      }
      case "reject": {
        await auditWithdrawalApi(row.id, false, actForm.remark);
        ElMessage.success("已拒绝，金额已退回用户余额");
        break;
      }
    }
    actDialog.value = false;
    // 后端所有迁移都是条件更新，重复点会报"当前状态不允许该操作"，
    // 因此每次成功后都必须重新拉列表，保证按钮和真实状态一致。
    fetchList();
  } finally {
    actSaving.value = false;
  }
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <!-- 统计卡片: sum_amount 跟随当前筛选，pending_num 是全局待审笔数 -->
    <div class="mb-4 flex flex-wrap gap-4">
      <ElCard shadow="never" class="min-w-[240px] flex-1">
        <div class="text-sm text-gray-500">当前筛选申请总额（金币）</div>
        <div class="mt-1 text-2xl font-semibold text-blue-600">
          {{ money(stat.sum_amount) }}
        </div>
      </ElCard>
      <ElCard shadow="never" class="min-w-[240px] flex-1">
        <div class="text-sm text-gray-500">待审核笔数（全站）</div>
        <div class="mt-1 text-2xl font-semibold text-orange-500">
          {{ stat.pending_num }}
        </div>
      </ElCard>
    </div>

    <ElCard shadow="never">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <ElSelect v-model="search.status" style="width: 180px" @change="doSearch">
          <ElOption
            v-for="o in statusOpts"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </ElSelect>
        <ElInput
          v-model="search.user_id"
          placeholder="用户ID"
          style="width: 140px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="70" />
        <ElTableColumn prop="trade_no" label="提现单号" width="185" />
        <ElTableColumn label="用户" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.nickname || "-" }}
            <span class="text-xs text-gray-400">#{{ row.user_id }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="申请金额" width="110" align="right">
          <template #default="{ row }">
            <span class="font-medium">{{ money(row.amount) }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="手续费" width="120" align="right">
          <template #default="{ row }">
            {{ money(row.fee) }}
            <span class="text-xs text-gray-400">({{ row.fee_rate }}%)</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="实付金额" width="110" align="right">
          <template #default="{ row }">
            <span class="font-medium text-green-600">
              {{ money(row.real_amount) }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="收款账户" min-width="250">
          <template #default="{ row }">
            <div class="text-sm">
              {{ row.account_name || "-" }}
              <span class="text-gray-400">/ {{ row.bank_name || "-" }}</span>
            </div>
            <div class="flex items-center gap-1 text-xs text-gray-500">
              <span>{{ row.account_no || "-" }}</span>
              <ElButton
                v-if="row.account_no"
                link
                type="primary"
                size="small"
                @click="copyText(row.account_no)"
              >
                复制
              </ElButton>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="110" align="center">
          <template #default="{ row }">
            <!-- 直接用后端的 status_text -->
            <ElTag :type="statusTagType[row.status] ?? 'info'" size="small">
              {{ row.status_text }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn
          prop="remark"
          label="备注"
          min-width="140"
          show-overflow-tooltip
        />
        <ElTableColumn prop="created_at" label="申请时间" width="170" />
        <ElTableColumn prop="paid_at" label="打款时间" width="170" />
        <ElTableColumn label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <!-- status=1 申请中: 只能审核 -->
            <template v-if="row.status === 1">
              <ElButton link type="success" @click="openAct(row, 'pass')">
                通过
              </ElButton>
              <ElButton link type="danger" @click="openAct(row, 'reject')">
                拒绝
              </ElButton>
            </template>
            <!-- status=2 待打款: 只能标记打款或退款 -->
            <template v-else-if="row.status === 2">
              <ElButton link type="primary" @click="openAct(row, 'paid')">
                标记打款
              </ElButton>
              <ElButton link type="warning" @click="openAct(row, 'refund')">
                打款失败退款
              </ElButton>
            </template>
            <!-- 终态(4/5/6): 无任何可迁移操作 -->
            <span v-else-if="isFinal(row.status)" class="text-xs text-gray-400">
              已结束
            </span>
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

    <!-- 审核 / 打款 / 退款 -->
    <ElDialog v-model="actDialog" :title="actTitle" width="540px">
      <div v-if="actRow" class="mb-3 rounded bg-gray-50 p-3 text-sm leading-6">
        <div>
          单号：{{ actRow.trade_no }}
          <span class="ml-2 text-gray-400">
            用户 #{{ actRow.user_id }} {{ actRow.nickname }}
          </span>
        </div>
        <div>
          申请 {{ money(actRow.amount) }} 金币，手续费
          {{ money(actRow.fee) }}，实付 {{ money(actRow.real_amount) }}
        </div>
        <div class="text-gray-500">
          收款：{{ actRow.account_name }} / {{ actRow.bank_name }} /
          {{ actRow.account_no }}
        </div>
      </div>

      <div
        v-if="actMode === 'reject'"
        class="mb-3 rounded bg-red-50 p-2 text-xs leading-5 text-red-600"
      >
        拒绝将自动把申请金额原路退回用户余额（写一条 withdraw_refund
        收入流水），单据进入终态，不可再改。
      </div>
      <div
        v-else-if="actMode === 'refund'"
        class="mb-3 rounded bg-amber-50 p-2 text-xs leading-5 text-amber-700"
      >
        线下打款失败时使用：金额退回用户余额，单据置为「已拒绝」终态。已经真实打款成功的单据请勿点此。
      </div>
      <div
        v-else-if="actMode === 'paid'"
        class="mb-3 rounded bg-blue-50 p-2 text-xs leading-5 text-blue-600"
      >
        标记打款是终态操作，确认线下已转账成功再点。金额不会再退回。
      </div>
      <div
        v-else
        class="mb-3 rounded bg-blue-50 p-2 text-xs leading-5 text-blue-600"
      >
        通过后进入「待打款」，金额仍处于冻结状态，需线下转账后再来标记打款。
      </div>

      <ElForm :model="actForm" label-width="90px">
        <ElFormItem v-if="actMode === 'paid'" label="打款凭证">
          <ElInput
            v-model="actForm.voucher"
            placeholder="转账凭证图片 URL（选填，建议留存）"
          />
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput
            v-model="actForm.remark"
            type="textarea"
            :rows="3"
            placeholder="操作备注，会写入提现单 remark 字段"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="actDialog = false">取消</ElButton>
        <ElButton type="primary" :loading="actSaving" @click="submitAct">
          确认
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>
