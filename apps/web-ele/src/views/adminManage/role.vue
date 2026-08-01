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
  createRoleApi,
  deleteRoleApi,
  getRolesApi,
  type RoleApi,
  updateRoleApi,
} from "#/api/core/role";

const loading = ref(false);
const tableData = ref<RoleApi.RoleItem[]>([]);

const searchForm = reactive({
  name: "",
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

const addForm = reactive({
  name: "",
  permissions: "",
  status: 1,
});

const editForm = reactive({
  name: "",
  permissions: "",
  status: 1,
});

function resetAddForm() {
  addForm.name = "";
  addForm.permissions = "";
  addForm.status = 1;
}

function resetEditForm() {
  editForm.name = "";
  editForm.permissions = "";
  editForm.status = 1;
}

async function fetchRoles() {
  loading.value = true;
  try {
    const response = await getRolesApi({
      page: pagination.current,
      size: pagination.pageSize,
      name: searchForm.name || "",
      status: searchForm.status || "",
    });

    tableData.value = response.list || [];
    pagination.total = (response as any).total ?? (response as any).count ?? 0;
  } catch (error: any) {
    ElMessage.error(error?.message || "获取角色列表失败");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.current = 1;
  fetchRoles();
}

function handleReset() {
  searchForm.name = "";
  searchForm.status = "";
  pagination.current = 1;
  fetchRoles();
}

function handleAdd() {
  resetAddForm();
  addDialogVisible.value = true;
}

function handleEdit(row: RoleApi.RoleItem) {
  currentEditId.value = row.id;
  editForm.name = row.name;
  editForm.permissions = row.permissions || "";
  editForm.status = Number(row.status);
  editDialogVisible.value = true;
}

async function handleDelete(row: RoleApi.RoleItem) {
  try {
    await ElMessageBox.confirm(`确认删除角色【${row.name}】吗？`, "提示", { type: "warning" });
    await deleteRoleApi({ id: row.id });
    ElMessage.success("删除成功");
    await fetchRoles();
  } catch (error: any) {
    if (error !== "cancel") ElMessage.error(error?.message || "删除失败");
  }
}

async function submitAdd() {
  if (!addForm.name) {
    ElMessage.warning("请输入角色名称");
    return;
  }

  submitting.value = true;
  try {
    await createRoleApi({
      name: addForm.name,
      permissions: addForm.permissions,
      status: Number(addForm.status),
    });
    ElMessage.success("新增成功");
    addDialogVisible.value = false;
    await fetchRoles();
  } catch (error: any) {
    ElMessage.error(error?.message || "新增失败");
  } finally {
    submitting.value = false;
  }
}

async function submitEdit() {
  if (!currentEditId.value) {
    ElMessage.warning("缺少角色ID");
    return;
  }
  if (!editForm.name) {
    ElMessage.warning("请输入角色名称");
    return;
  }

  submitting.value = true;
  try {
    await updateRoleApi({
      id: currentEditId.value,
      name: editForm.name,
      permissions: editForm.permissions,
      status: Number(editForm.status),
    });
    ElMessage.success("保存成功");
    editDialogVisible.value = false;
    await fetchRoles();
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
});
</script>

<template>
  <div class="p-4">
    <ElCard>
      <div class="mb-4 flex items-center gap-2 flex-wrap">
        <ElInput v-model="searchForm.name" placeholder="角色名称" clearable style="width: 220px" />
        <ElSelect v-model="searchForm.status" placeholder="状态" clearable style="width: 160px">
          <ElOption label="启用" value="1" />
          <ElOption label="禁用" value="0" />
        </ElSelect>
        <ElButton type="primary" @click="handleSearch">查询</ElButton>
        <ElButton @click="handleReset">重置</ElButton>
        <ElButton type="success" class="ml-auto" @click="handleAdd">添加角色</ElButton>
      </div>

      <ElTable :data="tableData" v-loading="loading" border stripe>
        <ElTableColumn prop="id" label="编号" width="80" />
        <ElTableColumn prop="name" label="角色名称" min-width="160" />
        <ElTableColumn prop="permissions" label="权限节点ID(逗号分隔)" min-width="260" show-overflow-tooltip />
        <ElTableColumn prop="created_at" label="创建时间" min-width="170" />
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
          @current-change="fetchRoles"
          @size-change="() => { pagination.current = 1; fetchRoles(); }"
        />
      </div>
    </ElCard>

    <ElDialog v-model="addDialogVisible" title="新增角色" width="560px">
      <ElForm label-width="130px">
        <ElFormItem label="角色名称">
          <ElInput v-model="addForm.name" placeholder="请输入角色名称" />
        </ElFormItem>
        <ElFormItem label="权限节点ID">
          <ElInput v-model="addForm.permissions" placeholder="例如：1,2,3,10" />
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

    <ElDialog v-model="editDialogVisible" title="编辑角色" width="560px">
      <ElForm label-width="130px">
        <ElFormItem label="角色名称">
          <ElInput v-model="editForm.name" placeholder="请输入角色名称" />
        </ElFormItem>
        <ElFormItem label="权限节点ID">
          <ElInput v-model="editForm.permissions" placeholder="例如：1,2,3,10" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElRadioGroup v-model="editForm.status">
            <ElRadio :value="1">启用</ElRadio>
            <ElRadio :value="0">禁用</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="editDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submitEdit">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
