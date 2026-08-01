<script lang="ts" setup>
import { ref, reactive, onMounted } from "vue";
import {
  ElMessage,
  ElTable,
  ElTableColumn,
  ElPagination,
  ElButton,
  ElCard,
  ElInput,
  ElSelect,
  ElOption,
  ElTag,
  ElMessageBox,
  ElDialog,
  ElForm,
  ElFormItem,
} from "element-plus";
import {
  getDomainListApi,
  createDomainApi,
  updateDomainApi,
  deleteDomainApi,
  getDomainTypeOptionsApi,
  getSiteOptionsApi,
  type DomainApi,
} from "#/api/core/domain";

// 表格数据
const tableData = ref<DomainApi.DomainItem[]>([]);
const loading = ref(false);

// 分页参数
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  pageSizes: [10, 20, 50, 100],
});

// 搜索表单数据
const searchForm = reactive({
  site_code: "",
  domain_type: "" as string | number,
  status: 1 as string | number,
});

// 弹窗相关
const dialogVisible = ref(false);
const dialogTitle = ref("");
const isEdit = ref(false);

// 表单数据
const formData = reactive({
  id: 0,
  site_code: "",
  domain: "",
  domain_type: "" as string | number,
  status: 1,
});

// 选项数据
const domainTypeOptions = ref<DomainApi.OptionItem[]>([]);
const siteOptions = ref<DomainApi.OptionItem[]>([]);
const statusOptions = [
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 },
];
const searchStatusOptions = [
  { label: "全部", value: "" },
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 },
];

// 表单验证规则
const formRules = {
  site_code: [{ required: true, message: "请选择站点", trigger: "change" }],
  domain: [{ required: true, message: "请输入域名", trigger: "blur" }],
  domain_type: [
    { required: true, message: "请选择域名类型", trigger: "change" },
  ],
  status: [{ required: true, message: "请选择状态", trigger: "change" }],
};

// 获取域名列表
async function fetchDomainList() {
  loading.value = true;
  try {
    const params: DomainApi.DomainListParams = {
      page: pagination.current,
      size: pagination.pageSize,
    };

    if (searchForm.site_code) {
      params.site_code = searchForm.site_code;
    }
    if (searchForm.domain_type && searchForm.domain_type !== "") {
      params.domain_type = Number(searchForm.domain_type);
    }
    if (searchForm.status !== "" && searchForm.status !== undefined) {
      params.status = Number(searchForm.status);
    }

    const response = await getDomainListApi(params);
    tableData.value = response.list || [];
    pagination.total = response.total || 0;
  } catch (error) {
    console.error("获取域名列表失败:", error);
    ElMessage.error("获取域名列表失败");
  } finally {
    loading.value = false;
  }
}

// 获取选项数据
async function fetchOptions() {
  try {
    const [domainTypeRes, siteRes] = await Promise.all([
      getDomainTypeOptionsApi(),
      getSiteOptionsApi(),
    ]);
    domainTypeOptions.value = domainTypeRes.list || [];
    siteOptions.value = siteRes.list || [];
  } catch (error) {
    console.error("获取选项数据失败:", error);
  }
}

// 搜索处理
function handleSearch() {
  pagination.current = 1;
  fetchDomainList();
}

// 重置搜索
function handleReset() {
  searchForm.site_code = "";
  searchForm.domain_type = "";
  searchForm.status = 1;
  pagination.current = 1;
  fetchDomainList();
}

// 分页处理
function handleSizeChange(size: number) {
  pagination.pageSize = size;
  pagination.current = 1;
  fetchDomainList();
}

function handleCurrentChange(page: number) {
  pagination.current = page;
  fetchDomainList();
}

// 新增域名
function handleAdd() {
  dialogTitle.value = "新增域名";
  isEdit.value = false;
  resetForm();
  dialogVisible.value = true;
}

// 编辑域名
function handleEdit(row: DomainApi.DomainItem) {
  dialogTitle.value = "编辑域名";
  isEdit.value = true;
  formData.id = row.id;
  formData.site_code = row.site_code;
  formData.domain = row.domain;
  formData.domain_type = row.domain_type;
  formData.status = row.status;
  dialogVisible.value = true;
}

// 删除域名
async function handleDelete(row: DomainApi.DomainItem) {
  try {
    await ElMessageBox.confirm(
      `确定要删除域名 '${row.domain}' 吗？`,
      "删除确认",
      {
        confirmButtonText: "确认",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    await deleteDomainApi(row.id);
    ElMessage.success("删除成功");
    fetchDomainList();
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除域名失败:", error);
      ElMessage.error("删除失败");
    }
  }
}

// 提交表单
async function handleSubmit() {
  try {
    if (isEdit.value) {
      const params: DomainApi.UpdateDomainParams = {
        id: formData.id,
        site_code: formData.site_code,
        domain: formData.domain,
        domain_type: Number(formData.domain_type),
        status: formData.status,
      };
      await updateDomainApi(params);
      ElMessage.success("更新成功");
    } else {
      const params: DomainApi.CreateDomainParams = {
        site_code: formData.site_code,
        domain: formData.domain,
        domain_type: Number(formData.domain_type),
        status: formData.status,
      };
      await createDomainApi(params);
      ElMessage.success("创建成功");
    }

    dialogVisible.value = false;
    fetchDomainList();
  } catch (error) {
    console.error("提交失败:", error);
    ElMessage.error("操作失败");
  }
}

// 重置表单
function resetForm() {
  formData.id = 0;
  formData.site_code = "";
  formData.domain = "";
  formData.domain_type = "";
  formData.status = 1;
}

// 取消弹窗
function handleCancel() {
  dialogVisible.value = false;
  resetForm();
}

// 格式化时间
function formatDateTime(dateTime: string) {
  if (!dateTime) return "-";
  return new Date(dateTime).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// 获取状态标签类型
function getStatusTagType(status: number) {
  return status === 1 ? "success" : "danger";
}

// 获取状态文本
function getStatusText(status: number) {
  return status === 1 ? "启用" : "禁用";
}

// 获取域名类型文本
function getDomainTypeText(domainType: number) {
  const option = domainTypeOptions.value.find(
    (item) => item.value === domainType
  );
  return option ? option.label : domainType.toString();
}

// 获取站点名称
function getSiteName(siteCode: string) {
  const option = siteOptions.value.find((item) => item.value === siteCode);
  return option ? option.label : siteCode;
}

// 页面加载时获取数据
onMounted(() => {
  fetchOptions();
  fetchDomainList();
});
</script>

<template>
  <div class="p-4">
    <!-- 搜索表单 -->
    <ElCard class="mb-4" shadow="never">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600 whitespace-nowrap">站点</span>
          <ElSelect
            v-model="searchForm.site_code"
            placeholder="请选择站点"
            clearable
            style="width: 180px"
          >
            <ElOption
              v-for="option in siteOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </ElSelect>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600 whitespace-nowrap">域名类型</span>
          <ElSelect
            v-model="searchForm.domain_type"
            placeholder="请选择域名类型"
            clearable
            style="width: 150px"
          >
            <ElOption
              v-for="option in domainTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </ElSelect>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600 whitespace-nowrap">状态</span>
          <ElSelect
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 120px"
          >
            <ElOption
              v-for="option in searchStatusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </ElSelect>
        </div>

        <div class="flex items-center gap-2 ml-auto">
          <ElButton @click="handleReset">重置</ElButton>
          <ElButton type="primary" @click="handleSearch">查询</ElButton>
          <ElButton type="success" @click="handleAdd">新增域名</ElButton>
        </div>
      </div>
    </ElCard>

    <!-- 数据表格 -->
    <ElCard shadow="never">
      <ElTable
        :data="tableData"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      >
        <ElTableColumn label="ID" prop="id" width="80" align="center" />
        <ElTableColumn label="站点" prop="site_code" width="120">
          <template #default="{ row }">
            {{ getSiteName(row.site_code) }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          label="域名"
          prop="domain"
          min-width="200"
          show-overflow-tooltip
        />
        <ElTableColumn label="域名类型" prop="domain_type" width="120">
          <template #default="{ row }">
            {{ getDomainTypeText(row.domain_type) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" prop="status" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn
          label="创建时间"
          prop="created_at"
          width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          label="更新时间"
          prop="updated_at"
          width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ formatDateTime(row.updated_at) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <ElButton type="primary" size="small" link @click="handleEdit(row)">
              编辑
            </ElButton>
            <ElButton
              type="danger"
              size="small"
              link
              @click="handleDelete(row)"
            >
              删除
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <!-- 分页 -->
      <div class="flex justify-end mt-4">
        <ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :page-sizes="pagination.pageSizes"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </ElCard>

    <!-- 新增/编辑弹窗 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      :before-close="handleCancel"
    >
      <ElForm
        :model="formData"
        :rules="formRules"
        label-width="100px"
        ref="formRef"
      >
        <ElFormItem label="站点" prop="site_code">
          <ElSelect
            v-model="formData.site_code"
            placeholder="请选择站点"
            style="width: 100%"
          >
            <ElOption
              v-for="option in siteOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="域名" prop="domain">
          <ElInput
            v-model="formData.domain"
            placeholder="请输入域名"
            clearable
          />
        </ElFormItem>

        <ElFormItem label="域名类型" prop="domain_type">
          <ElSelect
            v-model="formData.domain_type"
            placeholder="请选择域名类型"
            style="width: 100%"
          >
            <ElOption
              v-for="option in domainTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="状态" prop="status">
          <ElSelect
            v-model="formData.status"
            placeholder="请选择状态"
            style="width: 100%"
          >
            <ElOption label="启用" :value="1" />
            <ElOption label="禁用" :value="0" />
          </ElSelect>
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="dialog-footer">
          <ElButton @click="handleCancel">取消</ElButton>
          <ElButton type="primary" @click="handleSubmit">确定</ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped lang="scss">
.el-card {
  :deep(.el-card__body) {
    padding: 16px 20px;
  }
}
</style>
