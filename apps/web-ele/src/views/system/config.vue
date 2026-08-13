<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

import {
  ElButton,
  ElButtonGroup,
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
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import {
  type ConfigApi,
  createConfigApi,
  deleteConfigApi,
  getConfigListApi,
  updateConfigApi,
} from "#/api/core/config";

defineOptions({ name: "SystemConfig" });

const statusOpts = [
  { label: "全部状态", value: "" },
  { label: "启用", value: "1" },
  { label: "禁用", value: "0" },
];

const loading = ref(false);
const list = ref<ConfigApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
const search = reactive({ grp: "", status: "", keyword: "" });

// 分组快捷筛选: 后端没有"取所有分组"的接口, 这里从已加载的列表结果里去重攒出来。
// 用 Set 累积而不是每次覆盖, 否则一旦按某个 grp 筛过, 按钮组就只剩那一个分组, 切不回去了。
const grpSet = ref<Set<string>>(new Set());
const grpList = computed(() => [...grpSet.value].sort());

async function fetchList() {
  loading.value = true;
  try {
    const res = await getConfigListApi({
      grp: search.grp || undefined,
      status: search.status,
      keyword: search.keyword || undefined,
      page: page.current,
      size: page.size,
    });
    list.value = res.list || [];
    page.total = res.total || 0;
    for (const r of list.value) {
      if (r.grp) grpSet.value.add(r.grp);
    }
  } finally {
    loading.value = false;
  }
}
function doSearch() {
  page.current = 1;
  fetchList();
}
function resetSearch() {
  search.grp = "";
  search.status = "";
  search.keyword = "";
  doSearch();
}
function pickGrp(grp: string) {
  search.grp = grp;
  doSearch();
}

// ---------- 新增/编辑 ----------
const dialog = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
const emptyForm = () => ({
  id: 0,
  grp: "base",
  key: "",
  value: "",
  remark: "",
  status: 1,
});
const form = reactive(emptyForm());
const rules = {
  key: [{ required: true, message: "key 必填", trigger: "blur" }],
  value: [{ required: true, message: "value 必填", trigger: "blur" }],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  // 当前正筛某个分组时, 默认沿用该分组, 少一次手填
  if (search.grp) form.grp = search.grp;
  dialog.value = true;
}
function openEdit(row: ConfigApi.Item) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    grp: row.grp,
    key: row.key,
    value: row.value,
    remark: row.remark,
    status: row.status,
  });
  dialog.value = true;
}

/** value 是否是合法 JSON: 只用于弹窗里的即时提示, 非法也能提交(后端会转成 JSON 字符串) */
const valueIsJson = computed(() => {
  const v = form.value.trim();
  if (!v) return false;
  try {
    JSON.parse(v);
    return true;
  } catch {
    return false;
  }
});

async function handleSave() {
  await formRef.value?.validate();
  saving.value = true;
  try {
    if (isEdit.value) {
      // 更新接口没有 key 字段, key 不可改(要改只能删了重建)
      await updateConfigApi(form.id, {
        grp: form.grp,
        value: form.value,
        remark: form.remark,
        status: form.status,
      });
      ElMessage.success("已保存");
    } else {
      await createConfigApi({
        grp: form.grp,
        key: form.key.trim(),
        value: form.value,
        remark: form.remark,
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

async function handleDelete(row: ConfigApi.Item) {
  await ElMessageBox.confirm(
    `确认删除配置「${row.key}」? 依赖该 key 的业务会回落到代码里的默认值。`,
    "提示",
    { type: "warning" },
  );
  await deleteConfigApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <!-- 分组快捷切换: 运营在 base / withdrawal / ai 之间来回跳的频率最高 -->
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="text-sm text-gray-500">分组:</span>
        <ElButtonGroup>
          <ElButton
            size="small"
            :type="search.grp === '' ? 'primary' : 'default'"
            @click="pickGrp('')"
          >
            全部
          </ElButton>
          <ElButton
            v-for="g in grpList"
            :key="g"
            size="small"
            :type="search.grp === g ? 'primary' : 'default'"
            @click="pickGrp(g)"
          >
            {{ g }}
          </ElButton>
        </ElButtonGroup>
      </div>

      <div class="mb-4 flex flex-wrap items-center gap-2">
        <ElInput
          v-model="search.grp"
          placeholder="分组 grp"
          style="width: 150px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElSelect
          v-model="search.status"
          style="width: 130px"
          @change="doSearch"
        >
          <ElOption
            v-for="o in statusOpts"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </ElSelect>
        <ElInput
          v-model="search.keyword"
          placeholder="key / 备注 关键字"
          style="width: 220px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">新增配置</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="70" />
        <ElTableColumn label="分组" width="120">
          <template #default="{ row }">
            <ElTag size="small" type="info">{{ row.grp }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="key" label="key" min-width="180" show-overflow-tooltip />
        <ElTableColumn
          prop="value"
          label="value (JSON)"
          min-width="220"
          show-overflow-tooltip
        />
        <ElTableColumn
          prop="remark"
          label="备注"
          min-width="220"
          show-overflow-tooltip
        />
        <ElTableColumn label="状态" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? "启用" : "禁用" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="updated_at" label="更新时间" width="170" />
        <ElTableColumn label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton link type="danger" @click="handleDelete(row)">
              删除
            </ElButton>
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

    <ElDialog
      v-model="dialog"
      :title="isEdit ? '编辑配置' : '新增配置'"
      width="620px"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="90px">
        <ElFormItem label="分组">
          <ElInput v-model="form.grp" placeholder="如: base / withdrawal / ai" />
        </ElFormItem>
        <ElFormItem label="key" prop="key">
          <ElInput
            v-model="form.key"
            :disabled="isEdit"
            placeholder="全局唯一, 建好后不可修改"
          />
        </ElFormItem>
        <ElFormItem label="value" prop="value">
          <ElInput
            v-model="form.value"
            type="textarea"
            :rows="5"
            placeholder='数字写 10 ; 布尔写 true ; 字符串写 "abc" (带双引号) ; 对象写 {"a":1}'
          />
          <!-- 这行提示是必须的: value 是 jsonb, 运营常直接写 abc 导致存成 "abc" -->
          <div class="mt-1 text-xs text-gray-400">
            value 存的是 JSON 文本：数字 <code>10</code>、布尔
            <code>true</code>、字符串 <code>"abc"</code>（要带双引号）、对象
            <code>{"a":1}</code>。填入非法 JSON 的普通文本会被后端自动转成 JSON
            字符串（<code>abc</code> → <code>"abc"</code>）。
            <span v-if="form.value" :class="valueIsJson ? 'text-green-600' : 'text-orange-500'">
              当前输入{{ valueIsJson ? "是合法 JSON, 将原样存储" : "不是合法 JSON, 将被转成 JSON 字符串" }}
            </span>
          </div>
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="form.remark" placeholder="给运营看的说明" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="form.status" style="width: 160px">
            <ElOption label="启用" :value="1" />
            <ElOption label="禁用" :value="0" />
          </ElSelect>
          <span class="ml-2 text-xs text-gray-400">禁用后前台配置接口不下发</span>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">
          保存
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>
