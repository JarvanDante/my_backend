<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElAlert,
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
  ElTag,
} from "element-plus";

import {
  createHotSearchApi,
  deleteHotSearchApi,
  getHotSearchListApi,
  type RanksApi,
  refreshRankCacheApi,
  updateHotSearchApi,
} from "#/api/core/ranks";

defineOptions({ name: "OpsRank" });

// 筛选项一律 string, 空串=全部。后端 controller 是
// `if req.Status != "" { atoi } else { -1 }`, 所以 "0" 能筛出"已禁用"。
const statusOpts = [
  { label: "全部状态", value: "" },
  { label: "启用", value: "1" },
  { label: "禁用", value: "0" },
];

const loading = ref(false);
const list = ref<RanksApi.HotItem[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ status: "", keyword: "" });

async function fetchList() {
  loading.value = true;
  try {
    const res = await getHotSearchListApi({
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
  fetchList();
}
function resetSearch() {
  search.status = "";
  search.keyword = "";
  doSearch();
}

// ---------- 刷新排行缓存 ----------
// 排行榜(点赞聚合)在 Redis 里缓存 60s, 运营改完数据默认要等缓存自然过期才生效。
// 这个按钮把缓存 key 全删掉, 下一次前台请求立刻重算, 用于"改完想马上看效果"。
const refreshing = ref(false);
async function handleRefreshCache() {
  refreshing.value = true;
  try {
    await refreshRankCacheApi();
    ElMessage.success("排行缓存已清除, 前台下次请求会立即重算");
  } finally {
    refreshing.value = false;
  }
}

// ---------- 新增/编辑 ----------
const dialog = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
const emptyForm = () => ({ id: 0, keyword: "", heat: 0, status: 1 });
const form = reactive(emptyForm());
const rules = {
  keyword: [{ required: true, message: "关键词必填", trigger: "blur" }],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  dialog.value = true;
}
function openEdit(row: RanksApi.HotItem) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    keyword: row.keyword,
    heat: row.heat,
    status: row.status,
  });
  dialog.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  const body = {
    keyword: form.keyword.trim(),
    heat: Number(form.heat) || 0,
    status: form.status,
  };
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateHotSearchApi(form.id, body);
      ElMessage.success("已保存");
    } else {
      await createHotSearchApi(body);
      ElMessage.success("已新增");
    }
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: RanksApi.HotItem) {
  await ElMessageBox.confirm(
    `确认删除热搜词「${row.keyword}」? 删除后它累计的 ${row.search_count} 次真实搜索计数一并丢失。`,
    "提示",
    { type: "warning" },
  );
  await deleteHotSearchApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <ElAlert type="info" :closable="false" show-icon class="mb-4">
        <template #title>热搜词排序规则</template>
        <div class="text-xs leading-5">
          列表与前台热搜均按 <b>heat 降序 → search_count 降序</b> 排列。
          <br />
          <b>热度权重(heat)</b>: 运营手动设置的人工权重, 想把某个词顶上去就调大它, 排序第一优先级。
          <br />
          <b>搜索次数(search_count)</b>: 用户在前台真实搜索的累计计数, 由系统自增, 后台只读、不可编辑,
          仅在 heat 相同时作为次级排序依据。
          <br />
          排行榜数据在 Redis 里缓存 60 秒; 改完想立刻在前台看到效果, 点右上角「刷新排行缓存」。
        </div>
      </ElAlert>

      <div class="mb-4 flex flex-wrap items-center gap-2">
        <ElSelect v-model="search.status" style="width: 130px" @change="doSearch">
          <ElOption v-for="o in statusOpts" :key="o.value" :label="o.label" :value="o.value" />
        </ElSelect>
        <ElInput
          v-model="search.keyword"
          placeholder="关键词"
          style="width: 200px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
        <div class="flex-1"></div>
        <ElButton :loading="refreshing" @click="handleRefreshCache">刷新排行缓存</ElButton>
        <ElButton type="primary" @click="openCreate">新增热搜词</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="80" />
        <ElTableColumn prop="keyword" label="关键词" min-width="160" show-overflow-tooltip />
        <ElTableColumn label="热度权重" width="110" align="center">
          <template #default="{ row }">
            <ElTag type="warning" size="small">{{ row.heat }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="搜索次数" width="110" align="center">
          <template #default="{ row }">
            <span class="text-gray-500">{{ row.search_count }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? "启用" : "禁用" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="updated_at" label="更新时间" width="180" />
        <ElTableColumn label="操作" width="140" fixed="right">
          <template #default="{ row }">
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
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </ElCard>

    <ElDialog v-model="dialog" :title="isEdit ? '编辑热搜词' : '新增热搜词'" width="520px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="关键词" prop="keyword">
          <ElInput v-model="form.keyword" placeholder="用户点击后直接用它去搜索" />
        </ElFormItem>
        <ElFormItem label="热度权重">
          <ElInputNumber v-model="form.heat" :min="0" />
          <span class="ml-2 text-xs text-gray-400">人工权重, 越大越靠前(排序第一优先级)</span>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="form.status" style="width: 140px">
            <ElOption label="启用" :value="1" />
            <ElOption label="禁用" :value="0" />
          </ElSelect>
          <span class="ml-2 text-xs text-gray-400">仅启用的词会下发到前台</span>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
