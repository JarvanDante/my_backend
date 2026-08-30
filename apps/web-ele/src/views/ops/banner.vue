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
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
  ElUpload,
} from "element-plus";

import {
  type BannerApi,
  createBannerApi,
  deleteBannerApi,
  getBannerListApi,
  updateBannerApi,
} from "#/api/core/banner";
import { uploadMediaApi } from "#/api/core/media";
import { adminMediaUrl } from "#/utils/media";

defineOptions({ name: "OpsBanner" });

const posOpts = [
  { label: "漫画", value: "comics" },
  { label: "动漫", value: "cartoon" },
  { label: "视频", value: "video" },
  { label: "小说", value: "novel" },
];
const statusOpts = [
  { label: "全部", value: "" },
  { label: "下架", value: "0" },
  { label: "上架", value: "1" },
];
const posLabel = (v: string) => posOpts.find((o) => o.value === v)?.label || v || "-";

const loading = ref(false);
const list = ref<BannerApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ position: "", status: "", keyword: "" });

async function fetchList() {
  loading.value = true;
  try {
    const res = await getBannerListApi({
      position: search.position || undefined,
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
  search.position = "";
  search.status = "";
  search.keyword = "";
  doSearch();
}

const dialog = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const imgUploading = ref(false);
const formRef = ref();
const emptyForm = () => ({
  id: 0,
  position: "comics",
  title: "",
  cover_url: "",
  link: "",
  rank: 0,
  status: 1,
});
const form = reactive(emptyForm());
const rules = {
  position: [{ required: true, message: "位置必填", trigger: "change" }],
  cover_url: [{ required: true, message: "请上传轮播图", trigger: "change" }],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  dialog.value = true;
}
function openEdit(row: BannerApi.Item) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    position: row.position,
    title: row.title,
    cover_url: row.cover_url,
    link: row.link,
    rank: row.rank,
    status: row.status,
  });
  dialog.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  const body: BannerApi.SaveBody = {
    position: form.position,
    title: form.title,
    cover_url: form.cover_url,
    link: form.link,
    rank: Number(form.rank) || 0,
    status: form.status,
  };
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateBannerApi(form.id, body);
      ElMessage.success("已保存");
    } else {
      await createBannerApi(body);
      ElMessage.success("已新增");
    }
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: BannerApi.Item) {
  await ElMessageBox.confirm(`确认删除这条轮播?`, "提示", { type: "warning" });
  await deleteBannerApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

async function onImgChange(file: any) {
  const raw: File | undefined = file?.raw;
  if (!raw) return false;
  imgUploading.value = true;
  try {
    const res = await uploadMediaApi(raw, "cover");
    form.cover_url = res.url;
    ElMessage.success("上传成功");
  } finally {
    imgUploading.value = false;
  }
  return false;
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <ElSelect
          v-model="search.position"
          placeholder="位置"
          clearable
          style="width: 140px"
          @change="doSearch"
        >
          <ElOption label="全部" value="" />
          <ElOption
            v-for="o in posOpts"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </ElSelect>
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
          placeholder="标题关键字"
          style="width: 220px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">新增轮播</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="70" />
        <ElTableColumn label="封面" width="140">
          <template #default="{ row }">
            <ElImage
              v-if="row.cover_url"
              :src="adminMediaUrl(row.cover_url)"
              fit="cover"
              style="width: 112px; height: 48px"
              preview-teleported
              :preview-src-list="[adminMediaUrl(row.cover_url)]"
            />
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="位置" width="90" align="center">
          <template #default="{ row }">
            <ElTag size="small">{{ posLabel(row.position) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="title" label="标题" min-width="140" show-overflow-tooltip />
        <ElTableColumn prop="link" label="跳转" min-width="200" show-overflow-tooltip />
        <ElTableColumn prop="rank" label="权重" width="80" align="center" />
        <ElTableColumn label="状态" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? "上架" : "下架" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="created_at" label="创建时间" width="170" />
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

    <ElDialog v-model="dialog" :title="isEdit ? '编辑轮播' : '新增轮播'" width="560px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="位置" prop="position">
          <ElSelect v-model="form.position" class="w-full">
            <ElOption
              v-for="o in posOpts"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="轮播图" prop="cover_url">
          <ElUpload
            class="cover-uploader"
            :show-file-list="false"
            accept="image/*"
            :disabled="imgUploading"
            :before-upload="() => false"
            :on-change="onImgChange"
          >
            <img
              v-if="form.cover_url"
              :src="adminMediaUrl(form.cover_url)"
              class="cover-preview"
            />
            <div v-else class="cover-plus">+</div>
          </ElUpload>
        </ElFormItem>
        <ElFormItem label="标题">
          <ElInput v-model="form.title" maxlength="64" placeholder="可选，展示在图上" />
        </ElFormItem>
        <ElFormItem label="跳转">
          <ElInput
            v-model="form.link"
            placeholder="H5 路径如 /comic/xxx，或 https://..."
          />
        </ElFormItem>
        <ElFormItem label="排序权重">
          <ElInputNumber v-model="form.rank" :min="0" class="w-full" />
          <p class="mt-1 text-xs text-gray-400">越大越靠前</p>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSwitch
            v-model="form.status"
            :active-value="1"
            :inactive-value="0"
            active-text="上架"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.cover-uploader :deep(.el-upload) {
  width: 240px;
  height: 105px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}
.cover-preview {
  width: 240px;
  height: 105px;
  object-fit: cover;
  display: block;
}
.cover-plus {
  width: 240px;
  height: 105px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #c0c4cc;
}
</style>
