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

import { adminMediaUrl } from "#/utils/media";
import {
  auditDramaApi,
  deleteDramaApi,
  type DramaApi,
  type DramaCategoryApi,
  getDramaCategoryListApi,
  getDramaEpisodesApi,
  getDramaListApi,
  getMediaDramasListApi,
  type MediaDramaApi,
  pickMediaDramaApi,
  syncDramaEpisodesApi,
  updateDramaApi,
  updateDramaEpisodeApi,
} from "#/api/core/drama";
import { getTagListApi, type TagApi } from "#/api/core/tag";

defineOptions({ name: "ContentDrama" });

// 上下架状态与漫画、小说共用一套编码。
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
// 单集付费方式与后端 entity.DramaPay* 一一对应。
const payModeOpts = [
  { label: "跟随整部", value: 0 },
  { label: "免费", value: 1 },
  { label: "金币", value: 2 },
  { label: "VIP", value: 3 },
];
const payModeMap: Record<number, string> = Object.fromEntries(
  payModeOpts.map((o) => [o.value, o.label]),
);

const loading = ref(false);
const list = ref<DramaApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ status: "", category: "", keyword: "" });
const categories = ref<DramaCategoryApi.Item[]>([]);
const workCategories = computed(() =>
  categories.value.filter((c) => c.kind === 0 && c.status === 1),
);
const dramaTags = ref<TagApi.Item[]>([]);
const enabledDramaTags = computed(() => dramaTags.value.filter((t) => t.status === 1));

async function loadCategories() {
  const res = await getDramaCategoryListApi({ status: "1", page: 1, size: 200 });
  categories.value = res.list || [];
}

async function loadDramaTags() {
  const res = await getTagListApi({ content_type: 8, page: 1, size: 200 });
  dramaTags.value = res.list || [];
}

async function fetchList() {
  loading.value = true;
  try {
    const res = await getDramaListApi({
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

function splitCategories(row: { category?: string; categories?: string[] }) {
  if (row.categories?.length) {
    return [...row.categories];
  }
  return (row.category || "")
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function fmtDuration(sec: number) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ---------- 短剧编辑 ----------
const dialog = ref(false);
const saving = ref(false);
const formRef = ref();
// 列表封面可能是媒资签名地址，记下原值以便未改动时不回写。
const originCover = ref("");
const emptyForm = () => ({
  id: 0,
  title: "",
  cover: "",
  intro: "",
  categories: [] as string[],
  tags: [] as string[],
  is_vip: 0,
  price: 0,
  free_episode: 0,
  update_status: 1,
  rank: 0,
  is_recommend: 0,
  status: 0,
});
const form = reactive(emptyForm());
const rules = {
  title: [{ required: true, message: "标题必填", trigger: "blur" }],
};

function openEdit(row: DramaApi.Item) {
  originCover.value = row.cover || "";
  Object.assign(form, {
    id: row.id,
    title: row.title,
    cover: row.cover || "",
    intro: row.intro,
    categories: splitCategories(row),
    tags: row.tags || [],
    is_vip: row.is_vip,
    price: row.price,
    free_episode: row.free_episode,
    update_status: row.update_status === 2 ? 2 : 1,
    rank: row.rank,
    is_recommend: row.is_recommend || 0,
    status: row.status,
  });
  dialog.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  if (form.is_vip === 1 && Number(form.price) > 0) {
    ElMessage.warning("VIP 专享与金币定价互斥, 二选一");
    return;
  }
  if (form.status === 1 && !form.categories.length) {
    ElMessage.warning("上架前请选择本站分类");
    return;
  }
  const body: DramaApi.SaveBody = {
    title: form.title,
    intro: form.intro,
    category: form.categories.join(","),
    categories: form.categories,
    tags: form.tags || [],
    is_vip: form.is_vip,
    price: form.is_vip === 1 ? 0 : Number(form.price) || 0,
    free_episode: Number(form.free_episode) || 0,
    update_status: form.update_status,
    rank: Number(form.rank) || 0,
    is_recommend: form.is_recommend ? 1 : 0,
    status: form.status,
  };
  const cover = form.cover.trim();
  if (cover && cover !== originCover.value) {
    body.cover = cover;
  }
  saving.value = true;
  try {
    await updateDramaApi(form.id, body);
    ElMessage.success("已保存");
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleAudit(row: DramaApi.Item, status: number) {
  if (status === 1 && !splitCategories(row).length) {
    ElMessage.warning("请先编辑并选择本站分类后再上架");
    openEdit(row);
    return;
  }
  if (status === 1 && !row.episode_count) {
    ElMessage.warning("没有可播剧集, 请先同步剧集");
    return;
  }
  await auditDramaApi(row.id, status);
  ElMessage.success(status === 1 ? "已上架" : "已下架");
  fetchList();
}

async function handleDelete(row: DramaApi.Item) {
  await ElMessageBox.confirm(
    `确认删除《${row.title}》? 本站剧集会一并删除, 已有购买记录的请改为下架。`,
    "提示",
    { type: "warning" },
  );
  await deleteDramaApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

const syncingId = ref(0);
async function handleSync(row: DramaApi.Item) {
  syncingId.value = row.id;
  try {
    const r = await syncDramaEpisodesApi(row.id);
    ElMessage.success(
      `同步完成：新增 ${r.created} 集，更新 ${r.updated} 集，缺失 ${r.missing} 集，媒资就绪共 ${r.total} 集`,
    );
    await fetchList();
    if (current.value?.id === row.id && episodeDialog.value) {
      await loadEpisodes();
    }
  } finally {
    syncingId.value = 0;
  }
}

// ---------- 剧集管理 ----------
const episodeDialog = ref(false);
const episodeLoading = ref(false);
const episodes = ref<DramaApi.Episode[]>([]);
const episodePage = reactive({ current: 1, size: 50, total: 0 });
const current = ref<DramaApi.Item | null>(null);

async function openEpisodes(row: DramaApi.Item) {
  current.value = row;
  episodePage.current = 1;
  episodeDialog.value = true;
  await loadEpisodes();
}
async function loadEpisodes() {
  if (!current.value) return;
  episodeLoading.value = true;
  try {
    const res = await getDramaEpisodesApi(current.value.id, {
      page: episodePage.current,
      size: episodePage.size,
    });
    episodes.value = res.list || [];
    episodePage.total = res.total || 0;
  } finally {
    episodeLoading.value = false;
  }
}

// 按整部默认规则推算 pay_mode=0 的集实际生效方式，仅作展示。
function effectivePay(ep: DramaApi.Episode) {
  const d = current.value;
  if (ep.pay_mode === 1) return "免费";
  if (ep.pay_mode === 3) return "VIP";
  if (ep.pay_mode === 2) {
    const p = ep.price > 0 ? ep.price : d?.price ?? 0;
    return p > 0 ? `${p} 金币` : "免费";
  }
  if (!d || ep.seq <= d.free_episode) return "免费";
  if (d.is_vip === 1) return "VIP";
  return d.price > 0 ? `${d.price} 金币` : "免费";
}

const epDialog = ref(false);
const epSaving = ref(false);
const epForm = reactive({ id: 0, seq: 0, pay_mode: 0, price: 0, status: 1 });

function openEpEdit(row: DramaApi.Episode) {
  Object.assign(epForm, {
    id: row.id,
    seq: row.seq,
    pay_mode: row.pay_mode,
    price: row.price,
    status: row.status,
  });
  epDialog.value = true;
}
async function saveEpisode() {
  const body: DramaApi.EpisodeBody = {
    pay_mode: epForm.pay_mode,
    price: epForm.pay_mode === 2 ? Number(epForm.price) || 0 : 0,
    status: epForm.status,
  };
  epSaving.value = true;
  try {
    await updateDramaEpisodeApi(epForm.id, body);
    ElMessage.success("剧集已保存");
    epDialog.value = false;
    await loadEpisodes();
  } finally {
    epSaving.value = false;
  }
}

// ---------- 媒资选用 ----------
const assetDialog = ref(false);
const assetLoading = ref(false);
const assets = ref<MediaDramaApi.Item[]>([]);
const pickingId = ref("");
const assetSearch = reactive({ keyword: "" });
const assetPage = reactive({ current: 1, size: 10, total: 0 });

async function loadAssets() {
  assetLoading.value = true;
  try {
    const res = await getMediaDramasListApi({
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
  assetSearch.keyword = "";
  void loadAssets();
}
function searchAssets() {
  assetPage.current = 1;
  void loadAssets();
}
async function pickAsset(row: MediaDramaApi.Item) {
  pickingId.value = row.id;
  try {
    await pickMediaDramaApi(row.id);
    ElMessage.success(
      row.local_id
        ? `已重新选用「${row.title || row.id}」并同步剧集`
        : `已选用「${row.title || row.id}」，请编辑分类后再上架`,
    );
    await loadAssets();
    await fetchList();
  } finally {
    pickingId.value = "";
  }
}

onMounted(() => {
  loadCategories();
  loadDramaTags();
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
          style="width: 160px"
          clearable
          filterable
          @change="doSearch"
        >
          <ElOption v-for="c in workCategories" :key="c.id" :label="c.name" :value="c.name" />
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
        <ElButton type="primary" @click="openAssetDialog">从媒资库选用</ElButton>
      </div>

      <ElTable
        v-loading="loading"
        :data="list"
        class="drama-table"
        size="small"
        border
        stripe
        style="width: 100%"
      >
        <ElTableColumn prop="id" label="ID" width="56" align="center" />
        <ElTableColumn label="封面" width="76" align="center">
          <template #default="{ row }">
            <ElImage
              v-if="row.cover"
              :src="adminMediaUrl(row.cover)"
              fit="cover"
              style="width: 44px; height: 60px"
              preview-teleported
              :preview-src-list="[adminMediaUrl(row.cover)]"
            />
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="title" label="标题" min-width="140" show-overflow-tooltip />
        <ElTableColumn label="分类" min-width="96">
          <template #default="{ row }">
            <template v-if="splitCategories(row).length">
              <ElTag
                v-for="name in splitCategories(row)"
                :key="name"
                size="small"
                class="drama-chip"
              >
                {{ name }}
              </ElTag>
            </template>
            <span v-else class="text-orange-500">未分类</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="标签" min-width="96">
          <template #default="{ row }">
            <template v-if="row.tags?.length">
              <ElTag
                v-for="name in row.tags"
                :key="name"
                type="primary"
                size="small"
                class="drama-chip"
              >
                {{ name }}
              </ElTag>
            </template>
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="68" align="center">
          <template #default="{ row }">
            <ElTag :type="statusMap[row.status]?.type" size="small">
              {{ statusMap[row.status]?.text ?? row.status }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="推荐" width="52" align="center">
          <template #default="{ row }">
            <ElTag v-if="row.is_recommend === 1" type="warning" size="small">推荐</ElTag>
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="默认定价" width="80" align="center">
          <template #default="{ row }">
            <ElTag v-if="row.is_vip === 1" type="warning" size="small">VIP</ElTag>
            <ElTag v-else-if="row.price > 0" type="danger" size="small">
              {{ row.price }} 金币
            </ElTag>
            <ElTag v-else type="success" size="small">免费</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="free_episode" label="免费集" width="60" align="center" />
        <ElTableColumn prop="episode_count" label="就绪集数" width="70" align="center" />
        <ElTableColumn prop="view_count" label="观看" width="56" align="center" />
        <ElTableColumn prop="buy_count" label="购买" width="56" align="center" />
        <ElTableColumn label="连载" width="60" align="center">
          <template #default="{ row }">
            {{ row.update_status === 2 ? "完结" : "连载中" }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="rank" label="权重" width="52" align="center" />
        <ElTableColumn label="操作" width="270" fixed="right">
          <template #default="{ row }">
            <div class="drama-ops">
              <ElButton link type="primary" @click="openEpisodes(row)">剧集</ElButton>
              <ElButton
                link
                type="primary"
                :loading="syncingId === row.id"
                @click="handleSync(row)"
              >
                同步剧集
              </ElButton>
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
            </div>
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

    <!-- 短剧表单 -->
    <ElDialog v-model="dialog" title="编辑短剧" width="620px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="标题" prop="title">
          <ElInput v-model="form.title" />
        </ElFormItem>
        <ElFormItem label="封面">
          <ElInput v-model="form.cover" placeholder="不改则沿用当前封面" />
        </ElFormItem>
        <ElFormItem label="简介">
          <ElInput v-model="form.intro" type="textarea" :rows="3" />
        </ElFormItem>
        <ElFormItem label="分类">
          <ElSelect
            v-model="form.categories"
            class="drama-multi-select"
            placeholder="可多选，上架前至少选一个"
            multiple
            clearable
            filterable
            tag-type="primary"
          >
            <ElOption v-for="c in workCategories" :key="c.id" :label="c.name" :value="c.name" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="标签">
          <ElSelect
            v-model="form.tags"
            class="drama-multi-select"
            placeholder="从短剧标签库多选"
            multiple
            clearable
            filterable
            allow-create
            default-first-option
            tag-type="primary"
          >
            <ElOption
              v-for="t in enabledDramaTags"
              :key="t.id"
              :label="t.name"
              :value="t.name"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="默认付费">
          <ElSelect v-model="form.is_vip" style="width: 160px">
            <ElOption label="金币付费/免费" :value="0" />
            <ElOption label="VIP 专享" :value="1" />
          </ElSelect>
          <span class="ml-2 text-xs text-gray-400">VIP 专享与金币价互斥</span>
        </ElFormItem>
        <ElFormItem label="默认金币价">
          <ElInputNumber
            v-model="form.price"
            :min="0"
            :precision="2"
            :disabled="form.is_vip === 1"
          />
          <span class="ml-2 text-xs text-gray-400">0 = 免费, 单集金币价为 0 时用此价</span>
        </ElFormItem>
        <ElFormItem label="免费集数">
          <ElInputNumber v-model="form.free_episode" :min="0" />
          <span class="ml-2 text-xs text-gray-400">跟随整部的集, 集号 ≤ N 免费</span>
        </ElFormItem>
        <ElFormItem label="连载状态">
          <ElSelect v-model="form.update_status" style="width: 160px">
            <ElOption label="连载中" :value="1" />
            <ElOption label="已完结" :value="2" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="推荐">
          <ElSwitch v-model="form.is_recommend" :active-value="1" :inactive-value="0" />
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
          <span class="ml-2 text-xs text-gray-400">上架需有分类且至少一集可播</span>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 剧集管理 -->
    <ElDialog
      v-model="episodeDialog"
      :title="`剧集管理 - ${current?.title ?? ''}`"
      width="920px"
    >
      <div class="mb-3 flex items-center">
        <span class="text-sm text-gray-500">
          剧集来自媒资库，只能改付费方式和上下架；媒资侧已移除的集标记为「媒资缺失」，前台不展示。
        </span>
        <div class="flex-1"></div>
        <ElButton
          v-if="current"
          type="primary"
          size="small"
          :loading="syncingId === current.id"
          @click="handleSync(current)"
        >
          同步剧集
        </ElButton>
      </div>
      <ElTable v-loading="episodeLoading" :data="episodes" border stripe max-height="460">
        <ElTableColumn prop="seq" label="集号" width="64" align="center" />
        <ElTableColumn label="封面" width="70" align="center">
          <template #default="{ row }">
            <ElImage
              v-if="row.cover"
              :src="adminMediaUrl(row.cover)"
              fit="cover"
              style="width: 36px; height: 50px"
              preview-teleported
              :preview-src-list="[adminMediaUrl(row.cover)]"
            />
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="title" label="标题" min-width="120" show-overflow-tooltip />
        <ElTableColumn label="时长" width="70" align="center">
          <template #default="{ row }">{{ fmtDuration(row.duration) }}</template>
        </ElTableColumn>
        <ElTableColumn label="付费方式" width="90" align="center">
          <template #default="{ row }">{{ payModeMap[row.pay_mode] ?? row.pay_mode }}</template>
        </ElTableColumn>
        <ElTableColumn label="单集价" width="76" align="center">
          <template #default="{ row }">
            {{ row.pay_mode === 2 && row.price > 0 ? row.price : "-" }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="实际生效" width="90" align="center">
          <template #default="{ row }">{{ effectivePay(row) }}</template>
        </ElTableColumn>
        <ElTableColumn label="媒资" width="84" align="center">
          <template #default="{ row }">
            <ElTag :type="row.media_ready === 1 ? 'success' : 'danger'" size="small">
              {{ row.media_ready === 1 ? "就绪" : "媒资缺失" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="70" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? "上架" : "下架" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="70" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openEpEdit(row)">编辑</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="mt-3 flex justify-end">
        <ElPagination
          v-model:current-page="episodePage.current"
          :page-size="episodePage.size"
          :total="episodePage.total"
          layout="total, prev, pager, next"
          @current-change="loadEpisodes"
        />
      </div>
    </ElDialog>

    <!-- 剧集表单 -->
    <ElDialog v-model="epDialog" :title="`编辑第 ${epForm.seq} 集`" width="460px">
      <ElForm :model="epForm" label-width="90px">
        <ElFormItem label="付费方式">
          <ElSelect v-model="epForm.pay_mode" style="width: 160px">
            <ElOption v-for="o in payModeOpts" :key="o.value" :label="o.label" :value="o.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="单集价">
          <ElInputNumber
            v-model="epForm.price"
            :min="0"
            :precision="2"
            :disabled="epForm.pay_mode !== 2"
          />
          <span class="ml-2 text-xs text-gray-400">仅金币集可填, 0 = 用整部价</span>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="epForm.status" style="width: 140px">
            <ElOption label="上架" :value="1" />
            <ElOption label="下架" :value="0" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="epDialog = false">取消</ElButton>
        <ElButton type="primary" :loading="epSaving" @click="saveEpisode">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 媒资选用 -->
    <ElDialog v-model="assetDialog" title="从媒资库选用短剧" width="860px" destroy-on-close>
      <p class="mb-3 text-xs text-gray-500">
        只列出至少一集转码完成的短剧。选用后进入「待上架」并同步剧集，请在本站编辑分类后再上架。
      </p>
      <div class="mb-3 flex items-center gap-2">
        <ElInput
          v-model="assetSearch.keyword"
          clearable
          class="w-64"
          placeholder="搜索短剧标题"
          @keyup.enter="searchAssets"
        />
        <ElButton type="primary" @click="searchAssets">查询</ElButton>
      </div>
      <ElTable v-loading="assetLoading" :data="assets" border stripe>
        <ElTableColumn label="封面" width="80">
          <template #default="{ row }">
            <ElImage
              v-if="row.cover_url"
              :src="adminMediaUrl(row.cover_url)"
              fit="cover"
              class="h-14 w-10 rounded"
              preview-teleported
              :preview-src-list="[adminMediaUrl(row.cover_url)]"
            />
            <span v-else class="text-xs text-gray-400">无</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <ElTableColumn label="集数" width="110" align="center">
          <template #default="{ row }">
            {{ row.episode_count || 0 }} / {{ row.chapter_count || 0 }} 集
          </template>
        </ElTableColumn>
        <ElTableColumn label="连载" width="70" align="center">
          <template #default="{ row }">
            {{ row.update_status === 2 ? "完结" : "连载中" }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="row.local_id ? 'success' : 'info'" size="small">
              {{ row.local_id ? "已选用" : "未选用" }}
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
              {{ row.local_id ? "重新选用" : "选用" }}
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
.drama-table :deep(.el-table__cell) {
  padding: 4px 6px;
}
.drama-chip {
  margin: 0 2px 2px 0;
}
.drama-ops {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  white-space: nowrap;
}
.drama-multi-select {
  width: 100%;
}
.drama-multi-select :deep(.el-select__selection) {
  flex-wrap: wrap;
}
</style>
