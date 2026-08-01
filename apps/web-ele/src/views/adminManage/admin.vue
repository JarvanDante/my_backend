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
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import {
  createAdminApi,
  deleteAdminApi,
  getAdminsApi,
  getRolesApi,
  generateGoogle2FAApi,
  bindGoogle2FAApi,
  type AdminApi,
  updateAdminApi,
} from "#/api/core/admin";

const loading = ref(false);
const tableData = ref<AdminApi.AdminItem[]>([]);
const roleOptions = ref<{ label: string; value: number }[]>([]);
const DEFAULT_ROLE_ID = 1;

const searchForm = reactive({
  username: "",
  status: "",
});

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

const addDialogVisible = ref(false);
const editDialogVisible = ref(false);
const submitting = ref(false);
const currentEditId = ref<number>(0);
const currentEditAdmin = ref<AdminApi.AdminItem | null>(null);
const google2FALoading = ref(false);
const google2FABindLoading = ref(false);
const google2FADialogVisible = ref(false);
const google2FAData = reactive({ secret: "", qr_url: "", code: "" });

const addForm = reactive({
  username: "",
  password: "",
  nickname: "",
  role: DEFAULT_ROLE_ID,
  status: 1,
});

const editForm = reactive({
  username: "",
  password: "",
  nickname: "",
  role_id: DEFAULT_ROLE_ID,
  status: 1,
});

function resetAddForm() {
  addForm.username = "";
  addForm.password = "";
  addForm.nickname = "";
  addForm.role = DEFAULT_ROLE_ID;
  addForm.status = 1;
}

function resetEditForm() {
  editForm.username = "";
  editForm.password = "";
  editForm.nickname = "";
  editForm.role_id = DEFAULT_ROLE_ID;
  editForm.status = 1;
}

function roleNameOf(row: AdminApi.AdminItem) {
  return (row as any).role_name || row.role || "-";
}

function isGoogle2FABound(admin: any): boolean {
  return Number(admin?.switch_google2fa ?? admin?.switchGoogle2Fa ?? 0) === 1;
}

async function handleOpenGoogle2FA() {
  if (!currentEditAdmin.value) {
    ElMessage.warning("请先选择管理员");
    return;
  }
  google2FALoading.value = true;
  try {
    const res = await generateGoogle2FAApi({ id: currentEditAdmin.value.id });
    google2FAData.secret = res.secret || "";
    google2FAData.qr_url = res.qr_url || "";
    google2FAData.code = "";
    google2FADialogVisible.value = true;
  } catch (error: any) {
    ElMessage.error(error?.message || "生成二维码失败");
  } finally {
    google2FALoading.value = false;
  }
}

async function handleBindGoogle2FA() {
  if (!currentEditAdmin.value) return;
  if (!google2FAData.secret || !google2FAData.code) {
    ElMessage.warning("请输入验证码");
    return;
  }
  google2FABindLoading.value = true;
  try {
    const res = await bindGoogle2FAApi({
      id: currentEditAdmin.value.id,
      secret: google2FAData.secret,
      code: google2FAData.code,
    });
    ElMessage.success(res?.message || "绑定成功");
    currentEditAdmin.value.switch_google2fa = 1;
    google2FADialogVisible.value = false;
    await fetchAdmins();
  } catch (error: any) {
    ElMessage.error(error?.message || "绑定失败");
  } finally {
    google2FABindLoading.value = false;
  }
}

async function fetchRoles() {
  try {
    const response = await getRolesApi();
    const roles = Array.isArray(response) ? response : (response as any).roles || [];
    roleOptions.value = roles.map((item: any) => ({
      label: item.name,
      value: Number(item.id || item.value),
    }));
    if (roleOptions.value.length > 0) {
      if (!addForm.role) addForm.role = roleOptions.value[0].value;
      if (!editForm.role_id) editForm.role_id = roleOptions.value[0].value;
    }
  } catch (error: any) {
    ElMessage.error(error?.message || "获取角色列表失败");
  }
}

async function fetchAdmins() {
  loading.value = true;
  try {
    const response = await getAdminsApi({
      page: pagination.current,
      size: pagination.pageSize,
      username: searchForm.username || "",
      status: searchForm.status || "",
    });

    tableData.value = response.list || [];
    pagination.total = (response as any).total ?? (response as any).count ?? 0;
  } catch (error: any) {
    ElMessage.error(error?.message || "获取管理员列表失败");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.current = 1;
  fetchAdmins();
}

function handleReset() {
  searchForm.username = "";
  searchForm.status = "";
  pagination.current = 1;
  fetchAdmins();
}

function handleAdd() {
  resetAddForm();
  addDialogVisible.value = true;
}

function handleEdit(row: AdminApi.AdminItem) {
  currentEditId.value = row.id;
  currentEditAdmin.value = { ...row, switch_google2fa: Number((row as any).switch_google2fa ?? (row as any).switchGoogle2Fa ?? 0) } as AdminApi.AdminItem;
  editForm.username = row.username;
  editForm.password = "";
  editForm.nickname = row.nickname;
  editForm.role_id = Number((row as any).role) || DEFAULT_ROLE_ID;
  editForm.status = Number(row.status);
  editDialogVisible.value = true;
}

async function handleDelete(row: AdminApi.AdminItem) {
  try {
    await ElMessageBox.confirm(`确认删除管理员【${row.username}】吗？`, "提示", {
      type: "warning",
    });

    await deleteAdminApi({ id: row.id });
    ElMessage.success("删除成功");
    await fetchAdmins();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(error?.message || "删除失败");
    }
  }
}

async function submitAdd() {
  if (!addForm.username || !addForm.password || !addForm.nickname || !addForm.role) {
    ElMessage.warning("请完整填写新增信息");
    return;
  }

  submitting.value = true;
  try {
    await createAdminApi({
      username: addForm.username,
      password: addForm.password,
      nickname: addForm.nickname,
      role: Number(addForm.role),
      status: Number(addForm.status),
    });
    ElMessage.success("新增成功");
    addDialogVisible.value = false;
    await fetchAdmins();
  } catch (error: any) {
    ElMessage.error(error?.message || "新增失败");
  } finally {
    submitting.value = false;
  }
}

async function submitEdit() {
  if (!currentEditId.value) {
    ElMessage.warning("缺少管理员ID");
    return;
  }
  if (!editForm.nickname || !editForm.role_id) {
    ElMessage.warning("请完整填写编辑信息");
    return;
  }

  submitting.value = true;
  try {
    await updateAdminApi({
      id: currentEditId.value,
      username: editForm.username,
      nickname: editForm.nickname,
      role_id: Number(editForm.role_id),
      status: Number(editForm.status),
      password: editForm.password || undefined,
    });

    ElMessage.success("保存成功");
    editDialogVisible.value = false;
    await fetchAdmins();
  } catch (error: any) {
    ElMessage.error(error?.message || "保存失败");
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  resetAddForm();
  resetEditForm();
  await fetchRoles();
  await fetchAdmins();
});
</script>

<template>
  <div class="p-4">
    <ElCard>
      <div class="mb-4 flex items-center gap-2 flex-wrap">
        <ElInput v-model="searchForm.username" placeholder="管理员账号" clearable style="width: 220px" />
        <ElSelect v-model="searchForm.status" placeholder="状态" clearable style="width: 160px">
          <ElOption label="启用" value="1" />
          <ElOption label="禁用" value="0" />
        </ElSelect>
        <ElButton type="primary" @click="handleSearch">查询</ElButton>
        <ElButton @click="handleReset">重置</ElButton>
        <ElButton type="success" class="ml-auto" @click="handleAdd">添加管理员</ElButton>
      </div>

      <ElTable :data="tableData" v-loading="loading" border stripe>
        <ElTableColumn prop="id" label="编号" width="80" />
        <ElTableColumn prop="username" label="管理员账号" min-width="160" />
        <ElTableColumn prop="nickname" label="昵称" min-width="140" />
        <ElTableColumn label="角色" min-width="120">
          <template #default="{ row }">{{ roleNameOf(row) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="last_login_ip" label="最后登录IP" min-width="130" />
        <ElTableColumn prop="last_login_time" label="最后登录时间" min-width="170" />
        <ElTableColumn label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="Number(row.status) === 1 ? 'success' : 'danger'">
              {{ Number(row.status) === 1 ? "启用" : "禁用" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <ElButton type="primary" link @click="handleEdit(row)">编辑</ElButton>
            <ElButton type="danger" link @click="handleDelete(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-4 flex justify-end">
        <ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="fetchAdmins"
          @size-change="() => { pagination.current = 1; fetchAdmins(); }"
        />
      </div>
    </ElCard>

    <ElDialog v-model="addDialogVisible" title="新增管理员" width="520px">
      <ElForm label-width="90px">
        <ElFormItem label="账号">
          <ElInput v-model="addForm.username" placeholder="请输入账号" />
        </ElFormItem>
        <ElFormItem label="密码">
          <ElInput v-model="addForm.password" type="password" show-password placeholder="请输入密码" />
        </ElFormItem>
        <ElFormItem label="昵称">
          <ElInput v-model="addForm.nickname" placeholder="请输入昵称" />
        </ElFormItem>
        <ElFormItem label="角色">
          <ElSelect v-model="addForm.role" placeholder="请选择角色" style="width: 100%">
            <ElOption v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElRadioGroup v-model="addForm.status">
            <ElRadio :value="1">启用</ElRadio>
            <ElRadio :value="0">禁用</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="addDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submitAdd">确定</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="editDialogVisible" title="编辑管理员" width="520px">
      <ElForm label-width="90px">
        <ElFormItem label="账号">
          <ElInput v-model="editForm.username" disabled />
        </ElFormItem>
        <ElFormItem label="密码">
          <ElInput v-model="editForm.password" type="password" show-password placeholder="留空不修改" />
        </ElFormItem>
        <ElFormItem label="昵称">
          <ElInput v-model="editForm.nickname" placeholder="请输入昵称" />
        </ElFormItem>
        <ElFormItem label="角色">
          <ElSelect v-model="editForm.role_id" placeholder="请选择角色" style="width: 100%">
            <ElOption v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElRadioGroup v-model="editForm.status">
            <ElRadio :value="1">启用</ElRadio>
            <ElRadio :value="0">禁用</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="Google2FA">
          <div class="flex items-center gap-2">
            <ElTag :type="isGoogle2FABound(currentEditAdmin) ? 'success' : 'info'">
              {{ isGoogle2FABound(currentEditAdmin) ? "已绑定" : "未绑定" }}
            </ElTag>
            <ElButton
              v-if="!isGoogle2FABound(currentEditAdmin)"
              type="warning"
              plain
              size="small"
              :loading="google2FALoading"
              @click="handleOpenGoogle2FA"
            >
              立即绑定
            </ElButton>
          </div>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="editDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submitEdit">保存</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="google2FADialogVisible" title="绑定Google2FA" width="480px" :close-on-click-modal="false">
      <div>
        <div class="mb-2 text-sm text-gray-600">请使用 Google Authenticator 扫描二维码</div>
        <div v-if="google2FAData.qr_url" class="mb-2">
          <img :src="google2FAData.qr_url" alt="google2fa" style="width: 220px; height: 220px" />
        </div>
        <div class="text-xs break-all">Secret: {{ google2FAData.secret }}</div>
        <ElInput v-model="google2FAData.code" class="mt-3" maxlength="6" placeholder="请输入6位验证码" />
      </div>
      <template #footer>
        <ElButton @click="google2FADialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="google2FABindLoading" @click="handleBindGoogle2FA">确认绑定</ElButton>
      </template>
    </ElDialog>

  </div>
</template>
