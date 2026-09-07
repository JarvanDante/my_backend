<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
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
  type ChannelApi,
  createChannelApi,
  deleteChannelApi,
  getChannelListApi,
  updateChannelApi,
} from "#/api/core/channel";

defineOptions({ name: "UserChannel" });

const loading = ref(false);
const list = ref<ChannelApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ status: "", keyword: "" });
const statusOpts = [
  { label: "全部", value: "" },
  { label: "停用", value: "0" },
  { label: "启用", value: "1" },
];

async function fetchList() {
  loading.value = true;
  try {
    const res = await getChannelListApi({
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
  code: "",
  name: "",
  remark: "",
  status: 1,
});
const form = reactive(emptyForm());
const rules = {
  code: [{ required: true, message: "渠道码必填", trigger: "blur" }],
  name: [{ required: true, message: "渠道名必填", trigger: "blur" }],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  dialog.value = true;
}
function openEdit(row: ChannelApi.Item) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    code: row.code,
    name: row.name,
    remark: row.remark,
    status: row.status,
  });
  dialog.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  const body: ChannelApi.SaveBody = {
    name: form.name,
    remark: form.remark,
    status: form.status,
  };
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateChannelApi(form.id, body);
      ElMessage.success("已保存");
    } else {
      await createChannelApi({ ...body, code: form.code });
      ElMessage.success("已新增");
    }
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: ChannelApi.Item) {
  await ElMessageBox.confirm(`确认删除渠道 ${row.code}?`, "提示", { type: "warning" });
  await deleteChannelApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

async function copyText(text: string, ok = "已复制") {
  const value = String(text || "").trim();
  if (!value) {
    ElMessage.warning("没有可复制的内容");
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    ElMessage.success(ok);
  } catch {
    ElMessage.warning(`复制失败, 请手动复制: ${value}`);
  }
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
          placeholder="渠道码 / 名称"
          style="width: 220px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">新增渠道</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="70" />
        <ElTableColumn prop="code" label="渠道码" width="140" />
        <ElTableColumn prop="name" label="名称" min-width="140" show-overflow-tooltip />
        <ElTableColumn prop="remark" label="备注" min-width="160" show-overflow-tooltip />
        <ElTableColumn prop="user_count" label="用户数" width="90" align="center" />
        <ElTableColumn label="状态" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status_text }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="created_at" label="创建时间" width="170" />
        <ElTableColumn label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="copyText(row.h5_link, '已复制 H5 链接')">
              复制链接
            </ElButton>
            <ElButton link type="primary" @click="copyText(row.code, '已复制渠道码')">
              复制码
            </ElButton>
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

    <ElDialog v-model="dialog" :title="isEdit ? '编辑渠道' : '新增渠道'" width="520px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="88px">
        <ElFormItem label="渠道码" prop="code">
          <ElInput
            v-model="form.code"
            :disabled="isEdit"
            maxlength="32"
            placeholder="如 DY01，登录参数 source"
          />
        </ElFormItem>
        <ElFormItem label="名称" prop="name">
          <ElInput v-model="form.name" maxlength="64" placeholder="后台展示名" />
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="form.remark" maxlength="255" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSwitch
            v-model="form.status"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
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
