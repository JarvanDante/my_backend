<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElButton,
  ElCard,
  ElInput,
  ElMessage,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import {
  auditCommentApi,
  getCommentListApi,
  type CommentApi,
} from "#/api/core/comment";

defineOptions({ name: "AuditComment" });

const statusOpts = [
  { label: "全部", value: "" },
  { label: "待审核", value: "0" },
  { label: "已上墙", value: "1" },
  { label: "已拒绝", value: "2" },
];
const kindOpts = [
  { label: "全部类型", value: "" },
  { label: "主评", value: "main" },
  { label: "回复", value: "reply" },
];
const mediaOpts = [
  { label: "全部内容", value: "" },
  { label: "视频", value: "1" },
  { label: "帖子", value: "2" },
  { label: "漫画", value: "4" },
  { label: "小说", value: "7" },
  { label: "动漫", value: "8" },
  { label: "抖音", value: "9" },
];
const statusMap: Record<
  number,
  { text: string; type: "danger" | "success" | "warning" }
> = {
  0: { text: "待审核", type: "warning" },
  1: { text: "已上墙", type: "success" },
  2: { text: "已拒绝", type: "danger" },
};
const mediaMap: Record<number, string> = {
  1: "视频",
  2: "帖子",
  4: "漫画",
  7: "小说",
};

const loading = ref(false);
const list = ref<CommentApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({
  status: "0",
  kind: "",
  keyword: "",
  userId: "",
  mediaType: "",
});

async function fetchList() {
  loading.value = true;
  try {
    const res = await getCommentListApi({
      status: search.status,
      kind: search.kind || undefined,
      keyword: search.keyword || undefined,
      user_id: search.userId ? Number(search.userId) : undefined,
      media_type: search.mediaType ? Number(search.mediaType) : undefined,
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
  search.status = "0";
  search.kind = "";
  search.keyword = "";
  search.userId = "";
  search.mediaType = "";
  doSearch();
}

async function handlePass(row: CommentApi.Item) {
  await auditCommentApi(row.id, true);
  ElMessage.success("已通过上墙");
  fetchList();
}
async function handleReject(row: CommentApi.Item) {
  await auditCommentApi(row.id, false);
  ElMessage.success("已拒绝");
  fetchList();
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-3 text-xs text-gray-500">
        VIP 评论/回复直接上墙；普通用户需在此审核。主评与回复共用同一列表。
      </div>
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <ElSelect
          v-model="search.status"
          style="width: 120px"
          @change="doSearch"
        >
          <ElOption
            v-for="o in statusOpts"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </ElSelect>
        <ElSelect v-model="search.kind" style="width: 120px" @change="doSearch">
          <ElOption
            v-for="o in kindOpts"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </ElSelect>
        <ElSelect
          v-model="search.mediaType"
          style="width: 120px"
          @change="doSearch"
        >
          <ElOption
            v-for="o in mediaOpts"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </ElSelect>
        <ElInput
          v-model="search.userId"
          placeholder="用户ID"
          style="width: 120px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElInput
          v-model="search.keyword"
          placeholder="评论内容"
          style="width: 220px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="80" />
        <ElTableColumn label="类型" width="80" align="center">
          <template #default="{ row }">
            <ElTag :type="row.parent_id > 0 ? 'info' : ''" size="small">
              {{ row.parent_id > 0 ? "回复" : "主评" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="用户" min-width="140">
          <template #default="{ row }">
            <div>{{ row.nickname || "-" }} #{{ row.user_id }}</div>
            <ElTag v-if="row.is_vip" type="warning" size="small">VIP</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn
          prop="content"
          label="内容"
          min-width="260"
          show-overflow-tooltip
        />
        <ElTableColumn label="所属" width="140">
          <template #default="{ row }">
            {{ row.belong_label || mediaMap[row.media_type] || row.media_type }}
            #{{ row.content_id }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="parent_id" label="回复对象" width="90" align="center">
          <template #default="{ row }">
            {{ row.parent_id > 0 ? row.parent_id : "-" }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="statusMap[row.status]?.type" size="small">
              {{ statusMap[row.status]?.text ?? row.status }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="created_at" label="时间" width="170" />
        <ElTableColumn label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <ElButton
              v-if="row.status === 0"
              link
              type="success"
              @click="handlePass(row)"
            >
              通过
            </ElButton>
            <ElButton
              v-if="row.status === 0"
              link
              type="warning"
              @click="handleReject(row)"
            >
              拒绝
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
  </div>
</template>
