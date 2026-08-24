<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElImage,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
} from "element-plus";

import {
  type AiTaskApi,
  deleteAiTaskApi,
  getAiTaskListApi,
  retryAiTaskApi,
} from "#/api/core/aitask";
import { adminMediaUrl } from "#/utils/media";

defineOptions({ name: "AiOrder" });

const emptyStats = (): AiTaskApi.Stats => ({
  total: 0,
  success: 0,
  refund: 0,
  abnormal: 0,
  total_gold: 0,
  success_gold: 0,
  refund_gold: 0,
  abnormal_gold: 0,
});

const loading = ref(false);
const list = ref<AiTaskApi.Item[]>([]);
const selected = ref<AiTaskApi.Item[]>([]);
const stats = reactive(emptyStats());
const page = reactive({ current: 1, size: 30, total: 0 });
const search = reactive({
  status: "",
  biz_type: "",
  device_type: "",
  user_id: "",
  nickname: "",
  task_no: "",
  channel_name: "",
  orderRange: [] as string[],
  registerRange: [] as string[],
});

function gold(n?: number) {
  return Number(n || 0).toFixed(0);
}
function shortTime(s?: string) {
  if (!s) return "-";
  return s.length >= 16 ? s.slice(5, 16) : s;
}
function faceUrl(row: AiTaskApi.Item) {
  return row.input_url || "";
}
function templateUrl(row: AiTaskApi.Item) {
  const p = row.params || {};
  const raw = p.target_url || p.target || p.cover;
  return typeof raw === "string" ? raw : "";
}
function resultUrl(row: AiTaskApi.Item) {
  const raw = row.result?.url || row.result?.output_url;
  return typeof raw === "string" ? raw : "";
}

async function fetchList() {
  loading.value = true;
  try {
    const res = await getAiTaskListApi({
      status: search.status,
      biz_type: search.biz_type,
      device_type: search.device_type || undefined,
      user_id: search.user_id,
      nickname: search.nickname || undefined,
      task_no: search.task_no || undefined,
      channel_name: search.channel_name || undefined,
      start_time: search.orderRange?.[0] || undefined,
      end_time: search.orderRange?.[1] || undefined,
      register_start: search.registerRange?.[0] || undefined,
      register_end: search.registerRange?.[1] || undefined,
      page: page.current,
      size: page.size,
    });
    list.value = res.list || [];
    page.total = res.total || 0;
    Object.assign(stats, res.stats || emptyStats());
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
  search.biz_type = "";
  search.device_type = "";
  search.user_id = "";
  search.nickname = "";
  search.task_no = "";
  search.channel_name = "";
  search.orderRange = [];
  search.registerRange = [];
  doSearch();
}

function canRetry(row: AiTaskApi.Item) {
  return row.status === 1 || row.status === 4 || row.status === 5;
}

async function retrySelected() {
  const rows = selected.value.filter(canRetry);
  if (!rows.length) {
    ElMessage.warning("请选择待处理/失败/已退款的订单");
    return;
  }
  await ElMessageBox.confirm(`将对 ${rows.length} 条订单重新投递，确认？`, "批量重试", {
    type: "warning",
  });
  let ok = 0;
  for (const row of rows) {
    try {
      await retryAiTaskApi(row.id);
      ok += 1;
    } catch {
      /* 单条失败继续 */
    }
  }
  ElMessage.success(`已重试 ${ok} 条`);
  fetchList();
}

async function deleteOne(row: AiTaskApi.Item) {
  await ElMessageBox.confirm(
    row.status === 1 || row.status === 4
      ? `删除订单 ${row.task_no} 会先退回金币再删记录，确认？`
      : `确认删除订单 ${row.task_no}？`,
    "删除确认",
    { type: "warning" },
  );
  await deleteAiTaskApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

async function deleteSelected() {
  if (!selected.value.length) {
    ElMessage.warning("请选择需要的数据");
    return;
  }
  if (selected.value.some((r) => r.status === 2)) {
    ElMessage.warning("处理中的订单不能删除");
    return;
  }
  await ElMessageBox.confirm(`确定删除选中的 ${selected.value.length} 条？`, "批量删除", {
    type: "warning",
  });
  for (const row of selected.value) {
    await deleteAiTaskApi(row.id);
  }
  ElMessage.success("已删除");
  fetchList();
}

const detailDialog = ref(false);
const detail = ref<AiTaskApi.Item | null>(null);
const detailTitle = computed(() => {
  if (!detail.value) return "信息";
  return `${detail.value.biz_type_text || "AI"}-订单详情`;
});
function openDetail(row: AiTaskApi.Item) {
  detail.value = row;
  detailDialog.value = true;
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <ElForm :inline="true" class="mb-2" @submit.prevent="doSearch">
        <ElFormItem label="状态">
          <ElSelect v-model="search.status" clearable placeholder="请选择.." style="width: 140px">
            <ElOption label="待处理" value="1" />
            <ElOption label="处理中" value="2" />
            <ElOption label="成功" value="3" />
            <ElOption label="异常" value="4" />
            <ElOption label="退款" value="5" />
            <ElOption label="已取消" value="6" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="位置">
          <ElSelect v-model="search.biz_type" clearable placeholder="请选择.." style="width: 140px">
            <ElOption label="图片换脸" value="1" />
            <ElOption label="脱衣" value="2" />
            <ElOption label="文生图" value="3" />
            <ElOption label="图生视频" value="4" />
            <ElOption label="文生小说" value="5" />
            <ElOption label="AI对话" value="6" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="设备">
          <ElSelect v-model="search.device_type" clearable placeholder="请选择.." style="width: 140px">
            <ElOption label="h5" value="h5" />
            <ElOption label="android" value="android" />
            <ElOption label="ios" value="ios" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="下单时间">
          <ElDatePicker
            v-model="search.orderRange"
            type="datetimerange"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 340px"
          />
        </ElFormItem>
        <ElFormItem label="注册时间">
          <ElDatePicker
            v-model="search.registerRange"
            type="datetimerange"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 340px"
          />
        </ElFormItem>
        <ElFormItem label="用户ID">
          <ElInput v-model="search.user_id" clearable placeholder="用户ID" style="width: 140px" />
        </ElFormItem>
        <ElFormItem label="用户名">
          <ElInput v-model="search.nickname" clearable placeholder="昵称/手机" style="width: 160px" />
        </ElFormItem>
        <ElFormItem label="订单编号">
          <ElInput v-model="search.task_no" clearable placeholder="订单编号" style="width: 200px" />
        </ElFormItem>
        <ElFormItem label="渠道名称">
          <ElInput v-model="search.channel_name" clearable placeholder="渠道名称" style="width: 160px" />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" native-type="submit">搜索</ElButton>
          <ElButton @click="resetSearch">重置</ElButton>
        </ElFormItem>
      </ElForm>

      <div class="mb-3 text-sm text-red-500">
        总数:{{ stats.total }} 成功:{{ stats.success }} 退款:{{ stats.refund }} 异常:{{ stats.abnormal }}
        &nbsp; 总金币:{{ gold(stats.total_gold) }} 成功金币:{{ gold(stats.success_gold) }}
        退款金币:{{ gold(stats.refund_gold) }} 异常金币:{{ gold(stats.abnormal_gold) }}
      </div>

      <div class="mb-3 flex gap-2">
        <ElButton type="primary" @click="retrySelected">重试</ElButton>
        <ElButton type="warning" @click="deleteSelected">删除</ElButton>
      </div>

      <ElTable
        v-loading="loading"
        :data="list"
        border
        stripe
        size="small"
        @selection-change="selected = $event"
      >
        <ElTableColumn type="selection" width="42" align="center" />
        <ElTableColumn prop="task_no" label="订单编号" min-width="190" show-overflow-tooltip />
        <ElTableColumn label="用户信息" min-width="160">
          <template #default="{ row }">
            <div>ID:{{ row.user_id }}</div>
            <div>{{ row.nickname || row.phone || "-" }}</div>
            <div class="text-gray-400">{{ row.group_name || "-" }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="用户头像" width="80" align="center">
          <template #default="{ row }">
            <ElImage
              v-if="row.avatar"
              :src="adminMediaUrl(row.avatar)"
              fit="cover"
              style="width: 36px; height: 36px; border-radius: 4px"
            />
            <span v-else>-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="渠道" width="100" show-overflow-tooltip>
          <template #default="{ row }">{{ row.channel_name || "-" }}</template>
        </ElTableColumn>
        <ElTableColumn label="设备" width="80" align="center">
          <template #default="{ row }">{{ row.device_type || "-" }}</template>
        </ElTableColumn>
        <ElTableColumn label="位置" width="110" align="center">
          <template #default="{ row }">{{ row.biz_type_text || "-" }}</template>
        </ElTableColumn>
        <ElTableColumn label="套数" width="70" align="center">
          <template #default="{ row }">{{ row.sets || 1 }}</template>
        </ElTableColumn>
        <ElTableColumn label="金币" width="80" align="center">
          <template #default="{ row }">{{ gold(row.cost_gold) }}</template>
        </ElTableColumn>
        <ElTableColumn label="实际金币" width="90" align="center">
          <template #default="{ row }">{{ gold(row.cost_gold) }}</template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="80" align="center">
          <template #default="{ row }">{{ row.status_text || "-" }}</template>
        </ElTableColumn>
        <ElTableColumn label="成功/失败时间" width="130" align="center">
          <template #default="{ row }">{{ shortTime(row.finished_at) }}</template>
        </ElTableColumn>
        <ElTableColumn label="错误信息" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.err_msg" class="text-red-500">{{ row.err_msg }}</span>
            <span v-else>-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="创建时间" width="120">
          <template #default="{ row }">{{ shortTime(row.created_at) }}</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <ElButton size="small" @click="openDetail(row)">查看详情</ElButton>
            <ElButton type="warning" size="small" @click="deleteOne(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-4 flex justify-end">
        <ElPagination
          v-model:current-page="page.current"
          v-model:page-size="page.size"
          :total="page.total"
          :page-sizes="[10, 20, 30, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </ElCard>

    <ElDialog v-model="detailDialog" title="信息" width="720px">
      <div v-if="detail">
        <h3 class="mb-3 text-base font-semibold">{{ detailTitle }}</h3>
        <div class="mb-4">
          <div class="mb-2 text-sm text-sky-500">用户需求</div>
          <div class="mb-2 flex gap-8 text-sm text-sky-500">
            <span>人脸参照:</span>
            <span>模版图片:</span>
          </div>
          <div class="flex gap-6 rounded bg-gray-50 p-4">
            <div class="flex-1">
              <ElImage
                v-if="faceUrl(detail)"
                :src="adminMediaUrl(faceUrl(detail))"
                fit="contain"
                class="h-56 w-full rounded border bg-white"
                preview-teleported
                :preview-src-list="[adminMediaUrl(faceUrl(detail))]"
              />
              <div v-else class="flex h-56 items-center justify-center text-gray-400">无</div>
            </div>
            <div class="flex-1">
              <ElImage
                v-if="templateUrl(detail)"
                :src="adminMediaUrl(templateUrl(detail))"
                fit="contain"
                class="h-56 w-full rounded border bg-white"
                preview-teleported
                :preview-src-list="[adminMediaUrl(templateUrl(detail))]"
              />
              <div v-else class="flex h-56 items-center justify-center text-gray-400">无</div>
            </div>
          </div>
        </div>
        <div>
          <div class="mb-2 text-sm font-medium">处理结果</div>
          <div class="rounded bg-gray-50 p-4">
            <ElImage
              v-if="resultUrl(detail)"
              :src="adminMediaUrl(resultUrl(detail))"
              fit="contain"
              class="h-56 w-full rounded border bg-white"
              preview-teleported
              :preview-src-list="[adminMediaUrl(resultUrl(detail))]"
            />
            <div v-else class="flex h-20 items-center justify-center text-gray-400">
              {{ detail.err_msg || "暂无结果" }}
            </div>
          </div>
        </div>
      </div>
    </ElDialog>
  </div>
</template>
