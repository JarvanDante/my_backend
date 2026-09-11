<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

import {
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
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import {
  createComicsModuleApi,
  deleteComicsModuleApi,
  getComicsModuleListApi,
  type ComicsModuleApi,
  updateComicsModuleApi,
} from "#/api/core/comics-module";
import {
  getComicsCategoryListApi,
  type ComicsCategoryApi,
} from "#/api/core/comics-category";
import { getTagListApi, type TagApi } from "#/api/core/tag";

defineOptions({ name: "ContentComicsModule" });

const COMICS_TYPE = 4;
const kindLabel = (kind: number) => {
  if (kind === 1) return "新更";
  if (kind === 2) return "推荐";
  if (kind === 3) return "榜单";
  return "";
};
const posOpts = computed(() =>
  [...categories.value]
    .sort((a, b) => (b.rank || 0) - (a.rank || 0) || b.id - a.id)
    .map((c) => ({
      label: kindLabel(c.kind) ? `${c.name}（${kindLabel(c.kind)}）` : c.name,
      value: `cat_${c.id}`,
    })),
);
const defaultPos = () => posOpts.value[0]?.value || "";
const orderOpts = [
  { label: "最新", value: "new" },
  { label: "随机", value: "rand" },
  { label: "最多观看", value: "hot" },
  { label: "最多点赞", value: "like" },
];
const endOpts = [
  { label: "不限", value: "" },
  { label: "完结", value: "y" },
  { label: "连载", value: "n" },
];
const payOpts = [
  { label: "不限", value: "" },
  { label: "VIP", value: "vip" },
  { label: "金币", value: "coin" },
  { label: "免费", value: "free" },
];
const styleOpts = [
  { label: "样式1 1大2小 横图", value: 1 },
  { label: "样式2 2小 横图", value: 2 },
  { label: "样式3 1大 横图", value: 3 },
  { label: "样式4 2竖图", value: 4 },
  { label: "样式5 竖图横滑", value: 5 },
  { label: "样式6 横图横滑", value: 6 },
  { label: "样式7 竖图3X3", value: 7 },
  { label: "样式8 竖图3X2", value: 8 },
];
const defaultSizeOf = (style: number) => {
  if (style === 7) return 9;
  if (style === 5 || style === 6) return 10;
  return 6;
};
const styleMap: Record<number, string> = Object.fromEntries(
  styleOpts.map((o) => [o.value, o.label]),
);
const iconOpts = [
  { label: "最新", value: 1 },
  { label: "星星", value: 2 },
  { label: "火", value: 3 },
];
const iconMap: Record<number, string> = Object.fromEntries(
  iconOpts.map((o) => [o.value, o.label]),
);
const posMap = computed(() =>
  Object.fromEntries(posOpts.value.map((o) => [o.value, o.label])),
);
const statusOpts = [
  { label: "全部状态", value: "" },
  { label: "显示", value: "1" },
  { label: "关闭", value: "0" },
];

const loading = ref(false);
const list = ref<ComicsModuleApi.Item[]>([]);
const tags = ref<TagApi.Item[]>([]);
const categories = ref<ComicsCategoryApi.Item[]>([]);
const workCategories = () => categories.value.filter((c) => c.kind === 0);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ name: "", position: "", category_id: "" as number | "", status: "" });

async function fetchTags() {
  const res = await getTagListApi({
    content_type: COMICS_TYPE,
    status: "1",
    page: 1,
    size: 200,
  });
  tags.value = res.list || [];
}

async function fetchCategories() {
  const res = await getComicsCategoryListApi({ status: "1", page: 1, size: 200 });
  categories.value = res.list || [];
}

async function fetchList() {
  loading.value = true;
  try {
    const res = await getComicsModuleListApi({
      name: search.name.trim() || undefined,
      position: search.position || undefined,
      category_id: search.category_id || undefined,
      status: search.status,
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
  search.name = "";
  search.position = "";
  search.category_id = "";
  search.status = "";
  doSearch();
}

const dialog = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
type FilterDraft = {
  tag_id: number[];
  cat_id: number[];
  order: string;
  is_end: string;
  pay_type: string;
  ids: string;
  keywords: string;
  recommend: boolean;
};
const emptyDraft = (): FilterDraft => ({
  tag_id: [],
  cat_id: [],
  order: "new",
  is_end: "",
  pay_type: "",
  ids: "",
  keywords: "",
  recommend: false,
});
const parseFilter = (raw?: string, cats: number[] = [], tags: number[] = []): FilterDraft => {
  const draft = emptyDraft();
  draft.cat_id = [...cats];
  draft.tag_id = [...tags];
  if (!raw) return draft;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const toIds = (v: unknown) =>
      String(v ?? "")
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => n > 0);
    if (obj.tag_id !== undefined) draft.tag_id = toIds(obj.tag_id);
    if (obj.cat_id !== undefined) draft.cat_id = toIds(obj.cat_id);
    if (typeof obj.order === "string" && obj.order) draft.order = obj.order;
    if (obj.is_end === "y" || obj.is_end === "n") draft.is_end = obj.is_end;
    if (typeof obj.pay_type === "string") draft.pay_type = obj.pay_type;
    if (obj.ids !== undefined) draft.ids = String(obj.ids);
    if (typeof obj.keywords === "string") draft.keywords = obj.keywords;
    draft.recommend = obj.recommend === "y" || obj.recommend === 1 || obj.recommend === true;
  } catch {
    /* 旧数据无 JSON 时用分类/标签兜底 */
  }
  return draft;
};
const buildFilter = (d: FilterDraft) => {
  const obj: Record<string, string> = { order: d.order || "new" };
  if (d.tag_id.length) obj.tag_id = d.tag_id.join(",");
  if (d.cat_id.length) obj.cat_id = d.cat_id.join(",");
  if (d.is_end) obj.is_end = d.is_end;
  if (d.pay_type) obj.pay_type = d.pay_type;
  if (d.ids.trim()) obj.ids = d.ids.trim();
  if (d.keywords.trim()) obj.keywords = d.keywords.trim();
  if (d.recommend) obj.recommend = "y";
  return JSON.stringify(obj);
};
const emptyForm = () => ({
  id: 0,
  name: "",
  position: "",
  style: 7,
  icon: 1,
  size: 9,
  rank: 0,
  status: 1,
  draft: emptyDraft(),
});
const form = reactive(emptyForm());
const posCatId = () => {
  const m = /^cat_(\d+)$/.exec(form.position);
  return m ? Number(m[1]) : 0;
};
const posWorkCategory = () => {
  const id = posCatId();
  return categories.value.find((c) => c.id === id && c.kind === 0) || null;
};
const extraWorkCategories = () => {
  const pinned = posCatId();
  return workCategories().filter((c) => c.id !== pinned);
};
const contentCatIds = () => {
  const pinned = posWorkCategory()?.id;
  return form.draft.cat_id.filter((id) => id !== pinned);
};
const filterPreview = computed(() =>
  buildFilter({ ...form.draft, cat_id: contentCatIds() }),
);
const onPositionChange = () => {
  const pinned = posWorkCategory()?.id;
  if (pinned) {
    form.draft.cat_id = form.draft.cat_id.filter((id) => id !== pinned);
  }
};
const onStyleChange = (style: number) => {
  form.size = defaultSizeOf(style);
};
const rules = {
  name: [{ required: true, message: "名称必填", trigger: "blur" }],
  position: [{ required: true, message: "请选择位置", trigger: "change" }],
  style: [{ required: true, message: "请选择样式", trigger: "change" }],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  form.position = defaultPos();
  dialog.value = true;
}
function openEdit(row: ComicsModuleApi.Item) {
  isEdit.value = true;
  const draft = parseFilter(row.filter, row.category_ids || [], row.tag_ids || []);
  Object.assign(form, {
    id: row.id,
    name: row.name,
    position:
      row.position && row.position !== "comic_home"
        ? row.position
        : defaultPos(),
    style: row.style || 7,
    icon: row.icon || 1,
    size: row.size || 9,
    rank: row.rank || 0,
    status: row.status,
    draft,
  });
  onPositionChange();
  dialog.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  const body = {
    name: form.name,
    position: form.position,
    style: Number(form.style) || 7,
    icon: Number(form.icon) || 1,
    category_ids: contentCatIds(),
    tag_ids: form.draft.tag_id,
    filter: buildFilter({ ...form.draft, cat_id: contentCatIds() }),
    size: Number(form.size) || defaultSizeOf(Number(form.style) || 7),
    rank: Number(form.rank) || 0,
    status: form.status,
  };
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateComicsModuleApi(form.id, body);
      ElMessage.success("已保存");
    } else {
      await createComicsModuleApi(body);
      ElMessage.success("已新增");
    }
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: ComicsModuleApi.Item) {
  await ElMessageBox.confirm(`确认删除模块「${row.name}」?`, "提示", {
    type: "warning",
  });
  await deleteComicsModuleApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

onMounted(async () => {
  await Promise.all([fetchCategories(), fetchTags(), fetchList()]);
});
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <ElInput
          v-model="search.name"
          placeholder="输入名称"
          clearable
          style="width: 180px"
          @keyup.enter="doSearch"
        />
        <ElSelect
          v-model="search.category_id"
          placeholder="分类"
          clearable
          style="width: 160px"
          @change="doSearch"
        >
          <ElOption
            v-for="c in workCategories()"
            :key="c.id"
            :label="c.name"
            :value="c.id"
          />
        </ElSelect>
        <ElSelect
          v-model="search.position"
          placeholder="位置"
          clearable
          style="width: 160px"
          @change="doSearch"
        >
          <ElOption
            v-for="o in posOpts"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </ElSelect>
        <ElSelect v-model="search.status" style="width: 120px" @change="doSearch">
          <ElOption v-for="o in statusOpts" :key="o.value" :label="o.label" :value="o.value" />
        </ElSelect>
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">新增模块</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="80" />
        <ElTableColumn prop="name" label="名称" min-width="140" />
        <ElTableColumn label="展示位置" min-width="140">
          <template #default="{ row }">
            {{ posMap[row.position] || row.position }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="展示风格" min-width="160">
          <template #default="{ row }">
            {{ styleMap[row.style] ?? row.style }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="分类" min-width="160">
          <template #default="{ row }">
            {{
              row.category_names?.length
                ? row.category_names.join(" / ")
                : "不限分类"
            }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="标签" min-width="200">
          <template #default="{ row }">
            {{
              row.tag_names?.length
                ? row.tag_names.join(" / ")
                : "未选标签（按最新）"
            }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="图标" width="80" align="center">
          <template #default="{ row }">
            {{ iconMap[row.icon] ?? row.icon }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="rank" label="排序" width="80" align="center" />
        <ElTableColumn prop="size" label="展示数量" width="90" align="center" />
        <ElTableColumn label="是否显示" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? "显示" : "关闭" }}
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

    <ElDialog v-model="dialog" :title="isEdit ? '编辑模块' : '新增模块'" width="560px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="名称" prop="name">
          <ElInput v-model="form.name" placeholder="如: 丝袜联盟" maxlength="64" />
        </ElFormItem>
        <ElFormItem label="位置" prop="position">
          <ElSelect v-model="form.position" style="width: 260px" @change="onPositionChange">
            <ElOption
              v-for="o in posOpts"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </ElSelect>
          <p class="mt-1 text-xs text-gray-400">挂在哪个分类 Tab。默认是权重最高的分类。</p>
        </ElFormItem>
        <ElFormItem label="样式" prop="style">
          <ElSelect v-model="form.style" style="width: 260px" @change="onStyleChange">
            <ElOption
              v-for="o in styleOpts"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="posWorkCategory()" label="作品分类">
          <p class="text-xs leading-5 text-gray-500">
            已按位置限定为「{{ posWorkCategory()?.name }}」，下面用标签等继续收窄即可。
          </p>
        </ElFormItem>
        <ElFormItem v-else label="作品分类">
          <ElSelect
            v-model="form.draft.cat_id"
            multiple
            clearable
            filterable
            placeholder="楼层出哪些漫画，不选则不限"
            style="width: 100%"
          >
            <ElOption
              v-for="c in extraWorkCategories()"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </ElSelect>
          <p class="mt-1 text-xs text-gray-400">和位置无关。多选为命中任一，再和标签同时生效。</p>
        </ElFormItem>
        <ElFormItem label="标签">
          <ElSelect
            v-model="form.draft.tag_id"
            multiple
            clearable
            filterable
            placeholder="不选则不限标签"
            style="width: 100%"
          >
            <ElOption
              v-for="t in tags"
              :key="t.id"
              :label="t.name"
              :value="t.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="内容排序">
          <ElSelect v-model="form.draft.order" style="width: 180px">
            <ElOption v-for="o in orderOpts" :key="o.value" :label="o.label" :value="o.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="连载">
          <ElSelect v-model="form.draft.is_end" style="width: 140px">
            <ElOption v-for="o in endOpts" :key="o.value" :label="o.label" :value="o.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="付费">
          <ElSelect v-model="form.draft.pay_type" style="width: 140px">
            <ElOption v-for="o in payOpts" :key="o.value" :label="o.label" :value="o.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="仅推荐">
          <ElRadioGroup v-model="form.draft.recommend">
            <ElRadio :value="false">否</ElRadio>
            <ElRadio :value="true">是</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="指定作品">
          <ElInput v-model="form.draft.ids" placeholder="可选，作品 ID 逗号分隔" />
        </ElFormItem>
        <ElFormItem label="检索预览">
          <p class="break-all font-mono text-xs text-gray-500">{{ filterPreview }}</p>
          <p class="mt-1 text-xs text-gray-400">保存时写入。查分类/标签等属性，不是标题。</p>
        </ElFormItem>
        <ElFormItem label="展示数量">
          <ElInputNumber v-model="form.size" :min="1" :max="30" />
          <span class="ml-2 text-xs text-gray-400">3X2 默认 6，3X3 默认 9，前台按此数量出图</span>
        </ElFormItem>
        <ElFormItem label="图标">
          <ElRadioGroup v-model="form.icon">
            <ElRadio :value="1">最新</ElRadio>
            <ElRadio :value="2">星星</ElRadio>
            <ElRadio :value="3">火</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="排序">
          <ElInputNumber v-model="form.rank" :min="0" />
          <span class="ml-2 text-xs text-gray-400">数值越大越靠前</span>
        </ElFormItem>
        <ElFormItem label="是否显示">
          <ElRadioGroup v-model="form.status">
            <ElRadio :value="1">显示</ElRadio>
            <ElRadio :value="0">关闭</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
