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
  type ApplicationApi,
  createApplicationApi,
  deleteApplicationApi,
  getApplicationListApi,
  updateApplicationApi,
} from "#/api/core/application";

defineOptions({ name: "OpsApplication" });

const loading = ref(false);
const list = ref<ApplicationApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
// status 保持 string: 空串=全部(后端 statusOf("")=-1), 传 0 会被当成"只看下架"
const search = reactive({ status: "", keyword: "" });
const statusOpts = [
  { label: "全部", value: "" },
  { label: "下架", value: "0" },
  { label: "上架", value: "1" },
];

async function fetchList() {
  loading.value = true;
  try {
    const res = await getApplicationListApi({
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
  tag: 0,
  intro: "",
  avatar: "",
  download_url: "",
  ios_url: "",
  android_url: "",
  // loc_ids 是 jsonb 数组, 表单用逗号分隔文本承接, 提交时解析成 number[]
  locText: "",
  rank: 0,
  status: 1,
});
const form = reactive(emptyForm());
const rules = {
  name: [{ required: true, message: "应用名必填", trigger: "blur" }],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  dialog.value = true;
}
function openEdit(row: ApplicationApi.Item) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    name: row.name,
    tag: row.tag,
    intro: row.intro,
    avatar: row.avatar,
    download_url: row.download_url,
    ios_url: row.ios_url,
    android_url: row.android_url,
    locText: (row.loc_ids || []).join(","),
    rank: row.rank,
    status: row.status,
  });
  dialog.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  const loc_ids = form.locText
    .split(/[,，\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  const body: ApplicationApi.SaveBody = {
    name: form.name,
    tag: Number(form.tag) || 0,
    intro: form.intro,
    avatar: form.avatar,
    download_url: form.download_url,
    ios_url: form.ios_url,
    android_url: form.android_url,
    // 后端对 loc_ids 是无条件覆盖(locJSON 直接写), 所以每次都要提交完整数组
    loc_ids,
    rank: Number(form.rank) || 0,
    status: form.status,
  };
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateApplicationApi(form.id, body);
      ElMessage.success("已保存");
    } else {
      await createApplicationApi(body);
      ElMessage.success("已新增");
    }
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: ApplicationApi.Item) {
  await ElMessageBox.confirm(
    `确认删除推广应用「${row.name}」? 前台投放位将不再展示该应用。`,
    "提示",
    { type: "warning" },
  );
  await deleteApplicationApi(row.id);
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
          placeholder="应用名关键字"
          style="width: 220px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">新增应用</ElButton>
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
        <ElTableColumn prop="name" label="应用名" min-width="140" show-overflow-tooltip />
        <ElTableColumn prop="intro" label="简介" min-width="180" show-overflow-tooltip />
        <ElTableColumn prop="tag" label="标签" width="80" align="center" />
        <ElTableColumn label="下载地址" min-width="200">
          <template #default="{ row }">
            <ElLink
              v-if="row.download_url"
              :href="row.download_url"
              type="primary"
              target="_blank"
              class="truncate"
            >
              {{ row.download_url }}
            </ElLink>
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="投放位置" width="140">
          <template #default="{ row }">
            <ElTag
              v-for="loc in row.loc_ids || []"
              :key="loc"
              size="small"
              class="mr-1"
            >
              {{ loc }}
            </ElTag>
            <span v-if="!(row.loc_ids || []).length" class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="down_total" label="下载数" width="90" align="center" />
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

    <!-- 应用表单 -->
    <ElDialog
      v-model="dialog"
      :title="isEdit ? '编辑推广应用' : '新增推广应用'"
      width="600px"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="应用名" prop="name">
          <ElInput v-model="form.name" />
        </ElFormItem>
        <ElFormItem label="图标">
          <ElInput v-model="form.avatar" placeholder="图片 URL" />
        </ElFormItem>
        <ElFormItem label="简介">
          <ElInput v-model="form.intro" type="textarea" :rows="3" />
        </ElFormItem>
        <ElFormItem label="标签">
          <ElInputNumber v-model="form.tag" :min="0" />
          <span class="ml-2 text-xs text-gray-400">自定义分类编号, 0 = 无</span>
        </ElFormItem>
        <ElFormItem label="通用下载">
          <ElInput v-model="form.download_url" placeholder="通用下载地址" />
        </ElFormItem>
        <ElFormItem label="iOS 地址">
          <ElInput v-model="form.ios_url" placeholder="可选" />
        </ElFormItem>
        <ElFormItem label="安卓地址">
          <ElInput v-model="form.android_url" placeholder="可选" />
        </ElFormItem>
        <ElFormItem label="投放位置">
          <ElInput v-model="form.locText" placeholder="位置ID, 多个用逗号分隔, 如: 1,2" />
        </ElFormItem>
        <ElFormItem label="排序权重">
          <ElInputNumber v-model="form.rank" :min="0" />
          <span class="ml-2 text-xs text-gray-400">越大越靠前</span>
        </ElFormItem>
        <ElFormItem v-if="isEdit" label="下载数">
          <span class="text-gray-500">由前台点击上报累加, 后台不可改</span>
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
