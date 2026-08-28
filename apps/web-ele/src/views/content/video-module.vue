<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

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

import { getTagListApi, type TagApi } from "#/api/core/tag";
import {
  videoModuleApi,
  type MediaModuleApi,
} from "#/api/core/video-module";

defineOptions({ name: "ContentVideoModule" });

const TAG_TYPE = 1;
const DEFAULT_POS = "video_home";
const posOpts = [{ label: "视频首页", value: DEFAULT_POS }];
const styleOpts = [
  { label: "样式1 1大2小 横图", value: 1 },
  { label: "样式2 2小 横图", value: 2 },
  { label: "样式3 1大 横图", value: 3 },
  { label: "样式4 2竖图", value: 4 },
  { label: "样式5 竖图横滑", value: 5 },
  { label: "样式6 横图横滑", value: 6 },
  { label: "样式7 竖图3X3", value: 7 },
];
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
const posMap: Record<string, string> = Object.fromEntries(
  posOpts.map((o) => [o.value, o.label]),
);
const statusOpts = [
  { label: "全部状态", value: "" },
  { label: "显示", value: "1" },
  { label: "关闭", value: "0" },
];

const loading = ref(false);
const list = ref<MediaModuleApi.Item[]>([]);
const tags = ref<TagApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ name: "", position: "", status: "" });

async function fetchTags() {
  const res = await getTagListApi({
    content_type: TAG_TYPE,
    status: "1",
    page: 1,
    size: 200,
  });
  tags.value = res.list || [];
}

async function fetchList() {
  loading.value = true;
  try {
    const res = await videoModuleApi.list({
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
const formRef = ref();
const emptyForm = () => ({
  id: 0,
  name: "",
  position: DEFAULT_POS,
  style: 2,
  icon: 1,
  tag_ids: [] as number[],
  size: 6,
  rank: 0,
  status: 1,
});
const form = reactive(emptyForm());
const rules = {
  name: [{ required: true, message: "名称必填", trigger: "blur" }],
  position: [{ required: true, message: "请选择位置", trigger: "change" }],
  style: [{ required: true, message: "请选择样式", trigger: "change" }],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  dialog.value = true;
}
function openEdit(row: MediaModuleApi.Item) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    name: row.name,
    position: row.position || DEFAULT_POS,
    style: row.style || 2,
    icon: row.icon || 1,
    tag_ids: [...(row.tag_ids || [])],
    size: row.size || 6,
    rank: row.rank || 0,
    status: row.status,
  });
  dialog.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  const body = {
    name: form.name,
    position: form.position,
    style: Number(form.style) || 2,
    icon: Number(form.icon) || 1,
    tag_ids: form.tag_ids,
    size: Number(form.size) || 6,
    rank: Number(form.rank) || 0,
    status: form.status,
  };
  saving.value = true;
  try {
    if (isEdit.value) {
      await videoModuleApi.update(form.id, body);
      ElMessage.success("已保存");
    } else {
      await videoModuleApi.create(body);
      ElMessage.success("已新增");
    }
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: MediaModuleApi.Item) {
  await ElMessageBox.confirm(`确认删除模块「${row.name}」?`, "提示", {
    type: "warning",
  });
  await videoModuleApi.remove(row.id);
  ElMessage.success("已删除");
  fetchList();
}

onMounted(async () => {
  await Promise.all([fetchTags(), fetchList()]);
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
        <ElTableColumn label="检索条件" min-width="200">
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
          <ElInput v-model="form.name" placeholder="如: 今日上新 / 推荐" maxlength="64" />
        </ElFormItem>
        <ElFormItem label="位置" prop="position">
          <ElSelect v-model="form.position" style="width: 220px">
            <ElOption
              v-for="o in posOpts"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="样式" prop="style">
          <ElSelect v-model="form.style" style="width: 260px">
            <ElOption
              v-for="o in styleOpts"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="检索条件">
          <ElSelect
            v-model="form.tag_ids"
            multiple
            clearable
            filterable
            placeholder="从视频标签多选，不选则按最新"
            style="width: 100%"
          >
            <ElOption
              v-for="t in tags"
              :key="t.id"
              :label="t.name"
              :value="t.id"
            />
          </ElSelect>
          <p class="mt-1 text-xs text-gray-400">暂时按标签检索，选中任一标签即命中</p>
        </ElFormItem>
        <ElFormItem label="展示数量">
          <ElInputNumber v-model="form.size" :min="1" :max="30" />
          <span class="ml-2 text-xs text-gray-400">3X3 填 6 即六宫格，填 9 即九宫格</span>
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
