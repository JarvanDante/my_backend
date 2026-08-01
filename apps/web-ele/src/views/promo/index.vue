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
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";

import {
  genCodesApi,
  getCodeListApi,
  getCodeLogListApi,
  type PromoApi,
  voidCodeApi,
} from "#/api/core/promo";

defineOptions({ name: "PromoManage" });

const activeTab = ref("codes");

// ---------- 兑换码列表 ----------
const codes = ref<PromoApi.CodeItem[]>([]);
const loading = ref(false);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ keyword: "", code_key: "", type: "", status: 0 });
const statusOpts = [
  { label: "全部", value: 0 },
  { label: "可用", value: 1 },
  { label: "已使用", value: 2 },
  { label: "作废", value: 3 },
];
const statusTag: Record<number, { t: string; type: "success" | "info" | "danger" }> = {
  0: { t: "未使用", type: "success" },
  1: { t: "已使用", type: "info" },
  [-1]: { t: "作废", type: "danger" },
};
async function loadCodes() {
  loading.value = true;
  try {
    const res = await getCodeListApi({
      keyword: search.keyword || undefined,
      code_key: search.code_key || undefined,
      type: search.type || undefined,
      status: search.status,
      page: page.current,
      size: page.size,
    });
    codes.value = res.list || [];
    page.total = res.total || 0;
  } finally {
    loading.value = false;
  }
}
function doSearch() {
  page.current = 1;
  loadCodes();
}

// ---------- 批量生成 ----------
const genDialog = ref(false);
const genForm = reactive({
  name: "",
  type: "point",
  object_id: 0,
  add_num: 50,
  can_use_num: 1,
  count: 10,
  expired_at: 0,
});
const genResult = ref<PromoApi.GenResult | null>(null);
function openGen() {
  Object.assign(genForm, { name: "", type: "point", object_id: 0, add_num: 50, can_use_num: 1, count: 10, expired_at: 0 });
  genResult.value = null;
  genDialog.value = true;
}
async function doGen() {
  if (!genForm.name) return ElMessage.warning("名称必填");
  const res = await genCodesApi({
    name: genForm.name,
    type: genForm.type,
    object_id: genForm.type === "group" ? genForm.object_id : 0,
    add_num: genForm.add_num,
    can_use_num: genForm.can_use_num,
    count: genForm.count,
  });
  genResult.value = res;
  ElMessage.success(`已生成 ${res.count} 张`);
  loadCodes();
}
function copyCodes() {
  if (!genResult.value) return;
  const text = genResult.value.codes.join("\n");
  navigator.clipboard?.writeText(text);
  ElMessage.success("已复制到剪贴板");
}
function exportCodes() {
  if (!genResult.value) return;
  const text = genResult.value.codes.join("\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `codes_${genResult.value.code_key}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

async function doVoid(row: PromoApi.CodeItem) {
  await ElMessageBox.confirm(`作废兑换码「${row.code}」?`, "提示", { type: "warning" });
  await voidCodeApi(row.id);
  ElMessage.success("已作废");
  loadCodes();
}

// ---------- 兑换记录 ----------
const logs = ref<PromoApi.CodeLogItem[]>([]);
const logLoading = ref(false);
const logPage = reactive({ current: 1, size: 20, total: 0 });
const logSearch = reactive({ code: "" });
async function loadLogs() {
  logLoading.value = true;
  try {
    const res = await getCodeLogListApi({
      code: logSearch.code || undefined,
      page: logPage.current,
      size: logPage.size,
    });
    logs.value = res.list || [];
    logPage.total = res.total || 0;
  } finally {
    logLoading.value = false;
  }
}

function onTab(name: string | number) {
  if (name === "logs") loadLogs();
}

onMounted(loadCodes);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <ElTabs v-model="activeTab" @tab-change="onTab">
        <ElTabPane label="兑换码" name="codes">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <ElInput v-model="search.keyword" placeholder="码/名称" clearable style="width: 160px" @keyup.enter="doSearch" />
            <ElInput v-model="search.code_key" placeholder="批次号" clearable style="width: 160px" @keyup.enter="doSearch" />
            <ElSelect v-model="search.type" style="width: 120px" placeholder="类型">
              <ElOption label="全部类型" value="" />
              <ElOption label="金币(point)" value="point" />
              <ElOption label="用户组(group)" value="group" />
            </ElSelect>
            <ElSelect v-model="search.status" style="width: 110px">
              <ElOption v-for="o in statusOpts" :key="o.value" :label="o.label" :value="o.value" />
            </ElSelect>
            <ElButton type="primary" @click="doSearch">查询</ElButton>
            <div class="flex-1"></div>
            <ElButton type="primary" @click="openGen">批量生成</ElButton>
          </div>
          <ElTable v-loading="loading" :data="codes" border stripe>
            <ElTableColumn prop="code" label="兑换码" width="180" />
            <ElTableColumn prop="name" label="名称" min-width="120" />
            <ElTableColumn prop="code_key" label="批次" width="170" show-overflow-tooltip />
            <ElTableColumn prop="type" label="类型" width="80" align="center" />
            <ElTableColumn prop="add_num" label="面额" width="80" align="right" />
            <ElTableColumn label="使用" width="90" align="center">
              <template #default="{ row }">{{ row.used_num }}/{{ row.can_use_num }}</template>
            </ElTableColumn>
            <ElTableColumn label="状态" width="90" align="center">
              <template #default="{ row }">
                <ElTag :type="statusTag[row.status]?.type">{{ statusTag[row.status]?.t }}</ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="90" fixed="right">
              <template #default="{ row }">
                <ElButton v-if="row.status !== -1" link type="danger" @click="doVoid(row)">作废</ElButton>
                <span v-else class="text-muted-foreground text-xs">已作废</span>
              </template>
            </ElTableColumn>
          </ElTable>
          <div class="mt-3 flex justify-end">
            <ElPagination
              v-model:current-page="page.current"
              :total="page.total"
              :page-size="page.size"
              layout="total, prev, pager, next"
              @current-change="loadCodes"
            />
          </div>
        </ElTabPane>

        <ElTabPane label="兑换记录" name="logs">
          <div class="mb-3 flex items-center gap-2">
            <ElInput v-model="logSearch.code" placeholder="兑换码" clearable style="width: 200px" @keyup.enter="loadLogs" />
            <ElButton type="primary" @click="loadLogs">查询</ElButton>
          </div>
          <ElTable v-loading="logLoading" :data="logs" border stripe>
            <ElTableColumn prop="code" label="兑换码" width="180" />
            <ElTableColumn prop="name" label="名称" min-width="120" />
            <ElTableColumn prop="type" label="类型" width="80" align="center" />
            <ElTableColumn prop="username" label="兑换用户" width="140" />
            <ElTableColumn prop="add_num" label="面额" width="80" align="right" />
            <ElTableColumn prop="created_at" label="兑换时间" width="170" />
          </ElTable>
          <div class="mt-3 flex justify-end">
            <ElPagination
              v-model:current-page="logPage.current"
              :total="logPage.total"
              :page-size="logPage.size"
              layout="total, prev, pager, next"
              @current-change="loadLogs"
            />
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <ElDialog v-model="genDialog" title="批量生成兑换码" width="480px">
      <ElForm label-width="100px">
        <ElFormItem label="名称"><ElInput v-model="genForm.name" placeholder="如 新春福利" /></ElFormItem>
        <ElFormItem label="类型">
          <ElSelect v-model="genForm.type" style="width: 100%">
            <ElOption label="金币(point)" value="point" />
            <ElOption label="用户组(group)" value="group" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="genForm.type === 'group'" label="用户组ID">
          <ElInputNumber v-model="genForm.object_id" :min="1" />
        </ElFormItem>
        <ElFormItem label="面额">
          <ElInputNumber v-model="genForm.add_num" :min="1" />
          <span class="text-muted-foreground ml-2 text-xs">金币数 / 天数</span>
        </ElFormItem>
        <ElFormItem label="每码可用次数"><ElInputNumber v-model="genForm.can_use_num" :min="1" /></ElFormItem>
        <ElFormItem label="生成数量"><ElInputNumber v-model="genForm.count" :min="1" :max="1000" /></ElFormItem>
      </ElForm>

      <div v-if="genResult" class="mt-2">
        <div class="mb-2 flex items-center gap-2">
          <ElTag type="success">批次 {{ genResult.code_key }} · 共 {{ genResult.count }} 张</ElTag>
          <div class="flex-1"></div>
          <ElButton size="small" @click="copyCodes">复制</ElButton>
          <ElButton size="small" @click="exportCodes">导出TXT</ElButton>
        </div>
        <ElInput
          :model-value="genResult.codes.join('\n')"
          type="textarea"
          :rows="6"
          readonly
          style="font-family: monospace"
        />
      </div>

      <template #footer>
        <ElButton @click="genDialog = false">关闭</ElButton>
        <ElButton type="primary" @click="doGen">生成</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
