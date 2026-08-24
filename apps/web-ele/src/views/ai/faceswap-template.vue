<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

import {
  ElButton,
  ElCard,
  ElCheckbox,
  ElCheckboxGroup,
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
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
  ElUpload,
} from "element-plus";

import {
  type AiTemplateApi,
  createAiTemplateApi,
  deleteAiTemplateApi,
  getAiTemplateListApi,
  updateAiTemplateApi,
} from "#/api/core/aitemplate";
import { uploadMediaApi } from "#/api/core/media";
import { adminMediaUrl } from "#/utils/media";

defineOptions({ name: "AiFaceswapTemplate" });

const BIZ = 1;
const CATS = ["精选推荐", "cosplay", "自慰挑逗", "裸体写真"];

const loading = ref(false);
const uploading = ref(false);
const list = ref<AiTemplateApi.Item[]>([]);
const selected = ref<AiTemplateApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ keyword: "", status: "", adult: "" });

function coverOf(row: AiTemplateApi.Item) {
  const p = row.params || {};
  return String(p.target_url || row.cover || row.preview || "");
}
function catsOf(row: AiTemplateApi.Item) {
  const p = row.params || {};
  if (Array.isArray(p.categories)) return p.categories.map(String);
  if (typeof p.category === "string" && p.category) return [p.category];
  return [];
}
function sizeOf(row: AiTemplateApi.Item) {
  const p = row.params || {};
  const w = Number(p.image_width || 0);
  const h = Number(p.image_height || 0);
  return w > 0 && h > 0 ? `${w}x${h}` : "-";
}
function isAdult(row: AiTemplateApi.Item) {
  return Boolean(row.params?.is_adult);
}

const shown = computed(() => {
  if (search.adult === "") return list.value;
  const want = search.adult === "1";
  return list.value.filter((row) => isAdult(row) === want);
});

async function fetchList() {
  loading.value = true;
  try {
    const res = await getAiTemplateListApi({
      biz_type: String(BIZ),
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
  search.keyword = "";
  search.status = "";
  search.adult = "";
  doSearch();
}

const dialog = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
const emptyForm = () => ({
  id: 0,
  name: "",
  categories: [] as string[],
  cover: "",
  cost_gold: 100,
  prompt: "",
  sort: 0,
  is_adult: 1,
  status: 1,
  image_width: 0,
  image_height: 0,
});
const form = reactive(emptyForm());
const rules = {
  name: [{ required: true, message: "请输入名称", trigger: "blur" }],
  cover: [{ required: true, message: "请上传图片", trigger: "change" }],
  cost_gold: [{ required: true, message: "请输入金币", trigger: "change" }],
  sort: [{ required: true, message: "请输入排序", trigger: "change" }],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  dialog.value = true;
}
function openEdit(row: AiTemplateApi.Item) {
  const p = row.params || {};
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    name: row.name,
    categories: catsOf(row),
    cover: coverOf(row),
    cost_gold: row.cost_gold,
    prompt: String(p.prompt || ""),
    sort: row.sort,
    is_adult: isAdult(row) ? 1 : 0,
    status: row.status,
    image_width: Number(p.image_width || 0),
    image_height: Number(p.image_height || 0),
  });
  dialog.value = true;
}

function readImageSize(file: File) {
  return new Promise<{ w: number; h: number }>((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ w: 0, h: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

async function onImgChange(file: any) {
  const raw: File | undefined = file?.raw;
  if (!raw) return false;
  uploading.value = true;
  try {
    const [res, size] = await Promise.all([uploadMediaApi(raw, "cover"), readImageSize(raw)]);
    form.cover = res.url;
    form.image_width = size.w;
    form.image_height = size.h;
    ElMessage.success("上传成功");
  } finally {
    uploading.value = false;
  }
  return false;
}

function buildParams() {
  return {
    target_url: form.cover,
    categories: form.categories,
    category: form.categories[0] || "精选推荐",
    prompt: form.prompt.trim(),
    is_adult: form.is_adult === 1,
    image_width: form.image_width,
    image_height: form.image_height,
    media_type: "photo",
  };
}

async function handleSave() {
  await formRef.value?.validate();
  if (!form.cover) {
    ElMessage.warning("请上传图片");
    return;
  }
  const body: AiTemplateApi.SaveBody = {
    name: form.name.trim(),
    biz_type: BIZ,
    cover: form.cover,
    preview: form.cover,
    params: buildParams(),
    cost_gold: Number(form.cost_gold) || 0,
    sort: Number(form.sort) || 0,
    status: form.status,
  };
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateAiTemplateApi(form.id, body);
      ElMessage.success("已保存");
    } else {
      await createAiTemplateApi(body);
      ElMessage.success("已新增");
    }
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: AiTemplateApi.Item) {
  await ElMessageBox.confirm(`确认删除模板「${row.name}」?`, "提示", { type: "warning" });
  await deleteAiTemplateApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

async function delSelected() {
  if (!selected.value.length) {
    ElMessage.warning("请选择需要的数据");
    return;
  }
  await ElMessageBox.confirm(`确定删除选中的 ${selected.value.length} 条?`, "提示", { type: "warning" });
  for (const row of selected.value) {
    await deleteAiTemplateApi(row.id);
  }
  ElMessage.success("已删除");
  fetchList();
}

const batchDialog = ref(false);
const batchSaving = ref(false);
const batch = reactive({
  categories: [] as string[],
  setCats: false,
  cost_gold: undefined as number | undefined,
  is_adult: "" as "" | "0" | "1",
  status: "" as "" | "0" | "1",
});

function openBatch() {
  if (!selected.value.length) {
    ElMessage.warning("请选择需要的数据");
    return;
  }
  batch.categories = [];
  batch.setCats = false;
  batch.cost_gold = undefined;
  batch.is_adult = "";
  batch.status = "";
  batchDialog.value = true;
}

async function handleBatch() {
  if (!batch.setCats && batch.cost_gold == null && batch.is_adult === "" && batch.status === "") {
    ElMessage.warning("请至少改一项");
    return;
  }
  batchSaving.value = true;
  try {
    for (const row of selected.value) {
      const params = { ...(row.params || {}) };
      if (batch.setCats) {
        params.categories = batch.categories;
        params.category = batch.categories[0] || "精选推荐";
      }
      if (batch.is_adult !== "") params.is_adult = batch.is_adult === "1";
      const body: AiTemplateApi.SaveBody = {
        name: row.name,
        biz_type: BIZ,
        cover: row.cover,
        preview: row.preview,
        params,
        cost_gold: batch.cost_gold != null ? Number(batch.cost_gold) : row.cost_gold,
        sort: row.sort,
        status: batch.status !== "" ? Number(batch.status) : row.status,
      };
      await updateAiTemplateApi(row.id, body);
    }
    ElMessage.success("已批量更新");
    batchDialog.value = false;
    fetchList();
  } finally {
    batchSaving.value = false;
  }
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <ElForm :inline="true" class="mb-2" @submit.prevent="doSearch">
        <ElFormItem label="名称">
          <ElInput v-model="search.keyword" clearable placeholder="请输入名称" style="width: 200px" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="search.status" clearable placeholder="请选择.." style="width: 140px">
            <ElOption label="正常" value="1" />
            <ElOption label="禁用" value="0" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="是否18禁">
          <ElSelect v-model="search.adult" clearable placeholder="请选择.." style="width: 140px">
            <ElOption label="是" value="1" />
            <ElOption label="否" value="0" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" native-type="submit">搜索</ElButton>
          <ElButton @click="resetSearch">重置</ElButton>
        </ElFormItem>
      </ElForm>

      <div class="mb-3 flex gap-2">
        <ElButton type="primary" @click="openCreate">添加</ElButton>
        <ElButton type="warning" @click="delSelected">删除</ElButton>
        <ElButton type="primary" @click="openBatch">批量设置</ElButton>
      </div>

      <ElTable
        v-loading="loading"
        :data="shown"
        border
        stripe
        size="small"
        @selection-change="selected = $event"
      >
        <ElTableColumn type="selection" width="42" align="center" />
        <ElTableColumn prop="id" label="ID" width="70" align="center" />
        <ElTableColumn prop="name" label="名称" min-width="120" show-overflow-tooltip />
        <ElTableColumn label="图片" width="80" align="center">
          <template #default="{ row }">
            <ElImage
              v-if="coverOf(row)"
              :src="adminMediaUrl(coverOf(row))"
              fit="cover"
              style="width: 44px; height: 44px"
              preview-teleported
              :preview-src-list="[adminMediaUrl(coverOf(row))]"
            />
            <span v-else>-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="图片尺寸" width="110" align="center">
          <template #default="{ row }">{{ sizeOf(row) }}</template>
        </ElTableColumn>
        <ElTableColumn label="分类" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ catsOf(row).join("、") || "-" }}</template>
        </ElTableColumn>
        <ElTableColumn label="金币" width="80" align="center">
          <template #default="{ row }">
            <span class="text-red-500">{{ Number(row.cost_gold) }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="使用次数" width="90" align="center">
          <template #default="{ row }">{{ row.usage_count ?? 0 }}</template>
        </ElTableColumn>
        <ElTableColumn prop="sort" label="排序" width="70" align="center" />
        <ElTableColumn label="是否18禁" width="90" align="center">
          <template #default="{ row }">{{ isAdult(row) ? "是" : "否" }}</template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="80" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? "正常" : "禁用" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="created_at" label="创建时间" width="170" />
        <ElTableColumn label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <ElButton type="primary" size="small" @click="openEdit(row)">编辑</ElButton>
            <ElButton type="warning" size="small" @click="handleDelete(row)">删除</ElButton>
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

    <ElDialog v-model="dialog" title="信息" width="560px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="名称" prop="name">
          <ElInput v-model="form.name" placeholder="请输入名称" />
        </ElFormItem>
        <ElFormItem label="分类">
          <ElCheckboxGroup v-model="form.categories">
            <ElCheckbox v-for="c in CATS" :key="c" :label="c" :value="c">{{ c }}</ElCheckbox>
          </ElCheckboxGroup>
        </ElFormItem>
        <ElFormItem label="图片" prop="cover">
          <div class="flex items-start gap-3">
            <ElImage
              v-if="form.cover"
              :src="adminMediaUrl(form.cover)"
              fit="cover"
              class="h-20 w-20 rounded border"
            />
            <ElUpload
              :show-file-list="false"
              accept="image/*"
              :disabled="uploading"
              :before-upload="() => false"
              :on-change="onImgChange"
            >
              <ElButton :loading="uploading">上传图片</ElButton>
            </ElUpload>
          </div>
        </ElFormItem>
        <ElFormItem label="金币" prop="cost_gold">
          <ElInputNumber v-model="form.cost_gold" :min="0" :precision="0" />
        </ElFormItem>
        <ElFormItem label="提示文字">
          <ElInput v-model="form.prompt" placeholder="选填" />
        </ElFormItem>
        <ElFormItem label="排序" prop="sort">
          <ElInputNumber v-model="form.sort" :min="0" />
        </ElFormItem>
        <ElFormItem label="是否18禁">
          <ElRadioGroup v-model="form.is_adult">
            <ElRadio :value="0">否</ElRadio>
            <ElRadio :value="1">是</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElRadioGroup v-model="form.status">
            <ElRadio :value="0">禁用</ElRadio>
            <ElRadio :value="1">正常</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton type="primary" :loading="saving" @click="handleSave">立即提交</ElButton>
        <ElButton @click="Object.assign(form, emptyForm())">重置</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="batchDialog" title="批量设置" width="480px">
      <ElForm label-width="100px">
        <ElFormItem label="分类">
          <div>
            <ElCheckbox v-model="batch.setCats">同时改分类</ElCheckbox>
            <ElCheckboxGroup v-model="batch.categories" :disabled="!batch.setCats" class="mt-2">
              <ElCheckbox v-for="c in CATS" :key="c" :label="c" :value="c">{{ c }}</ElCheckbox>
            </ElCheckboxGroup>
          </div>
        </ElFormItem>
        <ElFormItem label="金币">
          <ElInputNumber v-model="batch.cost_gold" :min="0" :precision="0" placeholder="不改则留空" />
        </ElFormItem>
        <ElFormItem label="是否18禁">
          <ElSelect v-model="batch.is_adult" clearable placeholder="不改则留空" style="width: 180px">
            <ElOption label="否" value="0" />
            <ElOption label="是" value="1" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="batch.status" clearable placeholder="不改则留空" style="width: 180px">
            <ElOption label="禁用" value="0" />
            <ElOption label="正常" value="1" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton type="primary" :loading="batchSaving" @click="handleBatch">立即提交</ElButton>
        <ElButton @click="batchDialog = false">取消</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
