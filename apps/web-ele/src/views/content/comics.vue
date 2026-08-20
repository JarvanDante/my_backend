<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

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
} from "element-plus";

import {
  auditComicsApi,
  type ComicsApi,
  createComicsApi,
  createComicsChapterApi,
  deleteComicsApi,
  deleteComicsChapterApi,
  getComicsChaptersApi,
  getComicsListApi,
  getMediaComicsListApi,
  pickMediaComicsApi,
  type MediaComicsApi,
  updateComicsApi,
  updateComicsChapterApi,
} from "#/api/core/comics";
import {
  getComicsCategoryListApi,
  type ComicsCategoryApi,
} from "#/api/core/comics-category";
import { getTagListApi, type TagApi } from "#/api/core/tag";

defineOptions({ name: "ContentComics" });

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
const list = ref<ComicsApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ status: "", category: "", keyword: "" });
const categories = ref<ComicsCategoryApi.Item[]>([]);
const workCategories = computed(() =>
  categories.value.filter((c) => c.kind === 0 && c.status === 1),
);
const mangaTags = ref<TagApi.Item[]>([]);
const enabledMangaTags = computed(() => mangaTags.value.filter((t) => t.status === 1));

async function loadCategories() {
  const res = await getComicsCategoryListApi({ status: "1", page: 1, size: 100 });
  categories.value = res.list || [];
}

async function loadMangaTags() {
  const res = await getTagListApi({ content_type: 4, page: 1, size: 200 });
  mangaTags.value = res.list || [];
}

async function fetchList() {
  loading.value = true;
  try {
    const res = await getComicsListApi({
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

// ---------- 作品新增/编辑 ----------
const dialog = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
const emptyForm = (): ComicsApi.SaveBody & { id: number; categories: string[] } => ({
  id: 0,
  title: "",
  author: "",
  cover: "",
  intro: "",
  category: "",
  categories: [],
  tags: [],
  is_vip: 0,
  price: 0,
  free_chapter: 1,
  update_status: 1,
  rank: 0,
  is_recommend: 0,
  status: 0,
});
const form = reactive(emptyForm());
const rules = {
  title: [{ required: true, message: "标题必填", trigger: "blur" }],
};

function splitCategories(row: { category?: string; categories?: string[] }) {
  if (row.categories?.length) {
    return [...row.categories];
  }
  return (row.category || "")
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  dialog.value = true;
}
function openEdit(row: ComicsApi.Item) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    title: row.title,
    author: row.author,
    cover: row.cover,
    intro: row.intro,
    category: row.category,
    categories: splitCategories(row),
    tags: row.tags || [],
    is_vip: row.is_vip,
    price: row.price,
    free_chapter: row.free_chapter,
    update_status: row.update_status,
    rank: row.rank,
    is_recommend: row.is_recommend || 0,
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
  if (form.status === 1 && !form.categories.length) {
    ElMessage.warning("上架前请选择本站分类");
    return;
  }
  const body: ComicsApi.SaveBody = {
    title: form.title,
    author: form.author,
    cover: form.cover,
    intro: form.intro,
    category: form.categories.join(","),
    categories: form.categories,
    tags: form.tags || [],
    is_vip: form.is_vip,
    price: Number(form.price) || 0,
    free_chapter: Number(form.free_chapter) || 0,
    update_status: form.update_status,
    rank: Number(form.rank) || 0,
    is_recommend: form.is_recommend ? 1 : 0,
    status: form.status,
  };
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateComicsApi(form.id, body);
      ElMessage.success("已保存");
    } else {
      await createComicsApi(body);
      ElMessage.success("已新增");
    }
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleAudit(row: ComicsApi.Item, status: number) {
  if (status === 1 && !splitCategories(row).length) {
    ElMessage.warning("请先编辑并选择本站分类后再上架");
    openEdit(row);
    return;
  }
  await auditComicsApi(row.id, status);
  ElMessage.success(status === 1 ? "已上架" : "已下架");
  fetchList();
}

async function handleDelete(row: ComicsApi.Item) {
  await ElMessageBox.confirm(
    `确认删除《${row.title}》? 其下 ${row.chapter_count} 个章节会一并删除。`,
    "提示",
    { type: "warning" },
  );
  await deleteComicsApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

// ---------- 章节管理 ----------
const chapterDialog = ref(false);
const chapterLoading = ref(false);
const chapters = ref<ComicsApi.Chapter[]>([]);
const chapterPage = reactive({ current: 1, size: 50, total: 0 });
const current = ref<ComicsApi.Item | null>(null);

async function openChapters(row: ComicsApi.Item) {
  current.value = row;
  chapterPage.current = 1;
  chapterDialog.value = true;
  await loadChapters();
}
async function loadChapters() {
  if (!current.value) return;
  chapterLoading.value = true;
  try {
    const res = await getComicsChaptersApi(current.value.id, {
      page: chapterPage.current,
      size: chapterPage.size,
    });
    chapters.value = res.list || [];
    chapterPage.total = res.total || 0;
  } finally {
    chapterLoading.value = false;
  }
}

const chDialog = ref(false);
const chIsEdit = ref(false);
const chSaving = ref(false);
const chForm = reactive({ id: 0, seq: 1, title: "", picText: "", status: 1 });

function openChCreate() {
  chIsEdit.value = false;
  Object.assign(chForm, {
    id: 0,
    seq: (chapters.value.at(-1)?.seq ?? 0) + 1,
    title: "",
    picText: "",
    status: 1,
  });
  chDialog.value = true;
}
function openChEdit(row: ComicsApi.Chapter) {
  chIsEdit.value = true;
  Object.assign(chForm, {
    id: row.id,
    seq: row.seq,
    title: row.title,
    picText: (row.pics || []).map((p) => p.url).join("\n"),
    status: row.status,
  });
  chDialog.value = true;
}
async function saveChapter() {
  if (!current.value) return;
  const pics: ComicsApi.Pic[] = chForm.picText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((url) => ({ url, width: 0, height: 0 }));
  chSaving.value = true;
  try {
    if (chIsEdit.value) {
      await updateComicsChapterApi(chForm.id, {
        seq: chForm.seq,
        title: chForm.title,
        pics,
        status: chForm.status,
      });
      ElMessage.success("章节已保存");
    } else {
      await createComicsChapterApi(current.value.id, {
        seq: chForm.seq,
        title: chForm.title,
        pics,
        status: chForm.status,
      });
      ElMessage.success("章节已新增");
    }
    chDialog.value = false;
    await loadChapters();
    fetchList(); // 章节数变了, 刷新列表
  } finally {
    chSaving.value = false;
  }
}
async function delChapter(row: ComicsApi.Chapter) {
  await ElMessageBox.confirm(`确认删除章节「第${row.seq}话」?`, "提示", {
    type: "warning",
  });
  await deleteComicsChapterApi(row.id);
  ElMessage.success("已删除");
  await loadChapters();
  fetchList();
}

const assetDialog = ref(false);
const assetLoading = ref(false);
const assets = ref<MediaComicsApi.Item[]>([]);
const assetSearch = reactive({ keyword: "" });
const assetPage = reactive({ current: 1, size: 10, total: 0 });
const pickingId = ref("");

async function loadAssets() {
  assetLoading.value = true;
  try {
    const res = await getMediaComicsListApi({
      keyword: assetSearch.keyword || undefined,
      page: assetPage.current,
      size: assetPage.size,
    });
    assets.value = res.list || [];
    assetPage.total = res.total || 0;
  } finally {
    assetLoading.value = false;
  }
}

function openAssetDialog() {
  assetDialog.value = true;
  assetPage.current = 1;
  void loadAssets();
}

async function pickAsset(row: MediaComicsApi.Item) {
  pickingId.value = row.id;
  try {
    await pickMediaComicsApi(row.id);
    ElMessage.success(
      row.local_id
        ? `已更新「${row.title || row.id}」`
        : `已同步「${row.title || row.id}」，请编辑分类后再上架`,
    );
    await loadAssets();
    await fetchList();
  } catch (e: any) {
    ElMessage.error(e?.message || "同步失败");
  } finally {
    pickingId.value = "";
  }
}

onMounted(() => {
  loadCategories().catch(() => undefined);
  loadMangaTags().catch(() => undefined);
  fetchList();
});
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <ElSelect v-model="search.status" style="width: 120px" @change="doSearch">
          <ElOption v-for="o in statusOpts" :key="o.value" :label="o.label" :value="o.value" />
        </ElSelect>
        <ElSelect
          v-model="search.category"
          placeholder="分类"
          clearable
          filterable
          style="width: 140px"
          @change="doSearch"
        >
          <ElOption
            v-for="c in workCategories"
            :key="c.id"
            :label="c.name"
            :value="c.name"
          />
        </ElSelect>
        <ElInput
          v-model="search.keyword"
          placeholder="标题/作者关键字"
          style="width: 220px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">新增漫画</ElButton>
        <ElButton @click="openAssetDialog">从媒资中心选用</ElButton>
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
        <ElTableColumn prop="title" label="标题" min-width="160" show-overflow-tooltip />
        <ElTableColumn prop="author" label="作者" width="110" />
        <ElTableColumn label="分类" min-width="140">
          <template #default="{ row }">
            <template v-if="splitCategories(row).length">
              <ElTag
                v-for="name in splitCategories(row)"
                :key="name"
                size="small"
                class="mb-1 mr-1"
              >
                {{ name }}
              </ElTag>
            </template>
            <span v-else class="text-orange-500">未分类</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="标签" min-width="160">
          <template #default="{ row }">
            <template v-if="row.tags?.length">
              <ElTag
                v-for="name in row.tags"
                :key="name"
                type="info"
                size="small"
                class="mb-1 mr-1"
              >
                {{ name }}
              </ElTag>
            </template>
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
        <ElTableColumn label="推荐" width="70" align="center">
          <template #default="{ row }">
            <ElTag v-if="row.is_recommend === 1" type="warning" size="small">推荐</ElTag>
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="定价" width="120">
          <template #default="{ row }">
            <ElTag v-if="row.is_vip === 1" type="warning" size="small">VIP专享</ElTag>
            <ElTag v-else-if="row.price > 0" type="danger" size="small">
              {{ row.price }} 金币
            </ElTag>
            <ElTag v-else type="success" size="small">免费</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="free_chapter" label="免费章" width="80" align="center" />
        <ElTableColumn prop="chapter_count" label="章节数" width="80" align="center" />
        <ElTableColumn prop="view_count" label="观看" width="80" align="center" />
        <ElTableColumn prop="buy_count" label="购买" width="80" align="center" />
        <ElTableColumn label="连载" width="80" align="center">
          <template #default="{ row }">
            {{ row.update_status === 2 ? "完结" : "连载中" }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="rank" label="权重" width="70" align="center" />
        <ElTableColumn label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openChapters(row)">章节</ElButton>
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

    <!-- 作品表单 -->
    <ElDialog v-model="dialog" :title="isEdit ? '编辑漫画' : '新增漫画'" width="620px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="90px">
        <ElFormItem label="标题" prop="title">
          <ElInput v-model="form.title" />
        </ElFormItem>
        <ElFormItem label="作者">
          <ElInput v-model="form.author" />
        </ElFormItem>
        <ElFormItem label="封面">
          <ElInput v-model="form.cover" placeholder="图片 URL" />
        </ElFormItem>
        <ElFormItem label="简介">
          <ElInput v-model="form.intro" type="textarea" :rows="3" />
        </ElFormItem>
        <ElFormItem label="分类">
          <ElSelect
            v-model="form.categories"
            class="comics-multi-select"
            placeholder="可多选，上架前至少选一个"
            multiple
            clearable
            filterable
          >
            <ElOption
              v-for="c in workCategories"
              :key="c.id"
              :label="c.name"
              :value="c.name"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="标签">
          <ElSelect
            v-model="form.tags"
            class="comics-multi-select"
            placeholder="从漫画标签库多选"
            multiple
            clearable
            filterable
            allow-create
            default-first-option
          >
            <ElOption
              v-for="t in enabledMangaTags"
              :key="t.id"
              :label="t.name"
              :value="t.name"
            />
          </ElSelect>
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
        <ElFormItem label="免费章节数">
          <ElInputNumber v-model="form.free_chapter" :min="0" />
          <span class="ml-2 text-xs text-gray-400">前 N 话免费, 序号 ≤ N</span>
        </ElFormItem>
        <ElFormItem label="连载状态">
          <ElSelect v-model="form.update_status" style="width: 160px">
            <ElOption label="连载中" :value="1" />
            <ElOption label="已完结" :value="2" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="推荐">
          <ElSwitch
            v-model="form.is_recommend"
            :active-value="1"
            :inactive-value="0"
          />
          <span class="ml-2 text-xs text-gray-400">打开后进入「推荐」栏，权重越大越靠前</span>
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

    <!-- 章节管理 -->
    <ElDialog
      v-model="chapterDialog"
      :title="`章节管理 - ${current?.title ?? ''}`"
      width="860px"
    >
      <div class="mb-3 flex items-center">
        <span class="text-sm text-gray-500">
          序号 ≤ {{ current?.free_chapter ?? 0 }} 的章节对所有人免费
        </span>
        <div class="flex-1"></div>
        <ElButton type="primary" size="small" @click="openChCreate">新增章节</ElButton>
      </div>
      <ElTable v-loading="chapterLoading" :data="chapters" border stripe max-height="420">
        <ElTableColumn prop="seq" label="序号" width="70" align="center" />
        <ElTableColumn prop="title" label="标题" min-width="140" />
        <ElTableColumn prop="pic_count" label="图片数" width="80" align="center" />
        <ElTableColumn label="免费" width="70" align="center">
          <template #default="{ row }">
            <ElTag v-if="row.seq <= (current?.free_chapter ?? 0)" type="success" size="small">
              免费
            </ElTag>
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="80" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? "上架" : "下架" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="created_at" label="创建时间" width="170" />
        <ElTableColumn label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openChEdit(row)">编辑</ElButton>
            <ElButton link type="danger" @click="delChapter(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="mt-3 flex justify-end">
        <ElPagination
          v-model:current-page="chapterPage.current"
          :page-size="chapterPage.size"
          :total="chapterPage.total"
          layout="total, prev, pager, next"
          @current-change="loadChapters"
        />
      </div>
    </ElDialog>

    <!-- 章节表单 -->
    <ElDialog v-model="chDialog" :title="chIsEdit ? '编辑章节' : '新增章节'" width="560px">
      <ElForm :model="chForm" label-width="80px">
        <ElFormItem label="序号">
          <ElInputNumber v-model="chForm.seq" :min="1" />
          <span class="ml-2 text-xs text-gray-400">同一作品内不可重复</span>
        </ElFormItem>
        <ElFormItem label="标题">
          <ElInput v-model="chForm.title" placeholder="如: 第1话" />
        </ElFormItem>
        <ElFormItem label="图片">
          <ElInput
            v-model="chForm.picText"
            type="textarea"
            :rows="6"
            placeholder="一行一个图片 URL, 按顺序展示"
          />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="chForm.status" style="width: 140px">
            <ElOption label="上架" :value="1" />
            <ElOption label="下架" :value="0" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="chDialog = false">取消</ElButton>
        <ElButton type="primary" :loading="chSaving" @click="saveChapter">保存</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="assetDialog" title="从媒资中心选用漫画" width="860px" destroy-on-close>
      <p class="mb-3 text-xs text-gray-500">
        总后台不指定分类。选用后进入「待上架」，请在本站编辑分类后再上架。
      </p>
      <div class="mb-3 flex items-center gap-2">
        <ElInput
          v-model="assetSearch.keyword"
          clearable
          class="w-64"
          placeholder="搜索漫画标题"
          @keyup.enter="loadAssets"
        />
        <ElButton type="primary" @click="loadAssets">查询</ElButton>
      </div>
      <ElTable v-loading="assetLoading" :data="assets" border stripe>
        <ElTableColumn label="封面" width="80">
          <template #default="{ row }">
            <ElImage
              v-if="row.cover_url"
              :src="row.cover_url"
              fit="cover"
              class="h-14 w-10 rounded"
              preview-teleported
              :preview-src-list="[row.cover_url]"
            />
            <span v-else class="text-xs text-gray-400">无</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <ElTableColumn label="章节" width="80" align="center">
          <template #default="{ row }">{{ row.chapter_count || 0 }} 章</template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="row.local_id ? 'success' : 'info'" size="small">
              {{ row.local_id ? "已入库" : "未入库" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <ElButton
              link
              type="primary"
              :loading="pickingId === row.id"
              @click="pickAsset(row)"
            >
              {{ row.local_id ? "更新" : "选用" }}
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="mt-3 flex justify-end">
        <ElPagination
          v-model:current-page="assetPage.current"
          v-model:page-size="assetPage.size"
          :total="assetPage.total"
          layout="total, prev, pager, next"
          @current-change="loadAssets"
        />
      </div>
    </ElDialog>
  </div>
</template>

<style scoped>
.comics-multi-select {
  width: 100%;
}
.comics-multi-select :deep(.el-select__selection) {
  flex-wrap: wrap;
}
.comics-multi-select :deep(.el-select__selected-item) {
  max-width: 100%;
}
</style>
