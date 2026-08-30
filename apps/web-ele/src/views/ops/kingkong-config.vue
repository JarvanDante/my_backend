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
  ElUpload,
} from "element-plus";

import {
  createKingkongApi,
  deleteKingkongApi,
  getKingkongListApi,
  type KingkongApi,
  updateKingkongApi,
} from "#/api/core/kingkong";
import { uploadMediaApi } from "#/api/core/media";
import { adminMediaUrl } from "#/utils/media";

defineOptions({ name: "OpsKingkongConfig" });

const CUSTOM_LINK = "__custom__";

const posOpts = [
  { label: "漫画", value: "comics" },
  { label: "动漫", value: "cartoon" },
  { label: "视频", value: "movie" },
  { label: "小说", value: "novel" },
  { label: "短剧", value: "short" },
];
const posMap: Record<string, string> = Object.fromEntries(
  posOpts.map((o) => [o.value, o.label]),
);
const modeOpts = [
  { label: "block | 模块", value: "block" },
  { label: "list | 列表", value: "list" },
  { label: "douyin | 抖音流", value: "douyin" },
];
const jumpOpts = [
  { label: "不跳转（使用关联模块）", value: "" },
  { label: "activityLand | 活动专区", value: "activityLand" },
  { label: "selected | 精选", value: "selected" },
  { label: "day | 每日", value: "day" },
  { label: "checkin | 签到", value: "checkin" },
  { label: "invite | 邀请", value: "invite" },
  { label: "collect | 收藏", value: "collect" },
  { label: "submission | 投稿", value: "submission" },
  { label: "aiExperience | AI体验馆", value: "aiExperience" },
  { label: "huangyou | 黄油", value: "huangyou" },
  { label: "douyin | 抖音", value: "douyin" },
  { label: "vipUpgrade | 补差价升级", value: "vipUpgrade" },
  { label: "memberCenter | 会员中心", value: "memberCenter" },
  { label: "自定义地址", value: CUSTOM_LINK },
];
const presetCodes = new Set(
  jumpOpts.filter((o) => o.value && o.value !== CUSTOM_LINK).map((o) => o.value),
);

const loading = ref(false);
const list = ref<KingkongApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ name: "", position: "", status: "" });
const statusOpts = [
  { label: "全部", value: "" },
  { label: "正常", value: "1" },
  { label: "禁用", value: "0" },
];

async function fetchList() {
  loading.value = true;
  try {
    const res = await getKingkongListApi({
      name: search.name.trim() || undefined,
      position: search.position || undefined,
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
  search.status = "";
  doSearch();
}

const dialog = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const imgUploading = ref(false);
const formRef = ref();
const emptyForm = () => ({
  id: 0,
  name: "",
  icon_url: "",
  open_mode: "block",
  jump_type: "",
  custom_link: "",
  app_link: "",
  position: "",
  sort: 0,
  status: 1,
});
const form = reactive(emptyForm());
const showCustomLink = computed(() => form.jump_type === CUSTOM_LINK);
const showAppLink = computed(() => form.jump_type !== "");
const rules = {
  icon_url: [{ required: true, message: "请上传图标", trigger: "change" }],
  name: [{ required: true, message: "请输入名称", trigger: "blur" }],
  open_mode: [{ required: true, message: "请选择打开方式", trigger: "change" }],
  position: [{ required: true, message: "请选择展示位置", trigger: "change" }],
};

function jumpTypeOf(link: string) {
  const v = (link || "").trim();
  if (!v) return "";
  if (presetCodes.has(v)) return v;
  return CUSTOM_LINK;
}

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  dialog.value = true;
}
function openEdit(row: KingkongApi.Item) {
  isEdit.value = true;
  const jump = jumpTypeOf(row.link);
  Object.assign(form, {
    id: row.id,
    name: row.name,
    icon_url: row.icon_url,
    open_mode: row.open_mode || "block",
    jump_type: jump,
    custom_link: jump === CUSTOM_LINK ? row.link : "",
    app_link: row.app_link || "",
    position: row.position,
    sort: row.sort || 0,
    status: row.status,
  });
  dialog.value = true;
}

function resolveLink() {
  if (!form.jump_type) return "";
  if (form.jump_type === CUSTOM_LINK) return form.custom_link.trim();
  return form.jump_type;
}

async function handleSave() {
  await formRef.value?.validate();
  const body: KingkongApi.SaveBody = {
    name: form.name.trim(),
    icon_url: form.icon_url,
    open_mode: form.open_mode,
    link: resolveLink(),
    app_link: form.app_link.trim(),
    position: form.position,
    sort: Number(form.sort) || 0,
    status: form.status,
  };
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateKingkongApi(form.id, body);
      ElMessage.success("已保存");
    } else {
      await createKingkongApi(body);
      ElMessage.success("已新增");
    }
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: KingkongApi.Item) {
  await ElMessageBox.confirm(`确认删除「${row.name}」?`, "提示", {
    type: "warning",
  });
  await deleteKingkongApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

async function onImgChange(file: any) {
  const raw: File | undefined = file?.raw;
  if (!raw) return false;
  imgUploading.value = true;
  try {
    const res = await uploadMediaApi(raw, "cover");
    form.icon_url = res.url;
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
        <ElInput
          v-model="search.name"
          placeholder="名称"
          clearable
          style="width: 180px"
          @keyup.enter="doSearch"
        />
        <ElSelect
          v-model="search.position"
          placeholder="展示位置"
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
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
        <span class="text-xs text-gray-400">单字段输入查询，或者组合查询</span>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">新增</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="70" />
        <ElTableColumn prop="name" label="名称" min-width="120" show-overflow-tooltip />
        <ElTableColumn prop="sort" label="推荐" width="80" align="center" />
        <ElTableColumn label="展示位置" width="90" align="center">
          <template #default="{ row }">
            {{ row.position_name || posMap[row.position] || row.position }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="打开方式" width="110" align="center">
          <template #default="{ row }">
            {{ row.open_mode }} | {{ row.open_mode_name }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="图标" width="80" align="center">
          <template #default="{ row }">
            <ElImage
              v-if="row.icon_url"
              :src="adminMediaUrl(row.icon_url)"
              fit="contain"
              style="width: 40px; height: 40px"
              preview-teleported
              :preview-src-list="[adminMediaUrl(row.icon_url)]"
            />
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="80" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status_text || (row.status === 1 ? "正常" : "禁用") }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="link_label" label="跳转" min-width="180" show-overflow-tooltip />
        <ElTableColumn prop="created_at" label="创建时间" width="170" />
        <ElTableColumn prop="updated_at" label="更新时间" width="170" />
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

    <ElDialog v-model="dialog" title="信息" width="520px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="图标" prop="icon_url">
          <ElUpload
            class="icon-uploader"
            :show-file-list="false"
            accept="image/*"
            :disabled="imgUploading"
            :before-upload="() => false"
            :on-change="onImgChange"
          >
            <img
              v-if="form.icon_url"
              :src="adminMediaUrl(form.icon_url)"
              class="icon-preview"
            />
            <div v-else class="icon-plus">+</div>
          </ElUpload>
        </ElFormItem>
        <ElFormItem label="名称" prop="name">
          <ElInput v-model="form.name" placeholder="请输入" maxlength="32" />
        </ElFormItem>
        <ElFormItem label="排序" required>
          <ElInputNumber v-model="form.sort" :min="0" class="w-full" />
        </ElFormItem>
        <ElFormItem label="是否开启" required>
          <ElSwitch
            v-model="form.status"
            :active-value="1"
            :inactive-value="0"
            active-text="开启"
          />
        </ElFormItem>
        <ElFormItem label="打开方式" prop="open_mode">
          <ElSelect v-model="form.open_mode" class="w-full">
            <ElOption
              v-for="o in modeOpts"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="跳转类型">
          <ElSelect v-model="form.jump_type" class="w-full" clearable>
            <ElOption
              v-for="o in jumpOpts"
              :key="o.value || 'none'"
              :label="o.label"
              :value="o.value"
            />
          </ElSelect>
          <p class="mt-1 text-xs text-gray-400">
            预设供 H5 路由；自定义地址写入 link；不跳转时走模块配置
          </p>
        </ElFormItem>
        <ElFormItem v-if="showCustomLink" label="H5 链接">
          <ElInput
            v-model="form.custom_link"
            placeholder="如 /list?media=comic&type=topic 或 https://..."
          />
        </ElFormItem>
        <ElFormItem v-if="showAppLink" label="App 链接">
          <ElInput
            v-model="form.app_link"
            placeholder="App 跳转地址，如 https://... 或协议地址"
          />
          <p class="mt-1 text-xs text-gray-400">
            Native App 优先使用本地地址；为空则按跳转类型预设映射
          </p>
        </ElFormItem>
        <ElFormItem label="展示位置" prop="position">
          <ElSelect v-model="form.position" placeholder="请选择.." class="w-full">
            <ElOption
              v-for="o in posOpts"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton type="primary" :loading="saving" @click="handleSave">确定</ElButton>
        <ElButton @click="dialog = false">取消</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.icon-uploader :deep(.el-upload) {
  width: 88px;
  height: 88px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}
.icon-preview {
  width: 88px;
  height: 88px;
  object-fit: contain;
  display: block;
}
.icon-plus {
  width: 88px;
  height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #c0c4cc;
}
</style>
