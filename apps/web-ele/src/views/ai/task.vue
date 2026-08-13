<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElAlert,
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
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
  type AiTaskApi,
  getAiTaskListApi,
  refundAiTaskApi,
  retryAiTaskApi,
} from "#/api/core/aitask";

defineOptions({ name: "AiTask" });

const bizTypeMap: Record<number, string> = {
  1: "换脸",
  2: "脱衣",
  3: "文生图",
  4: "图生视频",
  5: "文生小说",
  6: "AI对话",
};

// 与 entity.AiStatus* 一一对应: 1排队中 2处理中 3成功 4失败 5已退款 6已取消
type TagType = "danger" | "info" | "primary" | "success" | "warning";
const statusMap: Record<number, { text: string; type: TagType }> = {
  1: { text: "排队中", type: "info" },
  2: { text: "处理中", type: "primary" },
  3: { text: "成功", type: "success" },
  4: { text: "失败", type: "danger" },
  5: { text: "已退款", type: "warning" },
  6: { text: "已取消", type: "info" },
};

const loading = ref(false);
const list = ref<AiTaskApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
// 筛选项一律 string, 空串=全部(后端 atoiOr(s,0) + `if f.X > 0` 才拼条件)
const search = reactive({
  user_id: "",
  biz_type: "",
  status: "",
  task_no: "",
});

async function fetchList() {
  loading.value = true;
  try {
    const res = await getAiTaskListApi({
      user_id: search.user_id,
      biz_type: search.biz_type,
      status: search.status,
      task_no: search.task_no || undefined,
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
  search.biz_type = "";
  search.status = "";
  search.task_no = "";
  doSearch();
}

/** jsonb 字段(params/result)格式化输出, 空对象显示占位 */
function prettyJson(obj: Record<string, any>) {
  if (!obj || Object.keys(obj).length === 0) return "(空)";
  return JSON.stringify(obj, null, 2);
}

// ---------- 详情弹窗 ----------
const detailDialog = ref(false);
const detail = ref<AiTaskApi.Item | null>(null);
function openDetail(row: AiTaskApi.Item) {
  detail.value = row;
  detailDialog.value = true;
}

// ---------- 重新提交 ----------
// 只有 排队中(1)/失败(4)/已退款(5) 可重试, 其余状态后端直接拒绝, 这里不展示按钮。
function canRetry(row: AiTaskApi.Item) {
  return row.status === 1 || row.status === 4 || row.status === 5;
}
async function handleRetry(row: AiTaskApi.Item) {
  // 失败/已退款的钱已经退回用户了, 重试是一次全新消耗 → 会按"当前"模板价重新扣费;
  // 排队中的钱还没退, 重试只是重投一次, 不会重复扣。二次确认必须把这点写清楚。
  const willCharge = row.status !== 1;
  await ElMessageBox.confirm(
    willCharge
      ? `任务 ${row.task_no} 当前为「${statusMap[row.status]?.text}」, 之前扣的金币已退回用户。` +
          `重新提交会按当前模板价**重新向用户扣费**(上次扣的是 ${Number(row.cost_gold).toFixed(2)} 金币), ` +
          `并换发新任务单号。用户余额不足会直接失败。确认重新提交?`
      : `任务 ${row.task_no} 当前为「排队中」, 金币尚未退回, 重新提交只会把同一单再投递一次, ` +
          `不会重复扣费。确认重新提交?`,
    "重新提交确认",
    { type: "warning", confirmButtonText: "确认重新提交" },
  );
  await retryAiTaskApi(row.id);
  ElMessage.success("已重新提交");
  fetchList();
}

// ---------- 人工退款 ----------
// 后端条件更新 WHERE status IN (1排队中, 2处理中, 4失败): 成功/已退款/已取消一律拒绝。
function canRefund(row: AiTaskApi.Item) {
  return row.status === 1 || row.status === 2 || row.status === 4;
}
async function handleRefund(row: AiTaskApi.Item) {
  const { value } = await ElMessageBox.prompt(
    `将把 ${Number(row.cost_gold).toFixed(2)} 金币退回用户 ${row.user_id} 的余额, ` +
      `任务状态置为「已退款」。仅排队中/处理中/失败的任务可退, 已成功/已退款/已取消会被后端拒绝; ` +
      `退款走条件更新, 重复点第二次只会报错, 不会退两次钱。确认退款?`,
    "人工退款确认",
    {
      type: "warning",
      confirmButtonText: "确认退款",
      inputPlaceholder: "退款备注(会写入任务 err_msg 与资金流水)",
      inputValue: "客服人工退款",
    },
  );
  const res = await refundAiTaskApi(row.id, value || "");
  ElMessage.success(`已退款 ${Number(res?.refund ?? 0).toFixed(2)} 金币`);
  fetchList();
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <ElAlert type="warning" :closable="false" show-icon class="mb-4">
        <template #title>操作须知</template>
        <div class="text-xs leading-5">
          <b>重新提交</b>: 失败/已退款的任务钱已退回用户,
          重试属于一次全新消耗, 会<b>按当前模板价重新扣费</b>并换新单号; 排队中的任务钱还没退,
          重试不重复扣。同一单连点两次, 第二次会被 CAS 拦下报"任务状态已变更"。
          <br />
          <b>人工退款</b>: 只有<b>排队中 / 处理中 / 失败</b>可退,
          已成功(东西给了)、已退款、已取消都会被后端条件更新拦掉, 天然幂等, 不会退两次钱。
        </div>
      </ElAlert>

      <div class="mb-4 flex flex-wrap items-center gap-2">
        <ElInput
          v-model="search.user_id"
          placeholder="用户ID"
          style="width: 130px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElSelect v-model="search.biz_type" style="width: 140px" @change="doSearch">
          <ElOption label="全部玩法" value="" />
          <ElOption label="换脸" value="1" />
          <ElOption label="脱衣" value="2" />
          <ElOption label="文生图" value="3" />
          <ElOption label="图生视频" value="4" />
          <ElOption label="文生小说" value="5" />
          <ElOption label="AI对话" value="6" />
        </ElSelect>
        <ElSelect v-model="search.status" style="width: 130px" @change="doSearch">
          <ElOption label="全部状态" value="" />
          <ElOption label="排队中" value="1" />
          <ElOption label="处理中" value="2" />
          <ElOption label="成功" value="3" />
          <ElOption label="失败" value="4" />
          <ElOption label="已退款" value="5" />
          <ElOption label="已取消" value="6" />
        </ElSelect>
        <ElInput
          v-model="search.task_no"
          placeholder="任务单号(精确匹配)"
          style="width: 220px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="70" />
        <ElTableColumn prop="task_no" label="任务单号" width="200" show-overflow-tooltip />
        <ElTableColumn prop="user_id" label="用户ID" width="90" />
        <ElTableColumn label="玩法" width="100" align="center">
          <template #default="{ row }">
            <ElTag size="small">{{ bizTypeMap[row.biz_type] ?? row.biz_type }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="template_id" label="模板ID" width="90" align="center" />
        <ElTableColumn label="消耗金币" width="110" align="right">
          <template #default="{ row }">
            {{ Number(row.cost_gold).toFixed(2) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="statusMap[row.status]?.type" size="small">
              {{ statusMap[row.status]?.text ?? row.status }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="provider" label="供应商" width="130" show-overflow-tooltip />
        <ElTableColumn prop="retry_count" label="重试次数" width="90" align="center" />
        <ElTableColumn label="错误信息" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.err_msg" class="text-red-500">{{ row.err_msg }}</span>
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="submitted_at" label="提交时间" width="170" />
        <ElTableColumn prop="finished_at" label="完成时间" width="170" />
        <ElTableColumn label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openDetail(row)">详情</ElButton>
            <ElButton v-if="canRetry(row)" link type="warning" @click="handleRetry(row)">
              重新提交
            </ElButton>
            <ElButton v-if="canRefund(row)" link type="danger" @click="handleRefund(row)">
              人工退款
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

    <!-- 详情: 产物 result 与 err_msg 都在这里看 -->
    <ElDialog v-model="detailDialog" title="任务详情" width="760px">
      <ElDescriptions v-if="detail" :column="2" border size="small">
        <ElDescriptionsItem label="任务ID">{{ detail.id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="任务单号">{{ detail.task_no }}</ElDescriptionsItem>
        <ElDescriptionsItem label="用户ID">{{ detail.user_id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="玩法">
          {{ bizTypeMap[detail.biz_type] ?? detail.biz_type }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="模板ID">{{ detail.template_id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="消耗金币">
          {{ Number(detail.cost_gold).toFixed(2) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="状态">
          <ElTag :type="statusMap[detail.status]?.type" size="small">
            {{ statusMap[detail.status]?.text ?? detail.status }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="重试次数">{{ detail.retry_count }}</ElDescriptionsItem>
        <ElDescriptionsItem label="供应商">{{ detail.provider || "-" }}</ElDescriptionsItem>
        <ElDescriptionsItem label="外部任务号">
          {{ detail.provider_task_id || "-" }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="幂等token">
          {{ detail.client_token || "-" }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="输入素材">
          {{ detail.input_url || "-" }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="提交时间">{{ detail.submitted_at || "-" }}</ElDescriptionsItem>
        <ElDescriptionsItem label="完成时间">{{ detail.finished_at || "-" }}</ElDescriptionsItem>
      </ElDescriptions>

      <div v-if="detail" class="mt-4">
        <div class="mb-1 text-sm font-medium">提交参数 params</div>
        <pre class="max-h-48 overflow-auto rounded bg-gray-50 p-3 font-mono text-xs">{{
          prettyJson(detail.params)
        }}</pre>

        <div class="mb-1 mt-4 text-sm font-medium">产物 result</div>
        <pre class="max-h-64 overflow-auto rounded bg-gray-50 p-3 font-mono text-xs">{{
          prettyJson(detail.result)
        }}</pre>

        <div class="mb-1 mt-4 text-sm font-medium">错误信息 err_msg</div>
        <pre
          class="max-h-32 overflow-auto rounded bg-gray-50 p-3 font-mono text-xs"
          :class="detail.err_msg ? 'text-red-500' : 'text-gray-400'"
          >{{ detail.err_msg || "(空)" }}</pre
        >
      </div>

      <template #footer>
        <ElButton @click="detailDialog = false">关闭</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
