<script lang="ts" setup>
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
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
} from "element-plus";
import {
  getCustomerListApi,
  publishCustomerApi,
  type CustomerApi,
} from "#/api/core/customer";

const router = useRouter();

// 表格数据
const tableData = ref<CustomerApi.CustomerItem[]>([]);
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
  name: "",
  code: "",
  status: undefined as number | undefined,
});

// 状态选项
const statusOptions = [
  { label: "全部", value: undefined },
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 },
];

// 获取客户列表
async function fetchCustomerList() {
  loading.value = true;
  try {
    // 构建请求参数
    const params: CustomerApi.CustomerListParams = {
      page: pagination.current,
      size: pagination.pageSize,
    };

    // 添加搜索条件
    if (searchForm.name) {
      params.name = searchForm.name;
    }
    if (searchForm.code) {
      params.code = searchForm.code;
    }
    if (searchForm.status !== undefined) {
      params.status = searchForm.status;
    }

    console.log("fetchCustomerList - 请求参数:", params);

    const response = await getCustomerListApi(params);

    console.log("fetchCustomerList - 响应数据:", response);

    tableData.value = response.list || [];
    pagination.total = response.total || response.count || 0;
  } catch (error) {
    console.error("获取客户列表失败:", error);
    ElMessage.error("获取客户列表失败");
  } finally {
    loading.value = false;
  }
}

// 搜索处理
function handleSearch() {
  pagination.current = 1;
  fetchCustomerList();
}

// 重置搜索
function handleReset() {
  searchForm.name = "";
  searchForm.code = "";
  searchForm.status = undefined;
  pagination.current = 1;
  fetchCustomerList();
}

// 分页处理
function handleSizeChange(size: number) {
  pagination.pageSize = size;
  pagination.current = 1;
  fetchCustomerList();
}

function handleCurrentChange(page: number) {
  pagination.current = page;
  fetchCustomerList();
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

// // 获取同步状态标签类型
// function getSyncTagType(isSync: number) {
//   return isSync === 1 ? "success" : "warning";
// }

// // 获取同步状态文本
// function getSyncText(isSync: number) {
//   return isSync === 1 ? "已发布同步" : "未发布同步";
// }

// 编辑客户 - 跳转到详情页
function handleEdit(row: CustomerApi.CustomerItem) {
  console.log("跳转到客户详情页:", row);
  router.push(`/customerManage/customerDetail?id=${row.id}`);
}

// 发布客户配置
async function handlePublish(row: CustomerApi.CustomerItem) {
  try {
    await ElMessageBox.confirm(
      `确定要发布客户 '${row.name}' 的配置到Consul吗？`,
      "发布确认",
      {
        confirmButtonText: "确认发布",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    console.log("发布客户配置:", row);

    // 调用发布接口
    const response = await publishCustomerApi(row.id);
    console.log("发布响应:", response);

    // 由于 requestClient 配置了 responseReturn: "data"，response 就是 data 部分
    if (response && response.success) {
      ElMessage.success(response.message || "发布成功");
      // 刷新列表以更新发布状态
      fetchCustomerList();
    } else {
      ElMessage.error(response?.message || "发布失败");
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("发布客户配置失败:", error);
      ElMessage.error("发布失败，请稍后重试");
    }
  }
}

// 页面加载时获取数据
onMounted(() => {
  fetchCustomerList();
});
</script>

<template>
  <div class="p-4">
    <!-- 搜索表单 -->
    <ElCard class="mb-4" shadow="never">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600 whitespace-nowrap">客户名称</span>
          <ElInput
            v-model="searchForm.name"
            placeholder="请输入客户名称"
            clearable
            style="width: 180px"
            @keyup.enter="handleSearch"
          />
        </div>

        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600 whitespace-nowrap">客户编码</span>
          <ElInput
            v-model="searchForm.code"
            placeholder="请输入客户编码"
            clearable
            style="width: 180px"
            @keyup.enter="handleSearch"
          />
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
              v-for="option in statusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </ElSelect>
        </div>

        <div class="flex items-center gap-2 ml-auto">
          <ElButton @click="handleReset">重置</ElButton>
          <ElButton type="primary" @click="handleSearch">查询</ElButton>
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
        <ElTableColumn label="ID" prop="id" width="60" align="center" />
        <ElTableColumn
          label="客户编码"
          prop="code"
          width="90"
          show-overflow-tooltip
        />
        <ElTableColumn
          label="客户名称"
          prop="name"
          min-width="90"
          show-overflow-tooltip
        />
        <ElTableColumn
          label="时区"
          prop="timezone"
          width="100"
          show-overflow-tooltip
        />
        <ElTableColumn
          label="币种"
          prop="currency"
          width="70"
          show-overflow-tooltip
        />
        <ElTableColumn
          label="Site数据库"
          prop="db_link_site"
          min-width="120"
          show-overflow-tooltip
        />
        <ElTableColumn
          label="Balance数据库"
          prop="db_link_balance"
          min-width="125"
          show-overflow-tooltip
        />
        <ElTableColumn
          label="Game数据库"
          prop="db_link_game"
          min-width="120"
          show-overflow-tooltip
        />
        <!-- <ElTableColumn
          label="KV配置详情"
          prop="kv_config"
          min-width="180"
          show-overflow-tooltip
        /> -->
        <ElTableColumn label="状态" prop="status" width="80" align="center">
          <template #default="{ row }">
            <ElTag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <!-- <ElTableColumn
          label="发布状态"
          prop="is_sync"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <ElTag :type="getSyncTagType(row.is_sync)">
              {{ getSyncText(row.is_sync) }}
            </ElTag>
          </template>
        </ElTableColumn> -->
        <ElTableColumn
          label="创建时间"
          prop="created_at"
          width="160"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          label="更新时间"
          prop="updated_at"
          width="160"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ formatDateTime(row.updated_at) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <ElButton type="primary" size="small" link @click="handleEdit(row)">
              详情
            </ElButton>
            <ElButton
              type="success"
              size="small"
              link
              @click="handlePublish(row)"
            >
              发布
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
  </div>
</template>

<style scoped lang="scss">
.el-card {
  :deep(.el-card__body) {
    padding: 16px 20px;
  }
}
</style>
