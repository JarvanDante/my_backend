<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElButton,
  ElCard,
  ElDialog,
  ElDrawer,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import {
  addRolePermApi,
  createRoleApi,
  deleteRoleApi,
  delRolePermApi,
  getRoleListApi,
  getRolePermsApi,
  type SystemApi,
  updateRoleApi,
} from "#/api/core/system";

defineOptions({ name: "SystemRole" });

const loading = ref(false);
const roles = ref<SystemApi.RoleItem[]>([]);

async function fetchRoles() {
  loading.value = true;
  try {
    const res = await getRoleListApi();
    roles.value = res.list || [];
  } finally {
    loading.value = false;
  }
}

// ---------- 角色 CRUD ----------
const dialogVisible = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
const form = reactive({ id: 0, name: "", code: "", remark: "", status: true });
const rules = {
  name: [{ required: true, message: "角色名必填", trigger: "blur" }],
  code: [{ required: true, message: "角色码必填", trigger: "blur" }],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, { id: 0, name: "", code: "", remark: "", status: true });
  dialogVisible.value = true;
}

function openEdit(row: SystemApi.RoleItem) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    name: row.name,
    code: row.code,
    remark: row.remark,
    status: row.status === 1,
  });
  dialogVisible.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateRoleApi({
        id: form.id,
        name: form.name,
        remark: form.remark,
        status: form.status ? 1 : 0,
      });
      ElMessage.success("更新成功");
    } else {
      await createRoleApi({ name: form.name, code: form.code, remark: form.remark });
      ElMessage.success("创建成功");
    }
    dialogVisible.value = false;
    fetchRoles();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: SystemApi.RoleItem) {
  await ElMessageBox.confirm(
    `确认删除角色「${row.name}」? 其 Casbin 权限策略将一并清除。`,
    "提示",
    { type: "warning" }
  );
  await deleteRoleApi(row.id);
  ElMessage.success("删除成功");
  fetchRoles();
}

// ---------- 权限配置 ----------
const permDrawer = ref(false);
const permRole = ref<SystemApi.RoleItem | null>(null);
const perms = ref<SystemApi.PermItem[]>([]);
const permLoading = ref(false);
const newPerm = reactive({ path: "", method: "GET" });
const methodOptions = ["GET", "POST", "PUT", "DELETE", "*"];

async function openPerms(row: SystemApi.RoleItem) {
  permRole.value = row;
  permDrawer.value = true;
  loadPerms();
}

async function loadPerms() {
  if (!permRole.value) return;
  permLoading.value = true;
  try {
    const res = await getRolePermsApi(permRole.value.code);
    perms.value = res.list || [];
  } finally {
    permLoading.value = false;
  }
}

async function handleAddPerm() {
  if (!newPerm.path.startsWith("/")) {
    ElMessage.warning("路径须以 / 开头, 如 /manage/merchants");
    return;
  }
  await addRolePermApi(permRole.value!.code, newPerm.path, newPerm.method);
  ElMessage.success("授权成功(实时生效)");
  newPerm.path = "";
  loadPerms();
}

async function handleDelPerm(p: SystemApi.PermItem) {
  await delRolePermApi(permRole.value!.code, p.path, p.method);
  ElMessage.success("已移除");
  loadPerms();
}

onMounted(fetchRoles);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex items-center">
        <span class="font-medium">角色列表</span>
        <span class="text-muted-foreground ml-2 text-xs">
          superadmin 为系统保留超管, 拥有全部权限
        </span>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">创建角色</ElButton>
      </div>

      <ElTable v-loading="loading" :data="roles" border stripe>
        <ElTableColumn prop="id" label="ID" width="60" />
        <ElTableColumn prop="name" label="角色名" width="140" />
        <ElTableColumn prop="code" label="角色码" width="140">
          <template #default="{ row }">
            <ElTag :type="row.code === 'superadmin' ? 'danger' : 'info'" size="small">
              {{ row.code }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="80" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? "启用" : "停用" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="remark" label="备注" min-width="160" show-overflow-tooltip />
        <ElTableColumn label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <template v-if="row.code !== 'superadmin'">
              <ElButton link type="primary" @click="openPerms(row)">权限配置</ElButton>
              <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
              <ElButton link type="danger" @click="handleDelete(row)">删除</ElButton>
            </template>
            <span v-else class="text-muted-foreground text-xs">全部权限, 不可修改</span>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <ElDialog v-model="dialogVisible" :title="isEdit ? '编辑角色' : '创建角色'" width="440px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="80px">
        <ElFormItem label="角色名" prop="name">
          <ElInput v-model="form.name" />
        </ElFormItem>
        <ElFormItem label="角色码" prop="code">
          <ElInput v-model="form.code" :disabled="isEdit" placeholder="如 op, 创建后不可改" />
        </ElFormItem>
        <ElFormItem v-if="isEdit" label="状态">
          <ElSwitch v-model="form.status" active-text="启用" inactive-text="停用" />
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="form.remark" type="textarea" :rows="2" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
      </template>
    </ElDialog>

    <ElDrawer v-model="permDrawer" :title="`权限配置 — ${permRole?.name}(${permRole?.code})`" size="520px">
      <div class="mb-3 flex items-center gap-2">
        <ElInput
          v-model="newPerm.path"
          placeholder="/manage/merchants 或 /manage/sites/:id"
          style="flex: 1"
        />
        <ElSelect v-model="newPerm.method" style="width: 100px">
          <ElOption v-for="m in methodOptions" :key="m" :label="m" :value="m" />
        </ElSelect>
        <ElButton type="primary" @click="handleAddPerm">授权</ElButton>
      </div>
      <div class="text-muted-foreground mb-3 text-xs">
        路径支持 :id 通配(keyMatch2); 方法 * 表示放行全部方法; 增删实时生效, 无需重登。
      </div>
      <ElTable v-loading="permLoading" :data="perms" border size="small">
        <ElTableColumn prop="path" label="路径" min-width="240" />
        <ElTableColumn prop="method" label="方法" width="90" align="center" />
        <ElTableColumn label="操作" width="80" align="center">
          <template #default="{ row }">
            <ElButton link type="danger" @click="handleDelPerm(row)">移除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElDrawer>
  </div>
</template>
