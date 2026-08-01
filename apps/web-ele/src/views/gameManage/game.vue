<script lang="ts" setup>
import { ref, onMounted } from "vue";
import {
  ElMessage,
  ElMessageBox,
  ElButton,
  ElCard,
  ElTable,
  ElTableColumn,
  ElPagination,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElTag,
} from "element-plus";
import {
  getGameListApi,
  createGameApi,
  updateGameApi,
  deleteGameApi,
  GameApi,
} from "#/api/core/game";

// 游戏类型选项
const gameTypeOptions = [
  { label: "体育", value: 1 },
  { label: "彩票", value: 2 },
  { label: "真人", value: 3 },
  { label: "电子游戏", value: 4 },
];

// 状态选项
const statusOptions = [
  { label: "禁用", value: 0 },
  { label: "启用", value: 1 },
];

// 列表数据
const tableData = ref<GameApi.GameItem[]>([]);
const loading = ref(false);
const total = ref(0);

// 分页参数
const pagination = ref({
  page: 1,
  size: 20,
});

// 搜索参数
const searchForm = ref({
  type: undefined as number | undefined,
  status: undefined as number | undefined,
  platform: "",
});

// 对话框
const dialogVisible = ref(false);
const dialogTitle = ref("");
const isEdit = ref(false);

// 表单数据
const formData = ref<GameApi.CreateGameParams | GameApi.UpdateGameParams>({
  type: 1,
  name: "",
  platform: "",
  code: "",
  image_code: "",
  status: 1,
  db_name: "",
  remark: "",
  api_id: "",
  api_key: "",
  api_url: "",
});

const formRules = {
  type: [{ required: true, message: "请选择游戏类型", trigger: "change" }],
  name: [{ required: true, message: "请输入游戏名称", trigger: "blur" }],
  platform: [{ required: true, message: "请输入平台标识", trigger: "blur" }],
  code: [{ required: true, message: "请输入游戏标识", trigger: "blur" }],
};

const formRef = ref();

// 加载列表数据
const loadData = async () => {
  try {
    loading.value = true;
    const params: GameApi.GetGameListParams = {
      ...searchForm.value,
      page: pagination.value.page,
      size: pagination.value.size,
    };

    const response = await getGameListApi(params);
    tableData.value = response.list || [];
    total.value = response.total || 0;
  } catch (error) {
    console.error("加载数据失败:", error);
    ElMessage.error("加载数据失败");
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = () => {
  pagination.value.page = 1;
  loadData();
};

// 重置搜索
const handleReset = () => {
  searchForm.value = {
    type: undefined,
    status: undefined,
    platform: "",
  };
  pagination.value.page = 1;
  loadData();
};

// 分页变化
const handlePageChange = (page: number) => {
  pagination.value.page = page;
  loadData();
};

const handleSizeChange = (size: number) => {
  pagination.value.size = size;
  pagination.value.page = 1;
  loadData();
};

// 打开新增对话框
const handleAdd = () => {
  isEdit.value = false;
  dialogTitle.value = "新增游戏";
  formData.value = {
    type: 1,
    name: "",
    platform: "",
    code: "",
    image_code: "",
    status: 1,
    db_name: "",
    remark: "",
    api_id: "",
    api_key: "",
    api_url: "",
  };
  dialogVisible.value = true;
};

// 打开编辑对话框
const handleEdit = (row: GameApi.GameItem) => {
  isEdit.value = true;
  dialogTitle.value = "编辑游戏";
  formData.value = {
    id: row.id,
    type: row.type,
    name: row.name,
    platform: row.platform,
    code: row.code,
    image_code: row.image_code,
    status: row.status,
    db_name: row.db_name,
    remark: row.remark,
    api_id: row.api_id,
    api_key: row.api_key,
    api_url: row.api_url,
  };
  dialogVisible.value = true;
};

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value?.validate();

    loading.value = true;
    let response;
    if (isEdit.value) {
      response = await updateGameApi(
        formData.value as GameApi.UpdateGameParams,
      );
    } else {
      response = await createGameApi(
        formData.value as GameApi.CreateGameParams,
      );
    }

    ElMessage.success(isEdit.value ? "更新成功" : "创建成功");
    dialogVisible.value = false;
    loadData();
  } catch (error) {
    console.error("提交失败:", error);
  } finally {
    loading.value = false;
  }
};

// 删除
const handleDelete = async (row: GameApi.GameItem) => {
  try {
    await ElMessageBox.confirm(`确定要删除游戏"${row.name}"吗？`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    loading.value = true;
    const response = await deleteGameApi({ id: row.id });

    ElMessage.success("删除成功");
    loadData();
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除失败:", error);
      ElMessage.error("删除失败");
    }
  } finally {
    loading.value = false;
  }
};

// 获取游戏类型文本
const getGameTypeText = (type: number) => {
  const option = gameTypeOptions.find((item) => item.value === type);
  return option?.label || "-";
};

// 获取游戏类型标签类型
const getGameTypeTagType = (type: number) => {
  const types: Record<number, any> = {
    1: "primary",
    2: "success",
    3: "warning",
    4: "danger",
  };
  return types[type] || "";
};

// 页面加载
onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="p-4">
    <!-- 搜索栏 -->
    <ElCard class="mb-4" shadow="never">
      <div class="flex items-center gap-4 mb-4">
        <ElSelect
          v-model="searchForm.type"
          placeholder="游戏类型"
          clearable
          style="width: 150px"
        >
          <ElOption
            v-for="item in gameTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </ElSelect>

        <ElSelect
          v-model="searchForm.status"
          placeholder="状态"
          clearable
          style="width: 120px"
        >
          <ElOption
            v-for="item in statusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </ElSelect>

        <ElInput
          v-model="searchForm.platform"
          placeholder="平台标识"
          clearable
          style="width: 200px"
        />

        <ElButton type="primary" @click="handleSearch">搜索</ElButton>
        <ElButton @click="handleReset">重置</ElButton>
        <ElButton type="success" @click="handleAdd">新增游戏</ElButton>
      </div>
    </ElCard>

    <!-- 表格 -->
    <ElCard shadow="never">
      <ElTable
        :data="tableData"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
      >
        <ElTableColumn prop="id" label="ID" width="80" align="center" />

        <ElTableColumn prop="type" label="类型" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="getGameTypeTagType(row.type)" size="small">
              {{ getGameTypeText(row.type) }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="name" label="游戏名称" width="150" />

        <ElTableColumn prop="platform" label="平台标识" width="120" />

        <ElTableColumn prop="code" label="游戏标识" width="150" />

        <ElTableColumn prop="image_code" label="图片标识" width="120" />

        <ElTableColumn prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? "启用" : "禁用" }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="db_name" label="数据表名称" width="150" />

        <ElTableColumn prop="api_id" label="API ID" width="120" />

        <ElTableColumn
          prop="api_key"
          label="API Key"
          width="150"
          show-overflow-tooltip
        />

        <ElTableColumn
          prop="api_url"
          label="API URL"
          width="200"
          show-overflow-tooltip
        />

        <ElTableColumn prop="remark" label="备注" min-width="120" />

        <ElTableColumn
          prop="created_at"
          label="创建时间"
          width="180"
          align="center"
        />

        <ElTableColumn label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <ElButton type="primary" size="small" @click="handleEdit(row)">
              编辑
            </ElButton>
            <ElButton type="danger" size="small" @click="handleDelete(row)">
              删除
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <!-- 分页 -->
      <div class="flex justify-end mt-4">
        <ElPagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </ElCard>

    <!-- 新增/编辑对话框 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
    >
      <ElForm
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <ElFormItem label="游戏类型" prop="type">
          <ElSelect v-model="formData.type" placeholder="请选择游戏类型">
            <ElOption
              v-for="item in gameTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="游戏名称" prop="name">
          <ElInput v-model="formData.name" placeholder="请输入游戏名称" />
        </ElFormItem>

        <ElFormItem label="平台标识" prop="platform">
          <ElInput v-model="formData.platform" placeholder="请输入平台标识" />
        </ElFormItem>

        <ElFormItem label="游戏标识" prop="code">
          <ElInput v-model="formData.code" placeholder="请输入游戏标识" />
        </ElFormItem>

        <ElFormItem label="图片标识">
          <ElInput v-model="formData.image_code" placeholder="请输入图片标识" />
        </ElFormItem>

        <ElFormItem label="状态">
          <ElSelect v-model="formData.status" placeholder="请选择状态">
            <ElOption
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="数据表名称">
          <ElInput v-model="formData.db_name" placeholder="请输入数据表名称" />
        </ElFormItem>

        <ElFormItem label="API ID">
          <ElInput v-model="formData.api_id" placeholder="请输入API ID" />
        </ElFormItem>

        <ElFormItem label="API Key">
          <ElInput v-model="formData.api_key" placeholder="请输入API Key" />
        </ElFormItem>

        <ElFormItem label="API URL">
          <ElInput v-model="formData.api_url" placeholder="请输入API URL" />
        </ElFormItem>

        <ElFormItem label="备注">
          <ElInput
            v-model="formData.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit" :loading="loading">
          确定
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped lang="scss">
.el-table {
  .el-table__cell {
    padding: 12px 0;
  }
}
</style>
