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
  auditPublishApi,
  getPublishListApi,
  type PublishApi,
} from "#/api/core/publish";

defineOptions({ name: "ContentPublish" });

// 投稿状态机: 待审可以被审核; 通过/拒绝是终态; 已撤回是用户自己撤的, 后台不可再审。
const statusOpts = [
  { label: "全部", value: "" },
  { label: "待审核", value: "0" },
  { label: "已通过", value: "1" },
  { label: "已拒绝", value: "2" },
  { label: "已撤回", value: "3" },
];
const statusMap: Record<
  number,
  { text: string; type: "danger" | "info" | "success" | "warning" }
> = {
  0: { text: "待审核", type: "warning" },
  1: { text: "已通过", type: "success" },
  2: { text: "已拒绝", type: "danger" },
  3: { text: "已撤回", type: "info" },
};

// 投稿内容类型, 与后端 publish.type 对齐
const typeOpts = [
  { label: "全部类型", value: "" },
  { label: "视频", value: "1" },
  { label: "漫画", value: "2" },
  { label: "小说", value: "3" },
  { label: "图集", value: "4" },
];
const typeMap: Record<number, string> = {
  1: "视频",
  2: "漫画",
  3: "小说",
  4: "图集",
};

const loading = ref(false);
const list = ref<PublishApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
// status / user_id / type 都用 string: 空串=不筛选, 传数字 0 会被后端当成"筛待审"
const search = reactive({ status: "", user_id: "", type: "", keyword: "" });

async function fetchList() {
  loading.value = true;
  try {
    const res = await getPublishListApi({
      status: search.status,
      user_id: search.user_id,
      type: search.type,
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
  search.user_id = "";
  search.type = "";
  search.keyword = "";
  doSearch();
}

// ---------- 审核 ----------
const auditDialog = ref(false);
const auditing = ref(false);
const current = ref<PublishApi.Item | null>(null);
const auditForm = reactive({ pass: true, reject_reason: "" });

function openAudit(row: PublishApi.Item, pass: boolean) {
  current.value = row;
  auditForm.pass = pass;
  auditForm.reject_reason = "";
  auditDialog.value = true;
}

async function submitAudit() {
  if (!current.value) return;
  // 拒绝必须给理由: 用户端要把这段文案原样展示出来, 空理由等于没有反馈
  if (!auditForm.pass && !auditForm.reject_reason.trim()) {
    ElMessage.warning("拒绝时必须填写原因");
    return;
  }
  auditing.value = true;
  try {
    await auditPublishApi(current.value.id, {
      pass: auditForm.pass,
      reject_reason: auditForm.pass ? "" : auditForm.reject_reason.trim(),
    });
    ElMessage.success(auditForm.pass ? "已通过" : "已拒绝");
    auditDialog.value = false;
    fetchList();
  } finally {
    auditing.value = false;
  }
}

// ---------- 详情 ----------
const detailDialog = ref(false);
function openDetail(row: PublishApi.Item) {
  current.value = row;
  detailDialog.value = true;
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <ElSelect v-model="search.status" style="width: 120px" @change="doSearch">
          <ElOption v-for="o in statusOpts" :key="o.value" :label="o.label" :value="o.value" />
        </ElSelect>
        <ElSelect v-model="search.type" style="width: 120px" @change="doSearch">
          <ElOption v-for="o in typeOpts" :key="o.value" :label="o.label" :value="o.value" />
        </ElSelect>
        <ElInput
          v-model="search.user_id"
          placeholder="投稿用户ID"
          style="width: 140px"
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
        <ElTableColumn prop="user_id" label="用户ID" width="90" align="center" />
        <ElTableColumn label="类型" width="80" align="center">
          <template #default="{ row }">
            {{ typeMap[row.type] ?? row.type }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="封面" width="80">
          <template #default="{ row }">
            <ElImage
              v-if="row.cover"
              :src="row.cover"
              fit="cover"
              style="width: 44px; height: 60px"
              preview-teleported
              :preview-src-list="[row.cover]"
            />
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <ElTableColumn label="资源" width="80" align="center">
          <template #default="{ row }">
            <ElTag v-if="(row.resource || []).length" type="primary" size="small">
              {{ (row.resource || []).length }} 项
            </ElTag>
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="statusMap[row.status]?.type" size="small">
              {{ statusMap[row.status]?.text ?? row.status }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="拒绝原因" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.reject_reason">{{ row.reject_reason }}</span>
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="审核信息" width="180">
          <template #default="{ row }">
            <span v-if="row.audit_at" class="text-xs text-gray-500">
              #{{ row.audit_by }} · {{ row.audit_at }}
            </span>
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="created_at" label="投稿时间" width="170" />
        <ElTableColumn label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openDetail(row)">详情</ElButton>
            <!-- 只有待审(0)能审核, 其余状态是终态或用户已撤回 -->
            <template v-if="row.status === 0">
              <ElButton link type="success" @click="openAudit(row, true)">通过</ElButton>
              <ElButton link type="danger" @click="openAudit(row, false)">拒绝</ElButton>
            </template>
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

    <!-- 审核弹窗 -->
    <ElDialog
      v-model="auditDialog"
      :title="auditForm.pass ? '通过投稿' : '拒绝投稿'"
      width="520px"
    >
      <ElForm :model="auditForm" label-width="90px">
        <ElFormItem label="投稿">
          <span>#{{ current?.id }} {{ current?.title }}</span>
        </ElFormItem>
        <ElFormItem v-if="!auditForm.pass" label="拒绝原因">
          <ElInput
            v-model="auditForm.reject_reason"
            type="textarea"
            :rows="4"
            maxlength="255"
            show-word-limit
            placeholder="会原样展示给投稿用户, 请写清楚不合规的点"
          />
        </ElFormItem>
        <ElFormItem v-else label="说明">
          <span class="text-sm text-gray-500">
            通过后会生成对应作品, 审核结果不可回退
          </span>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="auditDialog = false">取消</ElButton>
        <ElButton
          :type="auditForm.pass ? 'primary' : 'danger'"
          :loading="auditing"
          @click="submitAudit"
        >
          确定
        </ElButton>
      </template>
    </ElDialog>

    <!-- 投稿详情 -->
    <ElDialog v-model="detailDialog" title="投稿详情" width="680px">
      <ElForm label-width="90px">
        <ElFormItem label="ID">
          <span>{{ current?.id }}</span>
        </ElFormItem>
        <ElFormItem label="投稿用户">
          <span>#{{ current?.user_id }}</span>
        </ElFormItem>
        <ElFormItem label="类型">
          <span>{{ typeMap[current?.type ?? 0] ?? current?.type }}</span>
        </ElFormItem>
        <ElFormItem label="标题">
          <span>{{ current?.title || "-" }}</span>
        </ElFormItem>
        <ElFormItem label="简介">
          <span>{{ current?.intro || "-" }}</span>
        </ElFormItem>
        <ElFormItem label="标签">
          <ElTag
            v-for="t in current?.tags ?? []"
            :key="t"
            size="small"
            class="mr-1"
          >
            {{ t }}
          </ElTag>
          <span v-if="!(current?.tags ?? []).length" class="text-gray-400">-</span>
        </ElFormItem>
        <ElFormItem label="封面">
          <ElImage
            v-if="current?.cover"
            :src="current?.cover ?? ''"
            fit="cover"
            style="width: 110px; height: 150px"
            preview-teleported
            :preview-src-list="[current?.cover ?? '']"
          />
          <span v-else class="text-gray-400">未上传</span>
        </ElFormItem>
        <ElFormItem label="资源">
          <!-- resource 是 jsonb, 可能为 null / 空数组, 这里统一兜底 -->
          <div v-if="(current?.resource ?? []).length" class="flex flex-col gap-1">
            <span
              v-for="(r, i) in current?.resource ?? []"
              :key="i"
              class="break-all text-sm"
            >
              {{ i + 1 }}. {{ r }}
            </span>
          </div>
          <span v-else class="text-gray-400">无资源</span>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElTag :type="statusMap[current?.status ?? 0]?.type" size="small">
            {{ statusMap[current?.status ?? 0]?.text ?? current?.status }}
          </ElTag>
        </ElFormItem>
        <ElFormItem label="拒绝原因">
          <span>{{ current?.reject_reason || "-" }}</span>
        </ElFormItem>
        <ElFormItem label="投稿时间">
          <span>{{ current?.created_at || "-" }}</span>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="detailDialog = false">关闭</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
