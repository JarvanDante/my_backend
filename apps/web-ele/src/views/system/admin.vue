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
  createAdminApi,
  deleteAdminApi,
  getAdminListApi,
  getRoleListApi,
  type SystemApi,
  updateAdminApi,
} from "#/api/core/system";

defineOptions({ name: "SystemAdmin" });

const loading = ref(false);
const tableData = ref<SystemApi.AdminItem[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const roles = ref<SystemApi.RoleItem[]>([]);

async function fetchList() {
  loading.value = true;
  try {
    const res = await getAdminListApi(pagination.current, pagination.pageSize);
    tableData.value = res.list || [];
    pagination.total = res.total || 0;
  } finally {
    loading.value = false;
  }
}

async function loadRoles() {
  const res = await getRoleListApi();
  roles.value = res.list || [];
}

// ---------- 新建/编辑 ----------
const dialogVisible = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
const form = reactive({
  id: 0,
  username: "",
  password: "",
  nickname: "",
  role_id: 0,
  status: true,
});
const rules = {
  username: [{ required: true, message: "账号必填", trigger: "blur" }],
  role_id: [
    {
      validator: (_: any, v: number, cb: any) =>
        v > 0 ? cb() : cb(new Error("请选择角色")),
      trigger: "change",
    },
  ],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, { id: 0, username: "", password: "", nickname: "", role_id: 0, status: true });
  loadRoles();
  dialogVisible.value = true;
}

function openEdit(row: SystemApi.AdminItem) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    username: row.username,
    password: "",
    nickname: row.nickname,
    role_id: row.role_id,
    status: row.status === 1,
  });
  loadRoles();
  dialogVisible.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  if (!isEdit.value && !form.password) {
    ElMessage.warning("创建管理员必须设置密码");
    return;
  }
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateAdminApi({
        id: form.id,
        nickname: form.nickname,
        role_id: form.role_id,
        status: form.status ? 1 : 0,
        password: form.password || undefined,
      });
      ElMessage.success("更新成功(密码留空未修改)");
    } else {
      await createAdminApi({
        username: form.username,
        password: form.password,
        nickname: form.nickname,
        role_id: form.role_id,
      });
      ElMessage.success("创建成功");
    }
    dialogVisible.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: SystemApi.AdminItem) {
  await ElMessageBox.confirm(`确认删除管理员「${row.username}」?`, "提示", {
    type: "warning",
  });
  await deleteAdminApi(row.id);
  ElMessage.success("删除成功");
  fetchList();
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex items-center">
        <span class="font-medium">管理员列表</span>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">创建管理员</ElButton>
      </div>

      <ElTable v-loading="loading" :data="tableData" border stripe>
        <ElTableColumn prop="id" label="ID" width="60" />
        <ElTableColumn prop="username" label="账号" width="140" />
        <ElTableColumn prop="nickname" label="昵称" width="140" />
        <ElTableColumn prop="role_name" label="角色" width="130">
          <template #default="{ row }">
            <ElTag size="small">{{ row.role_name || "-" }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="80" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? "启用" : "禁用" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="last_login_at" label="最后登录" width="170" />
        <ElTableColumn label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton link type="danger" @click="handleDelete(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-4 flex justify-end">
        <ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </ElCard>

    <ElDialog v-model="dialogVisible" :title="isEdit ? '编辑管理员' : '创建管理员'" width="440px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="80px">
        <ElFormItem label="账号" prop="username">
          <ElInput v-model="form.username" :disabled="isEdit" />
        </ElFormItem>
        <ElFormItem label="密码">
          <ElInput
            v-model="form.password"
            type="password"
            show-password
            :placeholder="isEdit ? '留空表示不修改' : '必填'"
          />
        </ElFormItem>
        <ElFormItem label="昵称">
          <ElInput v-model="form.nickname" />
        </ElFormItem>
        <ElFormItem label="角色" prop="role_id">
          <ElSelect v-model="form.role_id" placeholder="选择角色" style="width: 100%">
            <ElOption v-for="r in roles" :key="r.id" :label="`${r.name}(${r.code})`" :value="r.id" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="isEdit" label="状态">
          <ElSwitch v-model="form.status" active-text="启用" inactive-text="禁用" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
