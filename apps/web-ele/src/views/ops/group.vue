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
  ElLink,
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
  type GroupApi,
  createGroupApi,
  deleteGroupApi,
  getGroupListApi,
  updateGroupApi,
} from "#/api/core/group";

defineOptions({ name: "OpsGroup" });

const loading = ref(false);
const list = ref<GroupApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ status: "", keyword: "" });
const statusOpts = [
  { label: "全部", value: "" },
  { label: "下架", value: "0" },
  { label: "上架", value: "1" },
];
const platformOpts = [
  { label: "Telegram", value: "telegram" },
  { label: "QQ", value: "qq" },
  { label: "微信", value: "wechat" },
  { label: "Discord", value: "discord" },
  { label: "其他", value: "other" },
];

const platformLabel = (v: string) =>
  platformOpts.find((o) => o.value === v)?.label || v || "-";

async function fetchList() {
  loading.value = true;
  try {
    const res = await getGroupListApi({
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
  search.status = "";
  search.keyword = "";
  doSearch();
}

const dialog = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
const emptyForm = () => ({
  id: 0,
  name: "",
  intro: "",
  avatar: "",
  link: "",
  platform: "telegram",
  rank: 0,
  status: 1,
});
const form = reactive(emptyForm());
const rules = {
  name: [{ required: true, message: "社群名必填", trigger: "blur" }],
  link: [{ required: true, message: "跳转链接必填", trigger: "blur" }],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  dialog.value = true;
}
function openEdit(row: GroupApi.Item) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    name: row.name,
    intro: row.intro,
    avatar: row.avatar,
    link: row.link,
    platform: row.platform || "other",
    rank: row.rank,
    status: row.status,
  });
  dialog.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  const body: GroupApi.SaveBody = {
    name: form.name,
    intro: form.intro,
    avatar: form.avatar,
    link: form.link,
    platform: form.platform,
    rank: Number(form.rank) || 0,
    status: form.status,
  };
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateGroupApi(form.id, body);
      ElMessage.success("已保存");
    } else {
      await createGroupApi(body);
      ElMessage.success("已新增");
    }
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: GroupApi.Item) {
  await ElMessageBox.confirm(`确认删除官方社群「${row.name}」?`, "提示", {
    type: "warning",
  });
  await deleteGroupApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex flex-wrap items-center gap-2">
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
          placeholder="社群名关键字"
          style="width: 220px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">新增社群</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="70" />
        <ElTableColumn label="图标" width="80">
          <template #default="{ row }">
            <ElImage
              v-if="row.avatar"
              :src="row.avatar"
              fit="cover"
              style="width: 44px; height: 44px"
              preview-teleported
              :preview-src-list="[row.avatar]"
            />
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="name" label="社群名" min-width="140" show-overflow-tooltip />
        <ElTableColumn prop="intro" label="简介" min-width="180" show-overflow-tooltip />
        <ElTableColumn label="平台" width="110" align="center">
          <template #default="{ row }">
            <ElTag size="small">{{ platformLabel(row.platform) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="跳转链接" min-width="220">
          <template #default="{ row }">
            <ElLink
              v-if="row.link"
              :href="row.link"
              type="primary"
              target="_blank"
              class="truncate"
            >
              {{ row.link }}
            </ElLink>
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
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

    <ElDialog v-model="dialog" :title="isEdit ? '编辑官方社群' : '新增官方社群'" width="560px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="社群名" prop="name">
          <ElInput v-model="form.name" />
        </ElFormItem>
        <ElFormItem label="平台">
          <ElSelect v-model="form.platform" style="width: 200px">
            <ElOption
              v-for="o in platformOpts"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="图标">
          <ElInput v-model="form.avatar" placeholder="图片 URL" />
        </ElFormItem>
        <ElFormItem label="简介">
          <ElInput v-model="form.intro" type="textarea" :rows="3" />
        </ElFormItem>
        <ElFormItem label="跳转链接" prop="link">
          <ElInput v-model="form.link" placeholder="https://" />
        </ElFormItem>
        <ElFormItem label="排序权重">
          <ElInputNumber v-model="form.rank" :min="0" />
          <span class="ml-2 text-xs text-gray-400">越大越靠前</span>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="form.status" style="width: 160px">
            <ElOption label="上架" :value="1" />
            <ElOption label="下架" :value="0" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
