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
  createComicsCategoryApi,
  deleteComicsCategoryApi,
  getComicsCategoryListApi,
  type ComicsCategoryApi,
  updateComicsCategoryApi,
} from "#/api/core/comics-category";

defineOptions({ name: "ContentComicsCategory" });

const kindOpts = [
  { label: "普通分类", value: 0 },
  { label: "新更", value: 1 },
  { label: "推荐", value: 2 },
  { label: "榜单", value: 3 },
];
const kindMap: Record<number, string> = Object.fromEntries(
  kindOpts.map((o) => [o.value, o.label]),
);
const statusOpts = [
  { label: "全部状态", value: "" },
  { label: "启用", value: "1" },
  { label: "禁用", value: "0" },
];

const loading = ref(false);
const list = ref<ComicsCategoryApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ kind: "", status: "" });

async function fetchList() {
  loading.value = true;
  try {
    const res = await getComicsCategoryListApi({
      kind: search.kind || undefined,
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
  search.kind = "";
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
  kind: 0,
  rank: 0,
  status: 1,
});
const form = reactive(emptyForm());
const rules = {
  name: [{ required: true, message: "分类名必填", trigger: "blur" }],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  dialog.value = true;
}
function openEdit(row: ComicsCategoryApi.Item) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    name: row.name,
    kind: row.kind,
    rank: row.rank,
    status: row.status,
  });
  dialog.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  const body = {
    name: form.name,
    kind: Number(form.kind) || 0,
    rank: Number(form.rank) || 0,
    status: form.status,
  };
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateComicsCategoryApi(form.id, body);
      ElMessage.success("已保存");
    } else {
      await createComicsCategoryApi(body);
      ElMessage.success("已新增");
    }
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: ComicsCategoryApi.Item) {
  await ElMessageBox.confirm(
    `确认删除分类「${row.name}」? 已用该分类的漫画不会自动改掉。`,
    "提示",
    { type: "warning" },
  );
  await deleteComicsCategoryApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <ElSelect v-model="search.kind" style="width: 140px" @change="doSearch">
          <ElOption label="全部类型" value="" />
          <ElOption
            v-for="o in kindOpts"
            :key="o.value"
            :label="o.label"
            :value="String(o.value)"
          />
        </ElSelect>
        <ElSelect v-model="search.status" style="width: 120px" @change="doSearch">
          <ElOption v-for="o in statusOpts" :key="o.value" :label="o.label" :value="o.value" />
        </ElSelect>
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">新增分类</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="80" />
        <ElTableColumn prop="name" label="分类名" min-width="160" />
        <ElTableColumn label="类型" width="120">
          <template #default="{ row }">
            {{ kindMap[row.kind] ?? row.kind }}
          </template>
        </ElTableColumn>
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

    <ElDialog v-model="dialog" :title="isEdit ? '编辑分类' : '新增分类'" width="520px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="90px">
        <ElFormItem label="分类名" prop="name">
          <ElInput v-model="form.name" placeholder="如: 韩漫 / 日漫" maxlength="32" />
        </ElFormItem>
        <ElFormItem label="类型">
          <ElSelect v-model="form.kind" style="width: 180px">
            <ElOption v-for="o in kindOpts" :key="o.value" :label="o.label" :value="o.value" />
          </ElSelect>
        </ElFormItem>
        <p class="mb-3 ml-[90px] text-xs text-gray-400">
          普通分类会出现在 H5 顶栏, 也可给漫画打标; 新更/推荐/榜单只占栏位, 不作为作品分类。
        </p>
        <ElFormItem label="排序权重">
          <ElInputNumber v-model="form.rank" :min="0" />
          <span class="ml-2 text-xs text-gray-400">数值越大越靠前</span>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="form.status" style="width: 140px">
            <ElOption label="启用" :value="1" />
            <ElOption label="禁用" :value="0" />
          </ElSelect>
          <span class="ml-2 text-xs text-gray-400">禁用后 H5 顶栏不再显示</span>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
