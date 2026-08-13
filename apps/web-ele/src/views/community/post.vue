<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElButton,
  ElCard,
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
  ElTag,
} from "element-plus";

import {
  auditPostApi,
  deletePostApi,
  getPostListApi,
  type PostApi,
} from "#/api/core/post";

defineOptions({ name: "CommunityPost" });

// 状态编码严格照 api/backend/post/v1/post.go 的注释: 0待审 1通过 2拒绝 3用户删除
const statusOpts = [
  { label: "全部", value: "" },
  { label: "待审核", value: "0" },
  { label: "已通过", value: "1" },
  { label: "已拒绝", value: "2" },
  { label: "用户删除", value: "3" },
];
const statusMap: Record<
  number,
  { text: string; type: "danger" | "info" | "success" | "warning" }
> = {
  0: { text: "待审核", type: "warning" },
  1: { text: "已通过", type: "success" },
  2: { text: "已拒绝", type: "danger" },
  3: { text: "用户删除", type: "info" },
};

const loading = ref(false);
const list = ref<PostApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
// 筛选值一律用 string, 空串=不筛选; user_id 也先按 string 收, 提交前才转数字
const search = reactive({ status: "", keyword: "", userId: "" });

async function fetchList() {
  loading.value = true;
  try {
    const res = await getPostListApi({
      status: search.status,
      keyword: search.keyword || undefined,
      // 后端 user_id 是 int64 且 0=全部, 空串就干脆不传, 避免歧义
      user_id: search.userId ? Number(search.userId) : undefined,
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
  search.userId = "";
  doSearch();
}

// ---------- 审核 ----------
// 通过不需要理由, 直接调; 拒绝必须带原因(后端只在 pass=false 时落 reject_reason)
async function handlePass(row: PostApi.Item) {
  await auditPostApi(row.id, true);
  ElMessage.success("已通过");
  fetchList();
}

const rejectDialog = ref(false);
const rejecting = ref(false);
const rejectForm = reactive({ id: 0, title: "", reason: "" });

function openReject(row: PostApi.Item) {
  Object.assign(rejectForm, { id: row.id, title: row.title, reason: "" });
  rejectDialog.value = true;
}
async function submitReject() {
  if (!rejectForm.reason.trim()) {
    ElMessage.warning("请填写拒绝原因, 用户端会看到这段话");
    return;
  }
  rejecting.value = true;
  try {
    await auditPostApi(rejectForm.id, false, rejectForm.reason.trim());
    ElMessage.success("已拒绝");
    rejectDialog.value = false;
    fetchList();
  } finally {
    rejecting.value = false;
  }
}

// ---------- 详情 ----------
const detailDialog = ref(false);
const detail = ref<PostApi.Item | null>(null);
function openDetail(row: PostApi.Item) {
  detail.value = row;
  detailDialog.value = true;
}

// ---------- 删除 ----------
async function handleDelete(row: PostApi.Item) {
  // 后端是硬删且连带评论一起删, 没有回收站, 所以提示写明白
  await ElMessageBox.confirm(
    `确认删除帖子「${row.title || row.id}」? 该操作为硬删除, 会连带删除其 ${row.comment_count} 条评论且不可恢复。`,
    "提示",
    { type: "warning" },
  );
  await deletePostApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <ElSelect
          v-model="search.status"
          style="width: 130px"
          @change="doSearch"
        >
          <ElOption
            v-for="o in statusOpts"
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
          placeholder="标题关键字"
          style="width: 220px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="70" />
        <ElTableColumn prop="user_id" label="用户ID" width="90" />
        <ElTableColumn label="图片" width="80">
          <template #default="{ row }">
            <!-- 列表只显示第一张, 点开可预览全部 pics -->
            <ElImage
              v-if="row.pics && row.pics.length > 0"
              :src="row.pics[0]"
              fit="cover"
              style="width: 44px; height: 44px"
              preview-teleported
              :preview-src-list="row.pics"
            />
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="图片数" width="80" align="center">
          <template #default="{ row }">
            {{ row.pics ? row.pics.length : 0 }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          prop="title"
          label="标题"
          min-width="160"
          show-overflow-tooltip
        />
        <ElTableColumn
          prop="content"
          label="内容"
          min-width="220"
          show-overflow-tooltip
        />
        <ElTableColumn prop="view_count" label="浏览" width="80" align="center" />
        <ElTableColumn prop="like_count" label="点赞" width="80" align="center" />
        <ElTableColumn
          prop="comment_count"
          label="评论"
          width="80"
          align="center"
        />
        <ElTableColumn label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="statusMap[row.status]?.type" size="small">
              {{ statusMap[row.status]?.text ?? row.status }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn
          prop="reject_reason"
          label="拒绝原因"
          min-width="140"
          show-overflow-tooltip
        />
        <ElTableColumn prop="created_at" label="创建时间" width="170" />
        <ElTableColumn label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openDetail(row)">详情</ElButton>
            <!-- 后端 Audit 带 `Where("status", 0)` 守卫, 审核过再点会报"已审核过",
                 所以非待审状态直接不给按钮, 别让运营白点 -->
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
              @click="openReject(row)"
            >
              拒绝
            </ElButton>
            <ElButton link type="danger" @click="handleDelete(row)">
              删除
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

    <!-- 拒绝原因 -->
    <ElDialog v-model="rejectDialog" title="拒绝帖子" width="520px">
      <ElForm :model="rejectForm" label-width="80px">
        <ElFormItem label="帖子">
          <span>{{ rejectForm.title }}</span>
        </ElFormItem>
        <ElFormItem label="拒绝原因">
          <ElInput
            v-model="rejectForm.reason"
            type="textarea"
            :rows="4"
            placeholder="必填, 会展示给发帖用户"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="rejectDialog = false">取消</ElButton>
        <ElButton type="danger" :loading="rejecting" @click="submitReject">
          确认拒绝
        </ElButton>
      </template>
    </ElDialog>

    <!-- 详情 -->
    <ElDialog v-model="detailDialog" title="帖子详情" width="680px">
      <ElForm v-if="detail" label-width="80px">
        <ElFormItem label="ID">{{ detail.id }}</ElFormItem>
        <ElFormItem label="用户ID">{{ detail.user_id }}</ElFormItem>
        <ElFormItem label="标题">{{ detail.title }}</ElFormItem>
        <ElFormItem label="内容">
          <div class="whitespace-pre-wrap">{{ detail.content }}</div>
        </ElFormItem>
        <ElFormItem label="图片">
          <div class="flex flex-wrap gap-2">
            <ElImage
              v-for="(p, i) in detail.pics || []"
              :key="i"
              :src="p"
              fit="cover"
              style="width: 90px; height: 90px"
              preview-teleported
              :preview-src-list="detail.pics"
              :initial-index="i"
            />
            <span v-if="!detail.pics || detail.pics.length === 0" class="text-gray-400">
              无
            </span>
          </div>
        </ElFormItem>
        <ElFormItem label="拒绝原因">
          {{ detail.reject_reason || "-" }}
        </ElFormItem>
        <ElFormItem label="创建时间">{{ detail.created_at }}</ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="detailDialog = false">关闭</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
