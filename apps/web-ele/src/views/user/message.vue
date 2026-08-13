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
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import {
  createMessageApi,
  deleteMessageApi,
  getMessageListApi,
  type MessageApi,
  updateMessageApi,
} from "#/api/core/message";

defineOptions({ name: "UserMessage" });

// user_id 筛选是三态(照后端控制器注释): ""=全部  "0"=只看全员  ">0"=指定用户
// 所以"全员"选项的值必须是字符串 "0" 而不是空串, 否则会变成不筛选。
const targetOpts = [
  { label: "全部消息", value: "" },
  { label: "仅全员消息", value: "0" },
  { label: "指定用户", value: "user" },
];
const statusOpts = [
  { label: "全部状态", value: "" },
  { label: "已发布", value: "1" },
  { label: "已撤回", value: "0" },
];
const typeMap: Record<number, string> = {
  1: "系统通知",
  2: "活动",
  3: "审核结果",
};

const loading = ref(false);
const list = ref<MessageApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
// target 只是 UI 上的三态开关, 真正发给后端的 user_id 由 buildUserIdParam 拼
const search = reactive({ target: "", userId: "", status: "", keyword: "" });

/** 把 UI 的"全部/仅全员/指定用户"翻译成后端要的 user_id 字符串 */
function buildUserIdParam(): string {
  if (search.target === "0") return "0"; // 只看全员
  if (search.target === "user") return search.userId.trim(); // 指定用户, 没填就退化成全部
  return "";
}

async function fetchList() {
  loading.value = true;
  try {
    const res = await getMessageListApi({
      user_id: buildUserIdParam(),
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
  search.target = "";
  search.userId = "";
  search.status = "";
  search.keyword = "";
  doSearch();
}

// ---------- 新增/编辑 ----------
const dialog = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
// toAll: true=发给全员(user_id=0), false=指定用户
const emptyForm = () => ({
  id: 0,
  toAll: true,
  user_id: 0,
  type: 1,
  title: "",
  content: "",
  status: 1,
});
const form = reactive(emptyForm());
const rules = {
  title: [{ required: true, message: "标题必填", trigger: "blur" }],
  content: [{ required: true, message: "内容必填", trigger: "blur" }],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  dialog.value = true;
}
function openEdit(row: MessageApi.Item) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    toAll: row.user_id === 0,
    user_id: row.user_id,
    type: row.type,
    // 更新接口对 title/content 传空串会跳过不改, 所以必须完整回填原值
    title: row.title,
    content: row.content,
    status: row.status,
  });
  dialog.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  if (!form.toAll && Number(form.user_id) <= 0) {
    ElMessage.warning("指定用户时 user_id 必须大于 0");
    return;
  }
  saving.value = true;
  try {
    if (isEdit.value) {
      // 更新接口没有 user_id 字段, 接收人建好之后改不了, 这里只提交可改的部分
      await updateMessageApi(form.id, {
        type: form.type,
        title: form.title,
        content: form.content,
        status: form.status,
      });
      ElMessage.success("已保存");
    } else {
      await createMessageApi({
        user_id: form.toAll ? 0 : Number(form.user_id),
        type: form.type,
        title: form.title,
        content: form.content,
      });
      // 新建后端固定 status=1(已发布), 想撤回得再编辑一次
      ElMessage.success("已发布");
    }
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

/** 发布/撤回: 复用 Update, title/content 原样回传避免被"空串跳过"逻辑吞掉 */
async function toggleStatus(row: MessageApi.Item) {
  const next = row.status === 1 ? 0 : 1;
  await updateMessageApi(row.id, {
    type: row.type,
    title: row.title,
    content: row.content,
    status: next,
  });
  ElMessage.success(next === 1 ? "已发布" : "已撤回");
  fetchList();
}

async function handleDelete(row: MessageApi.Item) {
  await ElMessageBox.confirm(
    `确认删除消息「${row.title}」? 删除后用户端不再可见。`,
    "提示",
    { type: "warning" },
  );
  await deleteMessageApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <ElSelect
          v-model="search.target"
          style="width: 140px"
          @change="doSearch"
        >
          <ElOption
            v-for="o in targetOpts"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </ElSelect>
        <ElInput
          v-if="search.target === 'user'"
          v-model="search.userId"
          placeholder="用户ID"
          style="width: 120px"
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
          placeholder="标题关键字"
          style="width: 220px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">发布消息</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="70" />
        <ElTableColumn label="接收人" width="110">
          <template #default="{ row }">
            <!-- user_id=0 是全员广播, 直接显示成"全员"避免运营误解成 0 号用户 -->
            <ElTag v-if="row.user_id === 0" type="warning" size="small">
              全员
            </ElTag>
            <span v-else>用户 {{ row.user_id }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="类型" width="100" align="center">
          <template #default="{ row }">
            {{ typeMap[row.type] ?? row.type }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          prop="title"
          label="标题"
          min-width="180"
          show-overflow-tooltip
        />
        <ElTableColumn
          prop="content"
          label="内容"
          min-width="260"
          show-overflow-tooltip
        />
        <ElTableColumn label="状态" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? "已发布" : "已撤回" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="created_at" label="创建时间" width="170" />
        <ElTableColumn label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton
              link
              :type="row.status === 1 ? 'warning' : 'success'"
              @click="toggleStatus(row)"
            >
              {{ row.status === 1 ? "撤回" : "发布" }}
            </ElButton>
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
      :title="isEdit ? '编辑消息' : '发布消息'"
      width="600px"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="90px">
        <ElFormItem label="接收范围">
          <ElRadioGroup v-model="form.toAll" :disabled="isEdit">
            <ElRadioButton :value="true">发给全员</ElRadioButton>
            <ElRadioButton :value="false">指定用户</ElRadioButton>
          </ElRadioGroup>
          <span class="ml-2 text-xs text-gray-400">
            全员即 user_id=0；接收人创建后不可修改
          </span>
        </ElFormItem>
        <ElFormItem v-if="!form.toAll" label="用户ID">
          <ElInputNumber v-model="form.user_id" :min="1" :disabled="isEdit" />
        </ElFormItem>
        <ElFormItem label="消息类型">
          <ElSelect v-model="form.type" style="width: 160px">
            <ElOption label="系统通知" :value="1" />
            <ElOption label="活动" :value="2" />
            <ElOption label="审核结果" :value="3" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="标题" prop="title">
          <ElInput v-model="form.title" maxlength="128" show-word-limit />
        </ElFormItem>
        <ElFormItem label="内容" prop="content">
          <ElInput v-model="form.content" type="textarea" :rows="5" />
        </ElFormItem>
        <ElFormItem v-if="isEdit" label="发布状态">
          <ElSelect v-model="form.status" style="width: 160px">
            <ElOption label="已发布" :value="1" />
            <ElOption label="已撤回" :value="0" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-else label="发布状态">
          <span class="text-xs text-gray-400">
            新建后即为"已发布"，如需撤回请创建后再编辑
          </span>
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
