<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

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
  ElProgress,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
  ElUpload,
} from "element-plus";

import { uploadMediaApi } from "#/api/core/media";
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
import { uploadVideoMultipart } from "#/utils/multipart-upload";

defineOptions({ name: "VideoManage" });

const loading = ref(false);
const list = ref<VideoApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ keyword: "", media_code: "", status: 9 });
const syncing = ref(false);

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
  duration: 0,
  sort: 0,
  status: 0,
});

const coverUploading = ref(false);
const videoUploading = ref(false);
const videoPercent = ref(0);
const videoFileName = ref("");

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
    duration: 0,
    sort: 0,
    status: 0,
  });
  videoPercent.value = 0;
  videoFileName.value = "";
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
    duration: row.duration,
    sort: row.sort,
    status: row.status,
  });
  videoFileName.value = row.source_key ? row.source_key.split("/").pop() || "" : "";
  videoPercent.value = row.source_url ? 100 : 0;
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

async function onVideoChange(file: any) {
  const raw: File | undefined = file?.raw;
  if (!raw) return false;
  videoUploading.value = true;
  videoPercent.value = 0;
  videoFileName.value = raw.name;
  try {
    // 浏览器读时长(可选)
    try {
      const url = URL.createObjectURL(raw);
      const duration = await new Promise<number>((resolve) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => {
          resolve(Math.round(v.duration || 0));
          URL.revokeObjectURL(url);
        };
        v.onerror = () => {
          resolve(0);
          URL.revokeObjectURL(url);
        };
        v.src = url;
      });
      if (duration > 0) form.duration = duration;
    } catch {
      // ignore
    }

    const res = await uploadVideoMultipart(raw, {
      onProgress: (p) => {
        videoPercent.value = p.percent;
      },
    });
    form.source_url = res.url;
    form.source_key = res.object_key;
    form.source_media_id = res.id;
    videoPercent.value = 100;
    ElMessage.success("视频上传成功");
  } catch (e: any) {
    ElMessage.error(e?.message || "视频上传失败");
  } finally {
    videoUploading.value = false;
  }
  return false;
}

async function save() {
  if (!form.title.trim()) {
    ElMessage.warning("请填写标题");
    return;
  }
  if (!form.source_url) {
    ElMessage.warning("请先上传视频");
    return;
  }
  saving.value = true;
  try {
    const payload = { ...form };
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
  await ElMessageBox.confirm(`删除视频「${row.title}」？`, "提示", {
    type: "warning",
  });
  await deleteVideoApi(row.id);
  ElMessage.success("已删除");
  loadList();
}

async function toggleStatus(row: VideoApi.Item, status: number) {
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
    const res = await syncMediaVideosApi();
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
    await pickMediaAssetApi(row.id);
    ElMessage.success(`已选用「${row.title || row.id}」`);
    await loadAssets();
    await loadList();
  } catch (e: any) {
    ElMessage.error(e?.message || "选用失败");
  } finally {
    pickingId.value = "";
  }
}

onMounted(loadList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <ElInput
          v-model="search.keyword"
          clearable
          class="w-56"
          placeholder="搜索标题"
          @keyup.enter="loadList"
        />
        <ElInput
          v-model="search.media_code"
          clearable
          class="w-56"
          placeholder="媒资ID"
          @keyup.enter="loadList"
        />
        <ElSelect v-model="search.status" class="w-32" @change="loadList">
          <ElOption
            v-for="o in statusOpts"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </ElSelect>
        <ElButton type="primary" @click="loadList">查询</ElButton>
        <ElButton type="primary" @click="openCreate">新增视频</ElButton>
        <ElButton type="primary" :loading="syncing" @click="syncMedia">媒资同步</ElButton>
        <ElButton @click="openAssetDialog">从媒资中心选用</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="70" />
        <ElTableColumn label="封面" width="90">
          <template #default="{ row }">
            <ElImage
              v-if="row.cover_url"
              :src="row.cover_url"
              fit="cover"
              class="h-14 w-14 rounded"
              preview-teleported
              :preview-src-list="[row.cover_url]"
            />
            <span v-else class="text-muted-foreground text-xs">无</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="title" label="标题" min-width="160" />
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
      title="视频详情"
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
            :poster="detail.cover_url || undefined"
            :src="detail.source_url"
          >
            您的浏览器不支持视频播放
          </video>
          <div
            v-else
            class="text-muted-foreground flex h-48 items-center justify-center text-sm"
          >
            暂无视频资源
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
              :src="detail.cover_url"
              fit="cover"
              class="h-20 w-20 rounded"
              preview-teleported
              :preview-src-list="[detail.cover_url]"
            />
            <span v-else>-</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="视频地址" :span="2">
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
      :title="editing ? '编辑视频' : '新增视频'"
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
              :src="form.cover_url"
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
        <ElFormItem label="视频" required>
          <div class="w-full">
            <ElUpload
              :show-file-list="false"
              accept="video/*"
              :disabled="videoUploading"
              :before-upload="() => false"
              :on-change="onVideoChange"
            >
              <ElButton type="primary" :loading="videoUploading">
                {{ form.source_url ? "重新上传视频" : "分片上传视频" }}
              </ElButton>
            </ElUpload>
            <div v-if="videoFileName" class="text-muted-foreground mt-2 text-xs">
              {{ videoFileName }}
            </div>
            <ElProgress
              v-if="videoUploading || videoPercent > 0"
              class="mt-2"
              :percentage="videoPercent"
              :status="videoPercent >= 100 ? 'success' : undefined"
            />
            <div v-if="form.source_url" class="mt-2">
              <a
                :href="form.source_url"
                target="_blank"
                class="text-primary text-xs break-all"
              >
                {{ form.source_url }}
              </a>
            </div>
          </div>
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
              :src="row.cover_url"
              fit="cover"
              class="h-14 w-14 rounded"
              preview-teleported
              :preview-src-list="[row.cover_url]"
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
