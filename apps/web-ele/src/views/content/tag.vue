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
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import {
  createTagApi,
  deleteTagApi,
  getTagListApi,
  type TagApi,
  updateTagApi,
} from "#/api/core/tag";

defineOptions({ name: "ContentTag" });

// 标签归属的内容域, 与后端 entity.Tag.content_type 注释一一对应
const typeOpts = [
  { label: "影片", value: 1 },
  { label: "抖音", value: 2 },
  { label: "动漫", value: 3 },
  { label: "漫画", value: 4 },
  { label: "图集", value: 5 },
  { label: "帖子", value: 6 },
  { label: "小说", value: 7 },
];
const typeMap: Record<number, string> = Object.fromEntries(
  typeOpts.map((o) => [o.value, o.label]),
);

// content_type 后端收的是 int, 0 就表示"全部"; status 收的是 string, 空串才是"全部"
const statusOpts = [
  { label: "全部状态", value: "" },
  { label: "启用", value: "1" },
  { label: "禁用", value: "0" },
];

const loading = ref(false);
const list = ref<TagApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ content_type: 0, status: "" });

async function fetchList() {
  loading.value = true;
  try {
    const res = await getTagListApi({
      content_type: search.content_type,
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
  search.content_type = 0;
  search.status = "";
  doSearch();
}

// ---------- 新增/编辑 ----------
const dialog = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
const emptyForm = () => ({
  id: 0,
  content_type: 1,
  name: "",
  rank: 0,
  status: 1,
});
const form = reactive(emptyForm());
const rules = {
  name: [{ required: true, message: "标签名必填", trigger: "blur" }],
  content_type: [{ required: true, message: "内容类型必填", trigger: "change" }],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  dialog.value = true;
}
function openEdit(row: TagApi.Item) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    content_type: row.content_type,
    name: row.name,
    rank: row.rank,
    status: row.status,
  });
  dialog.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  saving.value = true;
  try {
    if (isEdit.value) {
      // 更新接口不收 content_type: 标签已经被内容引用, 改归属会让老数据串域
      await updateTagApi(form.id, {
        name: form.name,
        rank: Number(form.rank) || 0,
        status: form.status,
      });
      ElMessage.success("已保存");
    } else {
      await createTagApi({
        content_type: form.content_type,
        name: form.name,
        rank: Number(form.rank) || 0,
        status: form.status,
      });
      ElMessage.success("已新增");
    }
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: TagApi.Item) {
  await ElMessageBox.confirm(
    `确认删除标签「${row.name}」? 已打过该标签的内容不会自动清理。`,
    "提示",
    { type: "warning" },
  );
  await deleteTagApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <ElSelect v-model="search.content_type" style="width: 140px" @change="doSearch">
          <ElOption label="全部类型" :value="0" />
          <ElOption v-for="o in typeOpts" :key="o.value" :label="o.label" :value="o.value" />
        </ElSelect>
        <ElSelect v-model="search.status" style="width: 120px" @change="doSearch">
          <ElOption v-for="o in statusOpts" :key="o.value" :label="o.label" :value="o.value" />
        </ElSelect>
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">新增标签</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="80" />
        <ElTableColumn label="内容类型" width="120">
          <template #default="{ row }">
            {{ typeMap[row.content_type] ?? row.content_type }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="name" label="标签名" min-width="160" />
        <ElTableColumn prop="rank" label="排序权重" width="100" align="center" />
        <ElTableColumn label="状态" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? "启用" : "禁用" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="created_at" label="创建时间" width="180" />
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

    <!-- 标签表单 -->
    <ElDialog v-model="dialog" :title="isEdit ? '编辑标签' : '新增标签'" width="520px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="90px">
        <ElFormItem label="内容类型" prop="content_type">
          <ElSelect v-model="form.content_type" style="width: 180px" :disabled="isEdit">
            <ElOption v-for="o in typeOpts" :key="o.value" :label="o.label" :value="o.value" />
          </ElSelect>
          <span v-if="isEdit" class="ml-2 text-xs text-gray-400">归属确定后不可改</span>
        </ElFormItem>
        <ElFormItem label="标签名" prop="name">
          <ElInput v-model="form.name" placeholder="如: 国产 / 热血" />
        </ElFormItem>
        <ElFormItem label="排序权重">
          <ElInputNumber v-model="form.rank" :min="0" />
          <span class="ml-2 text-xs text-gray-400">数值越大越靠前</span>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="form.status" style="width: 140px">
            <ElOption label="启用" :value="1" />
            <ElOption label="禁用" :value="0" />
          </ElSelect>
          <span class="ml-2 text-xs text-gray-400">禁用后前台筛选项里不再出现</span>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
