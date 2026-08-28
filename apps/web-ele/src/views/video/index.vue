<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from "vue";

import {
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
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
  ElUpload,
} from "element-plus";

import { getUserDetailApi } from "#/api/core/bkuser";
import { uploadMediaApi } from "#/api/core/media";
import { adminMediaUrl } from "#/utils/media";
import { getTagListApi, type TagApi } from "#/api/core/tag";
import {
  createVideoApi,
  deleteVideoApi,
  getMediaAssetListApi,
  getVideoListApi,
  pickMediaAssetApi,
  setVideoStatusApi,
  syncMediaVideosApi,
  updateVideoApi,
  type MediaAssetApi,
  type VideoApi,
} from "#/api/core/video";
import {
  getCartoonCategoryListApi,
} from "#/api/core/cartoon-category";
import {
  getDouyinCategoryListApi,
} from "#/api/core/douyin-category";
import {
  getVideoCategoryListApi,
  type VideoCategoryApi,
} from "#/api/core/video-category";

defineOptions({ name: "VideoManage" });

const props = withDefaults(
  defineProps<{ mode?: "video" | "cartoon" | "douyin" }>(),
  { mode: "video" },
);
const isCartoon = computed(() => props.mode === "cartoon");
const isDouyin = computed(() => props.mode === "douyin");
const mediaKind = computed(() => {
  if (isCartoon.value) return 2;
  if (isDouyin.value) return 3;
  return 0;
});
const tagType = computed(() => {
  if (isCartoon.value) return 3;
  if (isDouyin.value) return 2;
  return 1;
});
const noun = computed(() => {
  if (isCartoon.value) return "动漫";
  if (isDouyin.value) return "抖音";
  return "视频";
});
const mediaCenterLabel = computed(() => {
  if (isCartoon.value) return "动漫管理";
  if (isDouyin.value) return "抖音管理";
  return "视频管理";
});

const loading = ref(false);
const list = ref<VideoApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ keyword: "", media_code: "", status: 9 });
const syncing = ref(false);
const categories = ref<VideoCategoryApi.Item[]>([]);
const workCategories = computed(() =>
  categories.value.filter((c) => c.kind === 0 && c.status === 1),
);
const videoTags = ref<TagApi.Item[]>([]);
const enabledVideoTags = computed(() => videoTags.value.filter((t) => t.status === 1));

async function loadCategories() {
  const api = isCartoon.value
    ? getCartoonCategoryListApi
    : isDouyin.value
      ? getDouyinCategoryListApi
      : getVideoCategoryListApi;
  const res = await api({ status: "1", page: 1, size: 100 });
  categories.value = res.list || [];
}
async function loadVideoTags() {
  const res = await getTagListApi({ content_type: tagType.value, page: 1, size: 200 });
  videoTags.value = res.list || [];
}

const upHint = ref("");
const upOk = ref(false);
const upChecking = ref(false);

function resetUpHint() {
  upHint.value = "";
  upOk.value = false;
}

async function lookupUpUser() {
  const id = Number(form.up_user_id) || 0;
  if (id <= 0) {
    resetUpHint();
    return false;
  }
  upChecking.value = true;
  try {
    const u = await getUserDetailApi(id);
    if (u.is_disabled === 1) {
      upHint.value = `${u.nickname || "该用户"} 已被禁用`;
      upOk.value = false;
      return false;
    }
    if (u.is_up !== 1) {
      upHint.value = `${u.nickname || "该用户"} 不是UP主`;
      upOk.value = false;
      return false;
    }
    upHint.value = `已确认UP主：${u.nickname || `#${u.id}`}`;
    upOk.value = true;
    return true;
  } catch {
    upHint.value = "用户不存在";
    upOk.value = false;
    return false;
  } finally {
    upChecking.value = false;
  }
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

const statusOpts = [
  { label: "全部", value: 9 },
  { label: "草稿", value: 0 },
  { label: "上架", value: 1 },
  { label: "下架", value: 2 },
];
const statusTag: Record<number, { t: string; type: "info" | "success" | "warning" }> = {
  0: { t: "草稿", type: "info" },
  1: { t: "上架", type: "success" },
  2: { t: "下架", type: "warning" },
};

async function loadList() {
  loading.value = true;
  try {
    const res = await getVideoListApi({
      keyword: search.keyword || undefined,
      media_code: search.media_code || undefined,
      kind: mediaKind.value,
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
  loadList();
}
function resetSearch() {
  search.keyword = "";
  search.media_code = "";
  search.status = 9;
  doSearch();
}

const dialog = ref(false);
const editing = ref(false);
const saving = ref(false);
const form = reactive({
  id: 0,
  title: "",
  description: "",
  cover_url: "",
  cover_key: "",
  cover_media_id: 0,
  source_url: "",
  source_key: "",
  source_media_id: 0,
  media_code: "",
  categories: [] as string[],
  tags: [] as string[],
  duration: 0,
  sort: 0,
  status: 0,
  up_user_id: undefined as number | undefined,
});

watch(
  () => form.up_user_id,
  () => {
    if (!isDouyin.value) return;
    void lookupUpUser();
  },
);

const coverUploading = ref(false);

function resetForm() {
  Object.assign(form, {
    id: 0,
    title: "",
    description: "",
    cover_url: "",
    cover_key: "",
    cover_media_id: 0,
    source_url: "",
    source_key: "",
    source_media_id: 0,
    media_code: "",
    categories: [] as string[],
    tags: [] as string[],
    duration: 0,
    sort: 0,
    status: 0,
    up_user_id: undefined,
  });
}

const detailVisible = ref(false);
const detail = ref<VideoApi.Item | null>(null);

function openDetail(row: VideoApi.Item) {
  detail.value = row;
  detailVisible.value = true;
}

function openEditFromDetail() {
  const row = detail.value;
  detailVisible.value = false;
  if (row) openEdit(row);
}

function openCreate() {
  editing.value = false;
  resetForm();
  resetUpHint();
  dialog.value = true;
}

function openEdit(row: VideoApi.Item) {
  editing.value = true;
  Object.assign(form, {
    id: row.id,
    title: row.title,
    description: row.description,
    cover_url: row.cover_url,
    cover_key: row.cover_key,
    cover_media_id: row.cover_media_id,
    source_url: row.source_url,
    source_key: row.source_key,
    source_media_id: row.source_media_id,
    media_code: row.media_code,
    categories: splitCategories(row),
    tags: row.tags || [],
    duration: row.duration,
    sort: row.sort,
    status: row.status,
    up_user_id: row.up_user_id || undefined,
  });
  if (isDouyin.value && row.up_user_id) {
    upHint.value = row.up_nickname || `用户 #${row.up_user_id}`;
    upOk.value = true;
    void lookupUpUser();
  } else {
    resetUpHint();
  }
  dialog.value = true;
}

async function onCoverChange(file: any) {
  const raw: File | undefined = file?.raw;
  if (!raw) return false;
  coverUploading.value = true;
  try {
    const res = await uploadMediaApi(raw, "cover");
    form.cover_url = res.url;
    form.cover_key = res.object_key;
    form.cover_media_id = res.id;
    ElMessage.success("封面上传成功");
  } finally {
    coverUploading.value = false;
  }
  return false;
}

async function save() {
  if (!form.title.trim()) {
    ElMessage.warning("请填写标题");
    return;
  }
  if (!form.source_url && !form.media_code) {
    ElMessage.warning(`请从媒资中心选用${noun.value}`);
    return;
  }
  if (form.status === 1 && !form.categories.length) {
    ElMessage.warning("上架前请选择本站分类");
    return;
  }
  if (isDouyin.value) {
    if (form.up_user_id) {
      if (!(await lookupUpUser())) {
        ElMessage.warning(upHint.value || "UP主ID无效");
        return;
      }
    } else if (form.status === 1) {
      ElMessage.warning("抖音上架必须填写UP主ID");
      return;
    }
  }
  saving.value = true;
  try {
    const payload = {
      ...form,
      kind: mediaKind.value,
      category: form.categories.join(","),
      categories: form.categories,
      tags: form.tags || [],
    };
    if (editing.value) await updateVideoApi(payload);
    else await createVideoApi(payload);
    ElMessage.success("保存成功");
    dialog.value = false;
    loadList();
  } finally {
    saving.value = false;
  }
}

async function remove(row: VideoApi.Item) {
  await ElMessageBox.confirm(`删除${noun.value}「${row.title}」？`, "提示", {
    type: "warning",
  });
  await deleteVideoApi(row.id);
  ElMessage.success("已删除");
  loadList();
}

async function toggleStatus(row: VideoApi.Item, status: number) {
  if (status === 1 && !splitCategories(row).length) {
    ElMessage.warning("请先编辑并选择本站分类后再上架");
    openEdit(row);
    return;
  }
  if (isDouyin.value && status === 1 && !row.up_user_id) {
    ElMessage.warning("请先编辑并绑定UP主后再上架");
    openEdit(row);
    return;
  }
  await setVideoStatusApi(row.id, status);
  ElMessage.success("已更新状态");
  loadList();
}

function formatDuration(sec: number) {
  if (!sec || sec <= 0) return "-";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function syncMedia() {
  syncing.value = true;
  try {
    const res = await syncMediaVideosApi(mediaKind.value);
    ElMessage.success(`同步完成：新增 ${res.created}，更新 ${res.updated}，媒资 ${res.total}`);
    page.current = 1;
    await loadList();
  } catch (e: any) {
    ElMessage.error(e?.message || "媒资同步失败");
  } finally {
    syncing.value = false;
  }
}

const assetDialog = ref(false);
const assetLoading = ref(false);
const assets = ref<MediaAssetApi.Item[]>([]);
const assetSearch = reactive({ keyword: "" });
const assetPage = reactive({ current: 1, size: 10, total: 0 });
const pickingId = ref("");

async function loadAssets() {
  assetLoading.value = true;
  try {
    const res = await getMediaAssetListApi({
      keyword: assetSearch.keyword || undefined,
      kind: mediaKind.value,
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
  loadAssets();
}

async function pickAsset(row: MediaAssetApi.Item) {
  pickingId.value = row.id;
  try {
    await pickMediaAssetApi(row.id, mediaKind.value);
    ElMessage.success(`已选用「${row.title || row.id}」，请编辑分类后再上架`);
    await loadAssets();
    await loadList();
  } catch (e: any) {
    ElMessage.error(e?.message || "选用失败");
  } finally {
    pickingId.value = "";
  }
}

onMounted(() => {
  loadCategories().catch(() => undefined);
  loadVideoTags().catch(() => undefined);
  loadList();
});
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <ElInput
          v-model="search.keyword"
          clearable
          placeholder="搜索标题"
          style="width: 180px"
          @keyup.enter="doSearch"
        />
        <ElInput
          v-model="search.media_code"
          clearable
          placeholder="媒资ID"
          style="width: 180px"
          @keyup.enter="doSearch"
        />
        <ElSelect v-model="search.status" style="width: 120px" @change="doSearch">
          <ElOption
            v-for="o in statusOpts"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </ElSelect>
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">新增{{ noun }}</ElButton>
        <ElButton type="primary" :loading="syncing" @click="syncMedia">媒资同步</ElButton>
        <ElButton @click="openAssetDialog">从媒资中心选用</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="70" />
        <ElTableColumn label="封面" width="90">
          <template #default="{ row }">
            <ElImage
              v-if="row.cover_url"
              :src="adminMediaUrl(row.cover_url)"
              fit="cover"
              class="h-14 w-14 rounded"
              preview-teleported
              :preview-src-list="[adminMediaUrl(row.cover_url)]"
            />
            <span v-else class="text-muted-foreground text-xs">无</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="title" label="标题" min-width="160" />
        <ElTableColumn v-if="isDouyin" label="up主" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.up_user_id">{{ row.up_nickname || `#${row.up_user_id}` }}</span>
            <span v-else class="text-orange-500">未绑定</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="分类" width="80">
          <template #default="{ row }">
            <template v-if="splitCategories(row).length">
              <ElTag
                v-for="name in splitCategories(row)"
                :key="name"
                size="small"
                class="video-chip"
              >
                {{ name }}
              </ElTag>
            </template>
            <span v-else class="text-orange-500">未分类</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="标签" width="80">
          <template #default="{ row }">
            <template v-if="row.tags?.length">
              <ElTag
                v-for="name in row.tags"
                :key="name"
                type="primary"
                size="small"
                class="video-chip"
              >
                {{ name }}
              </ElTag>
            </template>
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="media_code" label="媒资ID" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.media_code || "-" }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="时长" width="80" align="center">
          <template #default="{ row }">
            {{ formatDuration(row.duration) }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="sort" label="排序" width="70" align="center" />
        <ElTableColumn label="状态" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="statusTag[row.status]?.type || 'info'" size="small">
              {{ statusTag[row.status]?.t || row.status }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="created_at" label="创建时间" min-width="160" />
        <ElTableColumn label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openDetail(row)">详情</ElButton>
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton
              v-if="row.status !== 1"
              link
              type="success"
              @click="toggleStatus(row, 1)"
            >
              上架
            </ElButton>
            <ElButton
              v-if="row.status === 1"
              link
              type="warning"
              @click="toggleStatus(row, 2)"
            >
              下架
            </ElButton>
            <ElButton link type="danger" @click="remove(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-4 flex justify-end">
        <ElPagination
          v-model:current-page="page.current"
          v-model:page-size="page.size"
          :total="page.total"
          layout="total, prev, pager, next, sizes"
          :page-sizes="[10, 20, 50]"
          @current-change="loadList"
          @size-change="loadList"
        />
      </div>
    </ElCard>

    <ElDialog
      v-model="detailVisible"
      :title="`${noun}详情`"
      width="720px"
      destroy-on-close
      @closed="detail = null"
    >
      <div v-if="detail">
        <div class="mb-4 overflow-hidden rounded bg-black">
          <video
            v-if="detail.source_url"
            :key="detail.id"
            class="max-h-[420px] w-full"
            controls
            preload="metadata"
            playsinline
            :poster="adminMediaUrl(detail.cover_url) || undefined"
            :src="detail.source_url"
          >
            您的浏览器不支持播放
          </video>
          <div
            v-else
            class="text-muted-foreground flex h-48 items-center justify-center text-sm"
          >
            暂无播放资源
          </div>
        </div>

        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="ID">{{ detail.id }}</ElDescriptionsItem>
          <ElDescriptionsItem label="状态">
            <ElTag
              :type="statusTag[detail.status]?.type || 'info'"
              size="small"
            >
              {{ statusTag[detail.status]?.t || detail.status }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="标题" :span="2">
            {{ detail.title }}
          </ElDescriptionsItem>
          <ElDescriptionsItem v-if="isDouyin" label="up主" :span="2">
            {{
              detail.up_user_id
                ? `${detail.up_nickname || "未填昵称"} (#${detail.up_user_id})`
                : "未绑定"
            }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="媒资ID" :span="2">
            {{ detail.media_code || "-" }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="简介" :span="2">
            {{ detail.description || "-" }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="时长">
            {{ formatDuration(detail.duration) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="排序">{{ detail.sort }}</ElDescriptionsItem>
          <ElDescriptionsItem label="创建时间">
            {{ detail.created_at || "-" }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="更新时间">
            {{ detail.updated_at || "-" }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="封面" :span="2">
            <ElImage
              v-if="detail.cover_url"
              :src="adminMediaUrl(detail.cover_url)"
              fit="cover"
              class="h-20 w-20 rounded"
              preview-teleported
              :preview-src-list="[adminMediaUrl(detail.cover_url)]"
            />
            <span v-else>-</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem :label="`${noun}地址`" :span="2">
            <a
              v-if="detail.source_url"
              :href="detail.source_url"
              target="_blank"
              class="text-primary text-xs break-all"
            >
              {{ detail.source_url }}
            </a>
            <span v-else>-</span>
          </ElDescriptionsItem>
        </ElDescriptions>
      </div>
      <template #footer>
        <ElButton @click="detailVisible = false">关闭</ElButton>
        <ElButton type="primary" @click="openEditFromDetail">编辑</ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="dialog"
      :title="editing ? `编辑${noun}` : `新增${noun}`"
      width="640px"
      destroy-on-close
    >
      <ElForm label-width="88px">
        <ElFormItem label="标题" required>
          <ElInput v-model="form.title" maxlength="128" show-word-limit />
        </ElFormItem>
        <ElFormItem label="简介">
          <ElInput
            v-model="form.description"
            type="textarea"
            :rows="3"
            maxlength="2000"
          />
        </ElFormItem>
        <ElFormItem label="封面">
          <div class="flex items-start gap-3">
            <ElImage
              v-if="form.cover_url"
              :src="adminMediaUrl(form.cover_url)"
              fit="cover"
              class="h-20 w-20 rounded border"
            />
            <ElUpload
              :show-file-list="false"
              accept="image/*"
              :disabled="coverUploading"
              :before-upload="() => false"
              :on-change="onCoverChange"
            >
              <ElButton :loading="coverUploading">
                {{ form.cover_url ? "更换封面" : "上传封面" }}
              </ElButton>
            </ElUpload>
          </div>
        </ElFormItem>
        <ElFormItem :label="noun">
          <div v-if="form.source_url || form.media_code" class="w-full">
            <div v-if="form.media_code" class="text-muted-foreground mb-1 text-xs">
              媒资ID：{{ form.media_code }}
            </div>
            <a
              v-if="form.source_url"
              :href="form.source_url"
              target="_blank"
              class="text-primary text-xs break-all"
            >
              {{ form.source_url }}
            </a>
          </div>
          <span v-else class="text-xs text-gray-400">
            请从媒资中心选用，子后台不支持直接上传
          </span>
        </ElFormItem>
        <ElFormItem label="分类">
          <ElSelect
            v-model="form.categories"
            class="video-multi-select"
            placeholder="可多选，上架前至少选一个"
            multiple
            clearable
            filterable
            tag-type="primary"
          >
            <ElOption
              v-for="c in workCategories"
              :key="c.id"
              :label="c.name"
              :value="c.name"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="isDouyin" label="up主ID" :required="form.status === 1">
          <div class="flex w-full items-center gap-2">
            <ElInputNumber
              v-model="form.up_user_id"
              :min="1"
              :controls="false"
              placeholder="填写用户ID"
              class="w-40"
              @change="lookupUpUser"
              @blur="lookupUpUser"
            />
            <span v-if="upChecking" class="text-muted-foreground text-xs">核对中…</span>
            <span v-else-if="upHint" :class="upOk ? 'text-xs text-emerald-600' : 'text-xs text-orange-500'">
              {{ upHint }}
            </span>
          </div>
        </ElFormItem>
        <ElFormItem label="标签">
          <ElSelect
            v-model="form.tags"
            class="video-multi-select"
            :placeholder="`从${noun}标签库多选`"
            multiple
            clearable
            filterable
            allow-create
            default-first-option
            tag-type="primary"
          >
            <ElOption
              v-for="t in enabledVideoTags"
              :key="t.id"
              :label="t.name"
              :value="t.name"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="时长(秒)">
          <ElInputNumber v-model="form.duration" :min="0" :max="86400" />
        </ElFormItem>
        <ElFormItem label="排序">
          <ElInputNumber v-model="form.sort" :min="0" :max="999999" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="form.status" class="w-40">
            <ElOption label="草稿" :value="0" />
            <ElOption label="上架" :value="1" />
            <ElOption label="下架" :value="2" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="save">保存</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="assetDialog" title="媒资中心" width="860px" destroy-on-close>
      <p class="mb-3 text-xs text-gray-400">
        总后台「{{ mediaCenterLabel }}」上传并转码。选用后进入草稿，请在本站编辑分类{{ isDouyin ? "并绑定UP主" : "" }}后再上架。
      </p>
      <div class="mb-3 flex items-center gap-2">
        <ElInput
          v-model="assetSearch.keyword"
          clearable
          class="w-64"
          placeholder="搜索媒资标题"
          @keyup.enter="loadAssets"
        />
        <ElButton type="primary" @click="loadAssets">查询</ElButton>
      </div>
      <ElTable v-loading="assetLoading" :data="assets" border stripe>
        <ElTableColumn label="封面" width="90">
          <template #default="{ row }">
            <ElImage
              v-if="row.cover_url"
              :src="adminMediaUrl(row.cover_url)"
              fit="cover"
              class="h-14 w-14 rounded"
              preview-teleported
              :preview-src-list="[adminMediaUrl(row.cover_url)]"
            />
            <span v-else class="text-muted-foreground text-xs">无</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="id" label="媒资ID" min-width="160" show-overflow-tooltip />
        <ElTableColumn prop="title" label="标题" min-width="160" />
        <ElTableColumn label="时长" width="80" align="center">
          <template #default="{ row }">
            {{ formatDuration(row.duration_sec) }}
          </template>
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
.video-chip {
  margin: 0 2px 2px 0;
}
.video-multi-select {
  width: 100%;
}
.video-multi-select :deep(.el-select__selection) {
  flex-wrap: wrap;
}
.video-multi-select :deep(.el-select__selected-item) {
  max-width: 100%;
}
.video-multi-select :deep(.el-tag) {
  --el-tag-bg-color: var(--el-color-primary);
  --el-tag-text-color: #fff;
  --el-tag-border-color: var(--el-color-primary);
  --el-tag-hover-color: var(--el-color-primary-light-3);
}
</style>
