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
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import {
  createPermApi,
  deletePermApi,
  getPermTreeApi,
  type SystemApi,
  updatePermApi,
} from "#/api/core/system";

defineOptions({ name: "SystemPermission" });

const loading = ref(false);
const tree = ref<SystemApi.PermNode[]>([]);

async function fetchTree() {
  loading.value = true;
  try {
    const res = await getPermTreeApi();
    tree.value = res.list || [];
  } finally {
    loading.value = false;
  }
}

// ---------- 节点 CRUD ----------
const dialogVisible = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
const parentName = ref("根节点");
const form = reactive({
  id: 0,
  parentId: 0,
  name: "",
  routeUrl: "",
  component: "",
  method: "GET",
  icon: "",
  isMenu: 1,
  hideInMenu: false,
  affixTab: false,
  activePath: "",
  sort: 0,
  status: true,
});
const rules = {
  name: [{ required: true, message: "名称必填", trigger: "blur" }],
};
const methodOptions = ["GET", "POST", "PUT", "DELETE", "*"];

function resetForm() {
  Object.assign(form, {
    id: 0,
    parentId: 0,
    name: "",
    routeUrl: "",
    component: "",
    method: "GET",
    icon: "",
    isMenu: 1,
    hideInMenu: false,
    affixTab: false,
    activePath: "",
    sort: 0,
    status: true,
  });
}

function openCreateRoot() {
  resetForm();
  isEdit.value = false;
  parentName.value = "根节点(顶级菜单)";
  dialogVisible.value = true;
}

function openCreateChild(row: SystemApi.PermNode) {
  resetForm();
  isEdit.value = false;
  form.parentId = row.id;
  // 挂在菜单下的默认新建接口权限, 更顺手
  form.isMenu = row.isMenu === 1 ? 0 : 1;
  parentName.value = row.name;
  dialogVisible.value = true;
}

function openEdit(row: SystemApi.PermNode) {
  isEdit.value = true;
  parentName.value = row.parentId === 0 ? "根节点(顶级菜单)" : `#${row.parentId}`;
  Object.assign(form, {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    routeUrl: row.routeUrl,
    component: row.component,
    method: row.method || "GET",
    icon: row.icon,
    isMenu: row.isMenu,
    hideInMenu: row.hideInMenu === 1,
    affixTab: row.affixTab === 1,
    activePath: row.activePath,
    sort: row.sort,
    status: row.status === 1,
  });
  dialogVisible.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  const payload: SystemApi.PermInput = {
    parentId: form.parentId,
    name: form.name,
    routeUrl: form.routeUrl,
    component: form.isMenu === 1 ? form.component : "",
    method: form.isMenu === 0 ? form.method : "",
    icon: form.icon,
    isMenu: form.isMenu,
    hideInMenu: form.hideInMenu ? 1 : 0,
    affixTab: form.affixTab ? 1 : 0,
    activePath: form.activePath,
    sort: form.sort,
    status: form.status ? 1 : 0,
  };
  saving.value = true;
  try {
    if (isEdit.value) {
      await updatePermApi({ ...payload, id: form.id });
      ElMessage.success("更新成功");
    } else {
      await createPermApi(payload);
      ElMessage.success("创建成功");
    }
    dialogVisible.value = false;
    fetchTree();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: SystemApi.PermNode) {
  await ElMessageBox.confirm(
    `确认删除「${row.name}」? 已勾选该权限的角色需重新保存权限。`,
    "提示",
    { type: "warning" }
  );
  await deletePermApi(row.id);
  ElMessage.success("删除成功");
  fetchTree();
}

onMounted(fetchTree);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex items-center">
        <span class="font-medium">菜单 / 接口权限树</span>
        <span class="text-muted-foreground ml-2 text-xs">
          菜单节点驱动侧边栏与路由; 接口权限节点挂在菜单下, 服务端按其路径+方法强制校验
        </span>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreateRoot">新建顶级菜单</ElButton>
      </div>

      <ElTable
        v-loading="loading"
        :data="tree"
        row-key="id"
        border
        default-expand-all
        :tree-props="{ children: 'children' }"
      >
        <ElTableColumn prop="name" label="名称" min-width="200" />
        <ElTableColumn label="类型" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="row.isMenu === 1 ? 'success' : 'warning'" size="small">
              {{ row.isMenu === 1 ? "菜单" : "接口" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="routeUrl" label="路由/接口路径" min-width="230" show-overflow-tooltip />
        <ElTableColumn prop="component" label="组件" min-width="180" show-overflow-tooltip />
        <ElTableColumn prop="method" label="方法" width="80" align="center">
          <template #default="{ row }">
            <ElTag v-if="row.isMenu === 0" size="small" type="info">{{ row.method }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="icon" label="图标" width="170" show-overflow-tooltip />
        <ElTableColumn prop="sort" label="排序" width="70" align="center" />
        <ElTableColumn label="状态" width="80" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? "启用" : "禁用" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openCreateChild(row)">加子级</ElButton>
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton link type="danger" @click="handleDelete(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <ElDialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑节点' : `新建节点(上级: ${parentName})`"
      width="560px"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="110px">
        <ElFormItem label="类型">
          <ElRadioGroup v-model="form.isMenu">
            <ElRadioButton :value="1">菜单</ElRadioButton>
            <ElRadioButton :value="0">接口权限</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="名称" prop="name">
          <ElInput v-model="form.name" placeholder="如: 商户管理 / 商户列表" />
        </ElFormItem>
        <ElFormItem :label="form.isMenu === 1 ? '前端路由' : '接口路径'">
          <ElInput
            v-model="form.routeUrl"
            :placeholder="form.isMenu === 1 ? '如 /merchant; 子菜单可用相对路径如 role' : '如 /manage/merchants/{id}'"
          />
        </ElFormItem>
        <template v-if="form.isMenu === 1">
          <ElFormItem label="组件路径">
            <ElInput v-model="form.component" placeholder="相对 views, 如 merchant/index; 目录留空" />
          </ElFormItem>
          <ElFormItem label="图标">
            <ElInput v-model="form.icon" placeholder="如 lucide:store" />
          </ElFormItem>
          <ElFormItem label="隐藏菜单">
            <ElSwitch v-model="form.hideInMenu" />
            <span class="text-muted-foreground ml-2 text-xs">是路由但不显示在侧边栏(如详情页)</span>
          </ElFormItem>
          <ElFormItem v-if="form.hideInMenu" label="高亮菜单">
            <ElInput v-model="form.activePath" placeholder="如 /site(隐藏页激活时高亮的菜单)" />
          </ElFormItem>
          <ElFormItem label="固定标签">
            <ElSwitch v-model="form.affixTab" />
          </ElFormItem>
        </template>
        <template v-else>
          <ElFormItem label="请求方法">
            <ElSelect v-model="form.method" style="width: 140px">
              <ElOption v-for="m in methodOptions" :key="m" :label="m" :value="m" />
            </ElSelect>
          </ElFormItem>
        </template>
        <ElFormItem label="排序">
          <ElInputNumber v-model="form.sort" :min="-99" :max="999" />
        </ElFormItem>
        <ElFormItem label="状态">
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
