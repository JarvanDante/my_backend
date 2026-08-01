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
  ElDatePicker,
} from "element-plus";
import {
  getActivityListApi,
  createActivityApi,
  updateActivityApi,
  deleteActivityApi,
  ActivityApi,
} from "#/api/core/activity";

// 状态选项
const statusOptions = [
  { label: "禁用", value: 0 },
  { label: "启用", value: 1 },
];

// 列表数据
const tableData = ref<ActivityApi.ActivityItem[]>([]);
const loading = ref(false);
const total = ref(0);

// 分页参数
const pagination = ref({
  page: 1,
  size: 20,
});

// 搜索参数
const searchForm = ref({
  code: "",
  name: "",
  activity_type: "",
  status: undefined as number | undefined,
});

// 对话框
const dialogVisible = ref(false);
const dialogTitle = ref("");
const isEdit = ref(false);

// 表单数据
const formData = ref<
  ActivityApi.CreateActivityParams | ActivityApi.UpdateActivityParams
>({
  name: "",
  code: "",
  activity_type: "",
  description: "",
  start_time: "",
  end_time: "",
  fixed_params: "{}",
  status: 1,
  uri: "",
  table: "",
});

const formRules = {
  name: [{ required: true, message: "请输入模板名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入模板编码", trigger: "blur" }],
  activity_type: [
    { required: true, message: "请输入活动类型", trigger: "blur" },
  ],
};

const formRef = ref();

// 加载列表数据
const loadData = async () => {
  try {
    loading.value = true;
    const params: ActivityApi.GetActivityListParams = {
      ...searchForm.value,
      page: pagination.value.page,
      size: pagination.value.size,
    };

    const response = await getActivityListApi(params);
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
    code: "",
    name: "",
    activity_type: "",
    status: undefined,
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
  dialogTitle.value = "新增活动";
  formData.value = {
    name: "",
    code: "",
    activity_type: "",
    description: "",
    start_time: "",
    end_time: "",
    fixed_params: "{}",
    status: 1,
    uri: "",
    table: "",
  };
  dialogVisible.value = true;
};

// 打开编辑对话框
const handleEdit = (row: ActivityApi.ActivityItem) => {
  isEdit.value = true;
  dialogTitle.value = "编辑活动";
  formData.value = {
    id: row.id,
    name: row.name,
    code: row.code,
    activity_type: row.activity_type,
    description: row.description,
    start_time: row.start_time,
    end_time: row.end_time,
    fixed_params: row.fixed_params || "{}",
    status: row.status,
    uri: row.uri,
    table: row.table,
  };
  dialogVisible.value = true;
};

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value?.validate();

    const payload = {
      ...formData.value,
      fixed_params: formData.value.fixed_params || "{}",
    };

    loading.value = true;
    if (isEdit.value) {
      await updateActivityApi(payload as ActivityApi.UpdateActivityParams);
    } else {
      await createActivityApi(payload as ActivityApi.CreateActivityParams);
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
const handleDelete = async (row: ActivityApi.ActivityItem) => {
  try {
    await ElMessageBox.confirm(`确定要删除活动"${row.name}"吗？`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    loading.value = true;
    await deleteActivityApi({ id: row.id });

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

// 页面加载
onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="p-4">
    <!-- 搜索栏 -->
    <ElCard class="mb-4" shadow="never">
      <div class="flex items-center gap-3 mb-4 flex-wrap">
        <ElInput
          v-model="searchForm.code"
          placeholder="模板编码"
          clearable
          style="width: 140px"
        />

        <ElInput
          v-model="searchForm.name"
          placeholder="模板名称"
          clearable
          style="width: 160px"
        />

        <ElInput
          v-model="searchForm.activity_type"
          placeholder="活动类型"
          clearable
          style="width: 140px"
        />

        <ElSelect
          v-model="searchForm.status"
          placeholder="状态"
          clearable
          style="width: 110px"
        >
          <ElOption
            v-for="item in statusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </ElSelect>

        <ElButton type="primary" @click="handleSearch">搜索</ElButton>
        <ElButton @click="handleReset">重置</ElButton>
        <ElButton type="success" @click="handleAdd">新增活动</ElButton>
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
        <ElTableColumn prop="id" label="ID" width="60" align="center" />

        <ElTableColumn prop="name" label="模板名称" width="140" />

        <ElTableColumn
          prop="code"
          label="模板编码"
          width="120"
          show-overflow-tooltip
        />

        <ElTableColumn prop="activity_type" label="活动类型" width="100" />

        <ElTableColumn prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? "启用" : "禁用" }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="table" label="表名" width="130" show-overflow-tooltip />

        <ElTableColumn
          prop="uri"
          label="URI"
          min-width="160"
          show-overflow-tooltip
        />

        <ElTableColumn
          prop="description"
          label="描述"
          min-width="140"
          show-overflow-tooltip
        />

        <ElTableColumn
          prop="fixed_params"
          label="固定参数"
          min-width="180"
          show-overflow-tooltip
        />

        <ElTableColumn
          prop="start_time"
          label="开始时间"
          width="160"
          align="center"
        >
          <template #default="{ row }">
            {{ row.start_time || "-" }}
          </template>
        </ElTableColumn>

        <ElTableColumn
          prop="end_time"
          label="结束时间"
          width="160"
          align="center"
        >
          <template #default="{ row }">
            {{ row.end_time || "-" }}
          </template>
        </ElTableColumn>

        <ElTableColumn
          prop="created_at"
          label="创建时间"
          width="160"
          align="center"
        />

        <ElTableColumn label="操作" width="140" align="center" fixed="right">
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
      top="2vh"
      class="activity-dialog"
    >
      <ElForm
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <ElFormItem label="模板名称" prop="name">
          <ElInput v-model="formData.name" placeholder="请输入模板名称" />
        </ElFormItem>

        <ElFormItem label="模板编码" prop="code">
          <ElInput v-model="formData.code" placeholder="请输入模板编码" />
        </ElFormItem>

        <ElFormItem label="活动类型" prop="activity_type">
          <ElInput
            v-model="formData.activity_type"
            placeholder="请输入活动类型"
          />
        </ElFormItem>

        <ElFormItem label="表名">
          <ElInput v-model="formData.table" placeholder="请输入表名" />
        </ElFormItem>

        <ElFormItem label="活动URI">
          <ElInput v-model="formData.uri" placeholder="请输入活动URI" />
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

        <ElFormItem label="开始时间">
          <ElDatePicker
            v-model="formData.start_time"
            type="datetime"
            placeholder="选择开始时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </ElFormItem>

        <ElFormItem label="结束时间">
          <ElDatePicker
            v-model="formData.end_time"
            type="datetime"
            placeholder="选择结束时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </ElFormItem>

        <ElFormItem label="模板描述">
          <ElInput
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入模板描述"
          />
        </ElFormItem>

        <ElFormItem label="固定参数">
          <ElInput
            v-model="formData.fixed_params"
            type="textarea"
            :rows="4"
            placeholder='请输入JSON，例如：{"bonus_amount":80,"min_deposit":200}'
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

:deep(.activity-dialog .el-dialog) {
  margin-top: 2vh;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

:deep(.activity-dialog .el-dialog__body) {
  overflow: auto;
  padding: 10px 16px 8px;
}

:deep(.activity-dialog .el-form-item) {
  margin-bottom: 12px;
}

:deep(.activity-dialog .el-form-item__label) {
  padding-right: 8px;
}

:deep(.activity-dialog .el-input__wrapper),
:deep(.activity-dialog .el-textarea__inner) {
  padding: 6px 10px;
}

:deep(.activity-dialog .el-dialog__footer) {
  margin-top: auto;
  padding: 8px 16px 12px;
  background: #fff;
  box-shadow: 0 -1px 0 rgba(0, 0, 0, 0.06);
}
</style>
