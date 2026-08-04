<script lang="ts" setup>
import { nextTick, onMounted, reactive, ref } from "vue";

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
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTree,
} from "element-plus";

import {
  createRoleApi,
  deleteRoleApi,
  getPermTreeApi,
  getRoleListApi,
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
      const row = roles.value.find((r) => r.id === form.id);
      await updateRoleApi({
        id: form.id,
        name: form.name,
        remark: form.remark,
        status: form.status ? 1 : 0,
        permissions: row?.permissions || "",
      });
      ElMessage.success("更新成功");
    } else {
      await createRoleApi({ name: form.name, code: form.code, remark: form.remark });
      ElMessage.success("创建成功, 请配置该角色的菜单权限");
    }
    dialogVisible.value = false;
    fetchRoles();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: SystemApi.RoleItem) {
  await ElMessageBox.confirm(`确认删除角色「${row.name}」?`, "提示", { type: "warning" });
  await deleteRoleApi(row.id);
  ElMessage.success("删除成功");
  fetchRoles();
}

// ---------- 权限配置(勾选菜单树) ----------
const permDrawer = ref(false);
const permRole = ref<SystemApi.RoleItem | null>(null);
const permTree = ref<SystemApi.PermNode[]>([]);
const permLoading = ref(false);
const permSaving = ref(false);
const treeRef = ref();
const treeProps = { label: "name", children: "children" };

// 有子节点的 id 集合(回显时只勾叶子, 父级自动半选)
function collectParentIds(nodes: SystemApi.PermNode[], set: Set<number>) {
  for (const n of nodes) {
    if (n.children && n.children.length > 0) {
      set.add(n.id);
      collectParentIds(n.children, set);
    }
  }
  return set;
}

async function openPerms(row: SystemApi.RoleItem) {
  permRole.value = row;
  permDrawer.value = true;
  permLoading.value = true;
  try {
    const res = await getPermTreeApi();
    permTree.value = res.list || [];
    await nextTick();
    const saved = (row.permissions || "")
      .split(",")
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n > 0);
    const parents = collectParentIds(permTree.value, new Set<number>());
    const leafChecked = saved.filter((id) => !parents.has(id));
    treeRef.value?.setCheckedKeys(leafChecked);
  } finally {
    permLoading.value = false;
  }
}

async function savePerms() {
  if (!permRole.value) return;
  const checked: number[] = treeRef.value?.getCheckedKeys() || [];
  const half: number[] = treeRef.value?.getHalfCheckedKeys() || [];
  const permissions = [...half, ...checked].sort((a, b) => a - b).join(",");
  permSaving.value = true;
  try {
    await updateRoleApi({
      id: permRole.value.id,
      name: permRole.value.name,
      remark: permRole.value.remark,
      status: permRole.value.status,
      permissions,
    });
    ElMessage.success("权限已保存(实时生效)");
    permDrawer.value = false;
    fetchRoles();
  } finally {
    permSaving.value = false;
  }
}

onMounted(fetchRoles);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex items-center">
        <span class="font-medium">角色列表</span>
        <span class="text-muted-foreground ml-2 text-xs">
          superadmin 为系统保留超管, 拥有全部权限; 其余角色勾选菜单即分配「菜单+接口」权限
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
        <ElTableColumn label="已配权限数" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.code === 'superadmin'" class="text-muted-foreground text-xs">全部</span>
            <span v-else>{{ (row.permissions || "").split(",").filter(Boolean).length }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="remark" label="备注" min-width="140" show-overflow-tooltip />
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

    <ElDrawer
      v-model="permDrawer"
      :title="`权限配置 — ${permRole?.name}(${permRole?.code})`"
      size="440px"
    >
      <div class="text-muted-foreground mb-3 text-xs">
        勾选菜单即授予「菜单显示 + 该菜单下的接口权限」; 保存后实时生效, 该角色下管理员刷新页面即可看到新菜单。
      </div>
      <ElTree
        ref="treeRef"
        v-loading="permLoading"
        :data="permTree"
        :props="treeProps"
        node-key="id"
        show-checkbox
        default-expand-all
      >
        <template #default="{ data }">
          <span class="flex items-center gap-1">
            <span>{{ data.name }}</span>
            <ElTag v-if="data.isMenu === 0" size="small" type="warning">
              {{ data.method }}
            </ElTag>
            <ElTag v-else-if="data.hideInMenu === 1" size="small" type="info">隐藏页</ElTag>
          </span>
        </template>
      </ElTree>
      <div class="mt-4 flex justify-end gap-2">
        <ElButton @click="permDrawer = false">取消</ElButton>
        <ElButton type="primary" :loading="permSaving" @click="savePerms">保存权限</ElButton>
      </div>
    </ElDrawer>
  </div>
</template>
