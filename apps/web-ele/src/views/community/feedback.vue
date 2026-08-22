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
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import {
  type FeedbackApi,
  getFeedbackListApi,
  handleFeedbackApi,
} from "#/api/core/feedback";

defineOptions({ name: "CommunityFeedback" });

// 注意: 反馈这个模块后端筛选参数是 int 且 0=全部(没有 -1), 见 feedback.ts 里的坑位备忘。
// 页面里仍按全站约定用 string 存, 空串=不筛选, 发请求时才转 number。
const statusOpts = [
  { label: "全部", value: "" },
  { label: "未处理", value: "1" },
  { label: "已处理", value: "2" },
];
const typeOpts = [
  { label: "全部类型", value: "" },
  { label: "用户反馈", value: "1" },
  { label: "程序反馈", value: "2" },
];
// status 只有 1/2 两个值(见 00020_create_feedback.sql), 1 是"处理中", 运营口径就是未处理
const statusMap: Record<number, { text: string; type: "success" | "warning" }> = {
  1: { text: "未处理", type: "warning" },
  2: { text: "已处理", type: "success" },
};
const typeMap: Record<number, string> = { 1: "用户反馈", 2: "程序反馈" };
const problemTypeMap: Record<number, string> = {
  1: "功能建议",
  2: "内容问题",
  3: "支付问题",
  4: "账号问题",
  5: "播放卡顿",
  6: "其他",
};

const loading = ref(false);
const list = ref<FeedbackApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ status: "", type: "" });

async function fetchList() {
  loading.value = true;
  try {
    const res = await getFeedbackListApi({
      // 空串 → 0, 后端 `if f.Status > 0` 才过滤, 0 即全部
      status: search.status ? Number(search.status) : 0,
      type: search.type ? Number(search.type) : 0,
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
  search.type = "";
  doSearch();
}

// ---------- 处理 ----------
const dialog = ref(false);
const saving = ref(false);
const form = reactive({ id: 0, content: "", reply: "", status: 2 });

function openHandle(row: FeedbackApi.Item) {
  Object.assign(form, {
    id: row.id,
    content: row.content,
    // 回填已有回复, 方便二次修改
    reply: row.reply || "",
    // 默认置为已处理, 需要继续跟进可改回"处理中"
    status: 2,
  });
  dialog.value = true;
}
async function submitHandle() {
  if (!form.reply.trim()) {
    ElMessage.warning("请填写回复内容");
    return;
  }
  saving.value = true;
  try {
    await handleFeedbackApi(form.id, form.reply.trim(), form.status);
    ElMessage.success("已提交");
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

// ---------- 详情 ----------
const detailDialog = ref(false);
const detail = ref<FeedbackApi.Item | null>(null);
function openDetail(row: FeedbackApi.Item) {
  detail.value = row;
  detailDialog.value = true;
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
        <ElSelect v-model="search.type" style="width: 140px" @change="doSearch">
          <ElOption
            v-for="o in typeOpts"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </ElSelect>
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="70" />
        <ElTableColumn prop="user_id" label="用户ID" width="90" />
        <ElTableColumn label="类型" width="100" align="center">
          <template #default="{ row }">
            {{ typeMap[row.type] ?? row.type }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="问题类型" width="100" align="center">
          <template #default="{ row }">
            {{ problemTypeMap[row.problem_type] ?? row.problem_type }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          prop="content"
          label="反馈内容"
          min-width="240"
          show-overflow-tooltip
        />
        <ElTableColumn label="图片" width="80">
          <template #default="{ row }">
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
        <ElTableColumn
          prop="media_title"
          label="关联内容"
          min-width="140"
          show-overflow-tooltip
        />
        <ElTableColumn label="状态" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="statusMap[row.status]?.type" size="small">
              {{ statusMap[row.status]?.text ?? row.status }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn
          prop="reply"
          label="回复"
          min-width="180"
          show-overflow-tooltip
        />
        <ElTableColumn prop="created_at" label="提交时间" width="170" />
        <ElTableColumn label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openDetail(row)">详情</ElButton>
            <ElButton link type="primary" @click="openHandle(row)">
              {{ row.status === 2 ? "修改回复" : "处理" }}
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

    <!-- 处理弹窗 -->
    <ElDialog v-model="dialog" title="处理反馈" width="560px">
      <ElForm :model="form" label-width="90px">
        <ElFormItem label="反馈内容">
          <div class="whitespace-pre-wrap text-sm">{{ form.content }}</div>
        </ElFormItem>
        <ElFormItem label="回复内容">
          <ElInput
            v-model="form.reply"
            type="textarea"
            :rows="4"
            placeholder="必填, 用户端可见"
          />
        </ElFormItem>
        <ElFormItem label="处理状态">
          <ElSelect v-model="form.status" style="width: 160px">
            <ElOption label="已处理" :value="2" />
            <ElOption label="继续跟进(未处理)" :value="1" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="submitHandle">
          提交
        </ElButton>
      </template>
    </ElDialog>

    <!-- 详情 -->
    <ElDialog v-model="detailDialog" title="反馈详情" width="680px">
      <ElForm v-if="detail" label-width="90px">
        <ElFormItem label="ID">{{ detail.id }}</ElFormItem>
        <ElFormItem label="用户ID">{{ detail.user_id }}</ElFormItem>
        <ElFormItem label="类型">
          {{ typeMap[detail.type] ?? detail.type }} /
          {{ problemTypeMap[detail.problem_type] ?? detail.problem_type }}
        </ElFormItem>
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
            <span
              v-if="!detail.pics || detail.pics.length === 0"
              class="text-gray-400"
            >
              无
            </span>
          </div>
        </ElFormItem>
        <ElFormItem label="关联内容">
          {{ detail.media_title || "-" }}（media_id: {{ detail.media_id }}）
        </ElFormItem>
        <ElFormItem label="系统信息">
          <div class="whitespace-pre-wrap text-xs text-gray-500">
            {{ detail.sys_info || "-" }}
          </div>
        </ElFormItem>
        <ElFormItem label="回复">{{ detail.reply || "-" }}</ElFormItem>
        <ElFormItem label="提交时间">{{ detail.created_at }}</ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="detailDialog = false">关闭</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
