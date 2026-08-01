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
  ElInputNumber,
  ElSelect,
  ElOption,
  ElTag,
} from "element-plus";
import {
  getWithdrawListApi,
  createWithdrawApi,
  updateWithdrawApi,
  deleteWithdrawApi,
  WithdrawApi,
} from "#/api/core/withdraw";

// 提现网关选项
const gatewayOptions = [
  { label: "在线支付", value: 1 },
  { label: "银行", value: 2 },
];

// 状态选项
const statusOptions = [
  { label: "禁用", value: 0 },
  { label: "启用", value: 1 },
];

// 是否输入金额选项
const isInputOptions = [
  { label: "不支持", value: 0 },
  { label: "支持", value: 1 },
];

// 列表数据
const tableData = ref<WithdrawApi.WithdrawItem[]>([]);
const loading = ref(false);
const total = ref(0);

// 分页参数
const pagination = ref({
  page: 1,
  size: 20,
});

// 搜索参数
const searchForm = ref({
  gateway: undefined as number | undefined,
  status: undefined as number | undefined,
  name: "",
});

// 对话框
const dialogVisible = ref(false);
const dialogTitle = ref("");
const isEdit = ref(false);

// 表单数据
const formData = ref<
  WithdrawApi.CreateWithdrawParams | WithdrawApi.UpdateWithdrawParams
>({
  name: "",
  code: "",
  gateway: 1,
  api_url: "",
  merchant_no: "",
  md5_key: "",
  each_min: 10,
  each_max: 50000,
  sort: 0,
  money_list: "",
  is_input: 1,
  remark: "",
  logo: "",
  status: 1,
});

const formRules = {
  name: [{ required: true, message: "请输入提现名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入提现代码", trigger: "blur" }],
  gateway: [{ required: true, message: "请选择提现网关", trigger: "change" }],
};

const formRef = ref();

// 加载列表数据
const loadData = async () => {
  try {
    loading.value = true;
    const params: WithdrawApi.GetWithdrawListParams = {
      ...searchForm.value,
      page: pagination.value.page,
      size: pagination.value.size,
    };

    const response = await getWithdrawListApi(params);
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
    gateway: undefined,
    status: undefined,
    name: "",
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
  dialogTitle.value = "新增提现";
  formData.value = {
    name: "",
    code: "",
    gateway: 1,
    api_url: "",
    merchant_no: "",
    md5_key: "",
    each_min: 10,
    each_max: 50000,
    sort: 0,
    money_list: "",
    is_input: 1,
    remark: "",
    logo: "",
    status: 1,
  };
  dialogVisible.value = true;
};

// 打开编辑对话框
const handleEdit = (row: WithdrawApi.WithdrawItem) => {
  isEdit.value = true;
  dialogTitle.value = "编辑提现";
  formData.value = {
    id: row.id,
    name: row.name,
    code: row.code,
    gateway: row.gateway,
    api_url: row.api_url,
    merchant_no: row.merchant_no,
    md5_key: row.md5_key,
    each_min: row.each_min,
    each_max: row.each_max,
    sort: row.sort,
    money_list: row.money_list,
    is_input: row.is_input,
    remark: row.remark,
    logo: row.logo,
    status: row.status,
  };
  dialogVisible.value = true;
};

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value?.validate();

    loading.value = true;
    if (isEdit.value) {
      await updateWithdrawApi(
        formData.value as WithdrawApi.UpdateWithdrawParams,
      );
    } else {
      await createWithdrawApi(
        formData.value as WithdrawApi.CreateWithdrawParams,
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
const handleDelete = async (row: WithdrawApi.WithdrawItem) => {
  try {
    await ElMessageBox.confirm(`确定要删除提现"${row.name}"吗？`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    loading.value = true;
    await deleteWithdrawApi({ id: row.id });

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

// 获取提现网关文本
const getGatewayText = (gateway: number) => {
  const option = gatewayOptions.find((item) => item.value === gateway);
  return option?.label || "-";
};

// 获取提现网关标签类型
const getGatewayTagType = (gateway: number) => {
  return gateway === 1 ? "primary" : "success";
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
          v-model="searchForm.gateway"
          placeholder="提现网关"
          clearable
          style="width: 150px"
        >
          <ElOption
            v-for="item in gatewayOptions"
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
          v-model="searchForm.name"
          placeholder="提现名称"
          clearable
          style="width: 200px"
        />

        <ElButton type="primary" @click="handleSearch">搜索</ElButton>
        <ElButton @click="handleReset">重置</ElButton>
        <ElButton type="success" @click="handleAdd">新增提现</ElButton>
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

        <ElTableColumn prop="name" label="提现名称" width="150" />

        <ElTableColumn prop="code" label="提现代码" width="120" />

        <ElTableColumn
          prop="gateway"
          label="提现网关"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <ElTag :type="getGatewayTagType(row.gateway)" size="small">
              {{ getGatewayText(row.gateway) }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn
          prop="api_url"
          label="提现域名"
          width="200"
          show-overflow-tooltip
        />

        <ElTableColumn prop="merchant_no" label="商户号" width="150" />

        <ElTableColumn
          prop="md5_key"
          label="MD5密钥"
          width="150"
          show-overflow-tooltip
        />

        <ElTableColumn
          prop="each_min"
          label="单笔最低"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            {{ row.each_min.toFixed(2) }}
          </template>
        </ElTableColumn>

        <ElTableColumn
          prop="each_max"
          label="单笔最高"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            {{ row.each_max > 0 ? row.each_max.toFixed(2) : "无限制" }}
          </template>
        </ElTableColumn>

        <ElTableColumn prop="sort" label="排序" width="80" align="center" />

        <ElTableColumn
          prop="is_input"
          label="输入金额"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <ElTag :type="row.is_input === 1 ? 'success' : 'info'" size="small">
              {{ row.is_input === 1 ? "支持" : "不支持" }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? "启用" : "禁用" }}
            </ElTag>
          </template>
        </ElTableColumn>

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
        <ElFormItem label="提现名称" prop="name">
          <ElInput v-model="formData.name" placeholder="请输入提现名称" />
        </ElFormItem>

        <ElFormItem label="提现代码" prop="code">
          <ElInput v-model="formData.code" placeholder="请输入提现代码" />
        </ElFormItem>

        <ElFormItem label="提现网关" prop="gateway">
          <ElSelect v-model="formData.gateway" placeholder="请选择提现网关">
            <ElOption
              v-for="item in gatewayOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="提现域名">
          <ElInput v-model="formData.api_url" placeholder="请输入提现域名" />
        </ElFormItem>

        <ElFormItem label="商户号">
          <ElInput v-model="formData.merchant_no" placeholder="请输入商户号" />
        </ElFormItem>

        <ElFormItem label="MD5密钥">
          <ElInput
            v-model="formData.md5_key"
            type="password"
            placeholder="请输入MD5密钥"
            show-password
          />
        </ElFormItem>

        <ElFormItem label="单笔最低">
          <ElInputNumber
            v-model="formData.each_min"
            :min="0"
            :precision="2"
            placeholder="请输入单笔最低金额"
            style="width: 100%"
          />
        </ElFormItem>

        <ElFormItem label="单笔最高">
          <ElInputNumber
            v-model="formData.each_max"
            :min="0"
            :precision="2"
            placeholder="请输入单笔最高金额，0表示无限制"
            style="width: 100%"
          />
        </ElFormItem>

        <ElFormItem label="排序">
          <ElInputNumber
            v-model="formData.sort"
            :min="0"
            placeholder="请输入排序值，值越小排名越靠前"
            style="width: 100%"
          />
        </ElFormItem>

        <ElFormItem label="可选金额">
          <ElInput
            v-model="formData.money_list"
            placeholder="请输入可选金额，多个用逗号分隔，如：100,200,500,1000"
          />
        </ElFormItem>

        <ElFormItem label="输入金额">
          <ElSelect
            v-model="formData.is_input"
            placeholder="请选择是否支持输入金额"
          >
            <ElOption
              v-for="item in isInputOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="Logo地址">
          <ElInput v-model="formData.logo" placeholder="请输入Logo地址" />
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
