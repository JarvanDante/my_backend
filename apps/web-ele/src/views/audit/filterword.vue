<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElAlert,
  ElButton,
  ElCard,
  ElDialog,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElPagination,
  ElTable,
  ElTableColumn,
} from "element-plus";

import {
  addFilterWordsApi,
  deleteFilterWordApi,
  getFilterWordListApi,
  type OpsConfigApi,
} from "#/api/core/opsconfig";

defineOptions({ name: "AuditFilterWord" });

const loading = ref(false);
const list = ref<OpsConfigApi.FwItem[]>([]);
const page = reactive({ current: 1, size: 50, total: 0 });
const search = reactive({ keyword: "" });

async function fetchList() {
  loading.value = true;
  try {
    const res = await getFilterWordListApi({
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
  search.keyword = "";
  doSearch();
}

const dialog = ref(false);
const saving = ref(false);
const text = ref("");

function openCreate() {
  text.value = "";
  dialog.value = true;
}
async function save() {
  const words = [
    ...new Set(
      text.value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  if (words.length === 0) {
    ElMessage.warning("请至少输入一个禁词");
    return;
  }
  saving.value = true;
  try {
    const res = await addFilterWordsApi(words);
    const added = res?.added ?? 0;
    const skipped = words.length - added;
    ElMessage.success(
      `提交 ${words.length} 个, 新增 ${added} 个${skipped > 0 ? `, 重复跳过 ${skipped} 个` : ""}`,
    );
    dialog.value = false;
    doSearch();
  } finally {
    saving.value = false;
  }
}
async function del(row: OpsConfigApi.FwItem) {
  await ElMessageBox.confirm(
    `确认删除禁词「${row.word}」? 删除后该词将不再拦截 UGC 内容。`,
    "提示",
    { type: "warning" },
  );
  await deleteFilterWordApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <ElAlert
        class="mb-3"
        type="warning"
        :closable="false"
        show-icon
        title="禁用词用于 UGC 过滤"
        description="新增后立即对帖子 / 评论 / 投稿生效, 命中的内容会被拦截; 删除后该词不再拦截。禁词没有编辑接口, 改词请先删除再新增。"
      />
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <ElInput
          v-model="search.keyword"
          placeholder="词内容模糊搜索"
          style="width: 220px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">新增禁词</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="80" />
        <ElTableColumn prop="word" label="禁词" min-width="220" />
        <ElTableColumn prop="created_at" label="添加时间" width="180" />
        <ElTableColumn label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <ElButton link type="danger" @click="del(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-4 flex justify-end">
        <ElPagination
          v-model:current-page="page.current"
          v-model:page-size="page.size"
          :total="page.total"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </ElCard>

    <ElDialog v-model="dialog" title="新增禁词" width="520px">
      <ElAlert
        class="mb-3"
        type="info"
        :closable="false"
        show-icon
        title="一行一个词, 提交后立即对帖子 / 评论 / 投稿生效"
        description="重复的词后端会自动跳过, 提交结果里会给出实际新增数。"
      />
      <ElInput
        v-model="text"
        type="textarea"
        :rows="10"
        placeholder="一行一个禁词, 例如:&#10;测试敏感词&#10;违禁词"
      />
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="save">提交</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
