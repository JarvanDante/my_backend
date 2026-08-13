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
  auditPhotoApi,
  createPhotoApi,
  deletePhotoApi,
  getPhotoListApi,
  type PhotoApi,
  updatePhotoApi,
} from "#/api/core/photo";

defineOptions({ name: "ContentPhoto" });

// 上下架状态与漫画/小说/图集共用一套编码(见后端 entity.ContentStatus*)
const statusOpts = [
  { label: "全部", value: "" },
  { label: "待上架", value: "0" },
  { label: "已上架", value: "1" },
  { label: "已下架", value: "2" },
];
const statusMap: Record<number, { text: string; type: "danger" | "info" | "success" }> = {
  0: { text: "待上架", type: "info" },
  1: { text: "已上架", type: "success" },
  2: { text: "已下架", type: "danger" },
};

const loading = ref(false);
const list = ref<PhotoApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ status: "", category: "", keyword: "" });

async function fetchList() {
  loading.value = true;
  try {
    const res = await getPhotoListApi({
      status: search.status,
      category: search.category || undefined,
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
  search.category = "";
  search.keyword = "";
  doSearch();
}

// ---------- 图集新增/编辑 ----------
const dialog = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
const emptyForm = (): PhotoApi.SaveBody & {
  id: number;
  tagText: string;
  picText: string;
} => ({
  id: 0,
  title: "",
  cover: "",
  intro: "",
  category: "",
  tags: [],
  tagText: "",
  picText: "",
  is_vip: 0,
  price: 0,
  free_count: 0,
  rank: 0,
  status: 0,
});
const form = reactive(emptyForm());
const rules = {
  title: [{ required: true, message: "标题必填", trigger: "blur" }],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  dialog.value = true;
}
function openEdit(row: PhotoApi.Item) {
  isEdit.value = true;
  // pics 提交时是整体覆盖, 所以这里必须回填完整列表, 否则保存会把没显示的图丢掉
  Object.assign(form, {
    id: row.id,
    title: row.title,
    cover: row.cover,
    intro: row.intro,
    category: row.category,
    tags: row.tags || [],
    tagText: (row.tags || []).join(","),
    picText: (row.pics || []).map((p) => p.url).join("\n"),
    is_vip: row.is_vip,
    price: row.price,
    free_count: row.free_count,
    rank: row.rank,
    status: row.status,
  });
  dialog.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  // VIP 专享与金币定价互斥, 后端也会拦, 这里先给出即时反馈
  if (form.is_vip === 1 && Number(form.price) > 0) {
    ElMessage.warning("VIP 专享与金币定价互斥, 二选一");
    return;
  }
  // 图集没有章节, 宽高交给后端/客户端兜底, 后台只维护顺序与地址
  const pics: PhotoApi.Pic[] = form.picText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((url) => ({ url, width: 0, height: 0 }));
  const body: PhotoApi.SaveBody = {
    title: form.title,
    cover: form.cover,
    intro: form.intro,
    category: form.category,
    tags: form.tagText
      ? form.tagText.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
      : [],
    is_vip: form.is_vip,
    price: Number(form.price) || 0,
    free_count: Number(form.free_count) || 0,
    pics,
    rank: Number(form.rank) || 0,
    status: form.status,
  };
  saving.value = true;
  try {
    if (isEdit.value) {
      await updatePhotoApi(form.id, body);
      ElMessage.success("已保存");
    } else {
      await createPhotoApi(body);
      ElMessage.success("已新增");
    }
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleAudit(row: PhotoApi.Item, status: number) {
  await auditPhotoApi(row.id, status);
  ElMessage.success(status === 1 ? "已上架" : "已下架");
  fetchList();
}

async function handleDelete(row: PhotoApi.Item) {
  await ElMessageBox.confirm(
    `确认删除图集《${row.title}》? 其下 ${row.pic_count} 张图片会一并删除。`,
    "提示",
    { type: "warning" },
  );
  await deletePhotoApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

// ---------- 图片预览 ----------
const picDialog = ref(false);
const current = ref<PhotoApi.Item | null>(null);
function openPics(row: PhotoApi.Item) {
  current.value = row;
  picDialog.value = true;
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
        <ElInput
          v-model="search.category"
          placeholder="分类"
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
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">新增图集</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="70" />
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
        <ElTableColumn prop="category" label="分类" width="100" />
        <ElTableColumn label="定价" width="120">
          <template #default="{ row }">
            <ElTag v-if="row.is_vip === 1" type="warning" size="small">VIP专享</ElTag>
            <ElTag v-else-if="row.price > 0" type="danger" size="small">
              {{ row.price }} 金币
            </ElTag>
            <ElTag v-else type="success" size="small">免费</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="free_count" label="免费张数" width="90" align="center" />
        <ElTableColumn prop="pic_count" label="图片数" width="80" align="center" />
        <ElTableColumn prop="view_count" label="观看" width="80" align="center" />
        <ElTableColumn prop="buy_count" label="购买" width="80" align="center" />
        <ElTableColumn prop="like_count" label="点赞" width="80" align="center" />
        <ElTableColumn prop="rank" label="权重" width="70" align="center" />
        <ElTableColumn label="状态" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="statusMap[row.status]?.type" size="small">
              {{ statusMap[row.status]?.text ?? row.status }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openPics(row)">图片</ElButton>
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton
              v-if="row.status !== 1"
              link
              type="success"
              @click="handleAudit(row, 1)"
            >
              上架
            </ElButton>
            <ElButton v-else link type="warning" @click="handleAudit(row, 2)">
              下架
            </ElButton>
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

    <!-- 图集表单 -->
    <ElDialog v-model="dialog" :title="isEdit ? '编辑图集' : '新增图集'" width="620px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="90px">
        <ElFormItem label="标题" prop="title">
          <ElInput v-model="form.title" />
        </ElFormItem>
        <ElFormItem label="封面">
          <ElInput v-model="form.cover" placeholder="图片 URL" />
        </ElFormItem>
        <ElFormItem label="简介">
          <ElInput v-model="form.intro" type="textarea" :rows="3" />
        </ElFormItem>
        <ElFormItem label="分类">
          <ElInput v-model="form.category" placeholder="如: 写真 / cosplay" />
        </ElFormItem>
        <ElFormItem label="标签">
          <ElInput v-model="form.tagText" placeholder="多个标签用逗号分隔" />
        </ElFormItem>
        <ElFormItem label="付费方式">
          <ElSelect v-model="form.is_vip" style="width: 160px">
            <ElOption label="金币付费/免费" :value="0" />
            <ElOption label="VIP 专享" :value="1" />
          </ElSelect>
          <span class="ml-2 text-xs text-gray-400">VIP 专享与金币价互斥</span>
        </ElFormItem>
        <ElFormItem label="金币价">
          <ElInputNumber v-model="form.price" :min="0" :precision="2" :disabled="form.is_vip === 1" />
          <span class="ml-2 text-xs text-gray-400">0 = 免费</span>
        </ElFormItem>
        <ElFormItem label="免费张数">
          <ElInputNumber v-model="form.free_count" :min="0" />
          <span class="ml-2 text-xs text-gray-400">
            未购买用户只能看前 N 张, 其余锁住; 填 0 = 全部要付费
          </span>
        </ElFormItem>
        <ElFormItem label="图片">
          <ElInput
            v-model="form.picText"
            type="textarea"
            :rows="8"
            placeholder="一行一个图片 URL, 按顺序展示"
          />
        </ElFormItem>
        <ElFormItem label="排序权重">
          <ElInputNumber v-model="form.rank" :min="0" />
        </ElFormItem>
        <ElFormItem label="上架状态">
          <ElSelect v-model="form.status" style="width: 160px">
            <ElOption label="待上架" :value="0" />
            <ElOption label="上架" :value="1" />
            <ElOption label="下架" :value="2" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 图片预览: 用于人工过审时逐张核对 -->
    <ElDialog
      v-model="picDialog"
      :title="`图片列表 - ${current?.title ?? ''}`"
      width="860px"
    >
      <div class="mb-3 text-sm text-gray-500">
        共 {{ current?.pic_count ?? 0 }} 张, 前
        {{ current?.free_count ?? 0 }} 张对未购买用户可见
      </div>
      <div class="flex flex-wrap gap-2">
        <div v-for="(p, i) in current?.pics ?? []" :key="i" class="relative">
          <ElImage
            :src="p.url"
            fit="cover"
            style="width: 110px; height: 150px"
            preview-teleported
            :preview-src-list="(current?.pics ?? []).map((x) => x.url)"
            :initial-index="i"
          />
          <ElTag
            :type="i < (current?.free_count ?? 0) ? 'success' : 'info'"
            size="small"
            class="absolute left-1 top-1"
          >
            {{ i + 1 }}
          </ElTag>
        </div>
        <span v-if="!(current?.pics ?? []).length" class="text-gray-400">暂无图片</span>
      </div>
    </ElDialog>
  </div>
</template>
