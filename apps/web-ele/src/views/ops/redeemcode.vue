<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElAlert,
  ElButton,
  ElCard,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElProgress,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";

import {
  createRedeemCodeApi,
  deleteRedeemCodeApi,
  getRedeemCodeListApi,
  getRedeemCodeRecordsApi,
  type RedeemCodeApi,
  updateRedeemCodeApi,
} from "#/api/core/redeemcode";

defineOptions({ name: "OpsRedeemCode" });

const activeTab = ref("codes");

/* ==================== 兑换码 ==================== */
const loading = ref(false);
const list = ref<RedeemCodeApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
// status 保持 string: 空串=全部(后端 statusOf("")=-1), 传 0 会被当成"只看禁用"
const search = reactive({ status: "", keyword: "" });
const statusOpts = [
  { label: "全部", value: "" },
  { label: "禁用", value: "0" },
  { label: "启用", value: "1" },
];

async function loadCodes() {
  loading.value = true;
  try {
    const res = await getRedeemCodeListApi({
      status: search.status,
      keyword: search.keyword || undefined,
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
  loadCodes();
}
function resetSearch() {
  search.status = "";
  search.keyword = "";
  doSearch();
}

// 剩余次数条: 兑换码用完(used>=total)后端会自动置为禁用, 列表里要能一眼看出来
function usedPercent(row: RedeemCodeApi.Item) {
  if (!row.total_times) return 0;
  return Math.min(100, Math.round((row.used_times / row.total_times) * 100));
}
function isExpired(row: RedeemCodeApi.Item) {
  return !!row.expired_at && new Date(row.expired_at.replace(/-/g, "/")) < new Date();
}

const dialog = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
const emptyForm = () => ({
  id: 0,
  name: "",
  code: "",
  value: 100,
  total_times: 1,
  expired_at: "",
  status: 1,
});
const form = reactive(emptyForm());
const rules = {
  name: [{ required: true, message: "名称必填", trigger: "blur" }],
  expired_at: [{ required: true, message: "过期时间必填", trigger: "change" }],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  dialog.value = true;
}
function openEdit(row: RedeemCodeApi.Item) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    name: row.name,
    code: row.code,
    value: row.value,
    total_times: row.total_times,
    expired_at: row.expired_at,
    status: row.status,
  });
  dialog.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  if (Number(form.value) <= 0) {
    ElMessage.warning("奖励金币需大于 0");
    return;
  }
  if (Number(form.total_times) <= 0) {
    ElMessage.warning("可兑换次数至少为 1");
    return;
  }
  saving.value = true;
  try {
    if (isEdit.value) {
      // 更新不含 code: 后端 UpdateInput 没有 code 字段, 码生成后不可修改
      await updateRedeemCodeApi(form.id, {
        name: form.name,
        value: Number(form.value),
        total_times: Number(form.total_times),
        expired_at: form.expired_at,
        status: form.status,
      });
      ElMessage.success("已保存");
    } else {
      const res = await createRedeemCodeApi({
        name: form.name,
        code: form.code.trim().toUpperCase(), // 后端也会转大写, 前端先转让提示更直观
        value: Number(form.value),
        total_times: Number(form.total_times),
        expired_at: form.expired_at,
        status: form.status,
      });
      // 留空时后端会自动生成 12 位码, 必须回显给运营, 否则拿不到码
      ElMessage.success(`已新增, 兑换码: ${res?.code ?? ""}`);
    }
    dialog.value = false;
    loadCodes();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: RedeemCodeApi.Item) {
  await ElMessageBox.confirm(
    `确认删除兑换码「${row.code}」? 已产生的核销记录不会被删除。`,
    "提示",
    { type: "warning" },
  );
  await deleteRedeemCodeApi(row.id);
  ElMessage.success("已删除");
  loadCodes();
}

async function copyCode(row: RedeemCodeApi.Item) {
  try {
    await navigator.clipboard.writeText(row.code);
    ElMessage.success("已复制兑换码");
  } catch {
    ElMessage.warning(`复制失败, 请手动复制: ${row.code}`);
  }
}

/* ==================== 核销记录 ==================== */
const recLoading = ref(false);
const records = ref<RedeemCodeApi.RecordItem[]>([]);
const recPage = reactive({ current: 1, size: 20, total: 0 });
// user_id 契约是 int64, 这里用 string 承接输入框, 提交前转 number; 空串=不筛选
const recSearch = reactive({ user_id: "", code: "" });

async function loadRecords() {
  recLoading.value = true;
  try {
    const res = await getRedeemCodeRecordsApi({
      user_id: recSearch.user_id ? Number(recSearch.user_id) : undefined,
      code: recSearch.code.trim() || undefined,
      page: recPage.current,
      size: recPage.size,
    });
    records.value = res.list || [];
    recPage.total = res.total || 0;
  } finally {
    recLoading.value = false;
  }
}
function recSearchDo() {
  recPage.current = 1;
  loadRecords();
}
function recReset() {
  recSearch.user_id = "";
  recSearch.code = "";
  recSearchDo();
}
// Tab 懒加载: 只有第一次切过去才拉数据, 避免进页面就打两个接口
const loadedTabs = reactive<Record<string, boolean>>({ codes: true });
function onTabChange(name: string) {
  if (loadedTabs[name]) return;
  loadedTabs[name] = true;
  if (name === "records") loadRecords();
}

/** 从列表跳到该码的核销记录, 省去手动输码 */
function viewRecords(row: RedeemCodeApi.Item) {
  recSearch.user_id = "";
  recSearch.code = row.code;
  loadedTabs.records = true; // 手动置位, 免得 onTabChange 再拉一次
  activeTab.value = "records";
  recSearchDo();
}

onMounted(loadCodes);
</script>

<template>
  <div>
    <ElCard shadow="never">
      <ElTabs v-model="activeTab" type="border-card" @tab-change="onTabChange">
        <!-- ---------- 兑换码 ---------- -->
        <ElTabPane label="兑换码" name="codes">
          <ElAlert
            class="mb-3"
            type="info"
            :closable="false"
            show-icon
            title="一码多次: 同一个码可被不同用户各兑换一次, 直到用完 total_times"
            description="兑换成功即为用户加金币; 次数用完后端会自动把状态置为禁用; 同一用户不能重复兑换同一个码。"
          />
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <ElSelect v-model="search.status" style="width: 120px" @change="doSearch">
              <ElOption
                v-for="o in statusOpts"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </ElSelect>
            <ElInput
              v-model="search.keyword"
              placeholder="码 / 名称关键字"
              style="width: 220px"
              clearable
              @keyup.enter="doSearch"
            />
            <ElButton type="primary" @click="doSearch">查询</ElButton>
            <ElButton @click="resetSearch">重置</ElButton>
            <div class="flex-1"></div>
            <ElButton type="primary" @click="openCreate">新增兑换码</ElButton>
          </div>

          <ElTable v-loading="loading" :data="list" border stripe>
            <ElTableColumn prop="id" label="ID" width="70" />
            <ElTableColumn prop="name" label="名称" min-width="140" show-overflow-tooltip />
            <ElTableColumn label="兑换码" width="170">
              <template #default="{ row }">
                <span class="font-mono">{{ row.code }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="奖励" width="130">
              <template #default="{ row }">
                <ElTag type="warning" size="small">
                  {{ Number(row.value).toFixed(2) }} 金币
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="兑换进度" width="170">
              <template #default="{ row }">
                <div class="text-xs text-gray-500">
                  {{ row.used_times }} / {{ row.total_times }}
                </div>
                <ElProgress
                  :percentage="usedPercent(row)"
                  :stroke-width="6"
                  :show-text="false"
                />
              </template>
            </ElTableColumn>
            <ElTableColumn label="过期时间" width="180">
              <template #default="{ row }">
                <span :class="isExpired(row) ? 'text-red-500' : ''">
                  {{ row.expired_at || "-" }}
                </span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="状态" width="100" align="center">
              <template #default="{ row }">
                <ElTag v-if="isExpired(row)" type="danger" size="small">已过期</ElTag>
                <ElTag v-else :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? "启用" : "禁用" }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="created_at" label="创建时间" width="170" />
            <ElTableColumn label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="copyCode(row)">复制</ElButton>
                <ElButton link type="primary" @click="viewRecords(row)">记录</ElButton>
                <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
                <ElButton link type="danger" @click="handleDelete(row)">删除</ElButton>
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
              @size-change="loadCodes"
              @current-change="loadCodes"
            />
          </div>
        </ElTabPane>

        <!-- ---------- 核销记录 ---------- -->
        <ElTabPane label="核销记录" name="records">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <ElInput
              v-model="recSearch.user_id"
              placeholder="用户ID"
              style="width: 140px"
              clearable
              @keyup.enter="recSearchDo"
            />
            <ElInput
              v-model="recSearch.code"
              placeholder="兑换码(精确匹配)"
              style="width: 200px"
              clearable
              @keyup.enter="recSearchDo"
            />
            <ElButton type="primary" @click="recSearchDo">查询</ElButton>
            <ElButton @click="recReset">重置</ElButton>
          </div>

          <ElTable v-loading="recLoading" :data="records" border stripe>
            <ElTableColumn prop="id" label="ID" width="80" />
            <ElTableColumn prop="user_id" label="用户ID" width="100" />
            <ElTableColumn label="兑换码" width="170">
              <template #default="{ row }">
                <span class="font-mono">{{ row.code }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="name" label="活动名称" min-width="140" show-overflow-tooltip />
            <ElTableColumn label="发放金币" width="130">
              <template #default="{ row }">
                {{ Number(row.value).toFixed(2) }}
              </template>
            </ElTableColumn>
            <ElTableColumn prop="created_at" label="核销时间" width="180" />
          </ElTable>

          <div class="mt-4 flex justify-end">
            <ElPagination
              v-model:current-page="recPage.current"
              v-model:page-size="recPage.size"
              :total="recPage.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              @size-change="loadRecords"
              @current-change="loadRecords"
            />
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <!-- 兑换码表单 -->
    <ElDialog
      v-model="dialog"
      :title="isEdit ? '编辑兑换码' : '新增兑换码'"
      width="560px"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="名称" prop="name">
          <ElInput v-model="form.name" placeholder="如: 新人见面礼" />
        </ElFormItem>
        <ElFormItem label="兑换码">
          <ElInput
            v-model="form.code"
            :disabled="isEdit"
            placeholder="留空自动生成 12 位大写码"
          />
          <span v-if="isEdit" class="mt-1 text-xs text-gray-400">
            兑换码生成后不可修改
          </span>
        </ElFormItem>
        <ElFormItem label="奖励金币">
          <ElInputNumber v-model="form.value" :min="1" />
          <span class="ml-2 text-xs text-gray-400">兑换成功直接加到用户余额</span>
        </ElFormItem>
        <ElFormItem label="可兑换次数">
          <ElInputNumber v-model="form.total_times" :min="1" />
          <span class="ml-2 text-xs text-gray-400">
            总次数, 用完后自动禁用; 同一用户只能兑一次
          </span>
        </ElFormItem>
        <ElFormItem label="过期时间" prop="expired_at">
          <ElDatePicker
            v-model="form.expired_at"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="必填, 且不能早于当前时间"
            style="width: 220px"
          />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="form.status" style="width: 160px">
            <ElOption label="启用" :value="1" />
            <ElOption label="禁用" :value="0" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
