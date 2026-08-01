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
  ElAlert,
} from "element-plus";
import {
  getGameListApi,
  supplementBetRecordsApi,
  type SupplementBetRecordsParams,
  GameApi,
} from "#/api/core/game";

// 游戏平台选项（从游戏列表动态获取）
const platformOptions = ref<{ label: string; value: string }[]>([]);

// 补单对话框
const supplementDialogVisible = ref(false);
const supplementLoading = ref(false);

// 补单表单数据
const supplementForm = ref<SupplementBetRecordsParams>({
  platform: "",
  start_time: "",
  end_time: "",
  site_codes: [],
});

// 时间范围
const dateRange = ref<[Date, Date] | null>(null);

// 补单表单验证规则
const supplementRules = {
  platform: [{ required: true, message: "请选择游戏平台", trigger: "change" }],
};

const supplementFormRef = ref();

// 补单结果
const supplementResult = ref<{
  success: boolean;
  message: string;
  total_records: number;
} | null>(null);

// 加载游戏平台列表
const loadPlatforms = async () => {
  try {
    const response = await getGameListApi({ page: 1, size: 100 });
    // 去重获取平台列表
    const platforms = new Set<string>();
    response.list?.forEach((game) => {
      if (game.platform) {
        platforms.add(game.platform);
      }
    });
    platformOptions.value = Array.from(platforms).map((platform) => ({
      label: platform,
      value: platform,
    }));
  } catch (error) {
    console.error("加载平台列表失败:", error);
  }
};

// 打开补单对话框
const handleOpenSupplement = () => {
  supplementResult.value = null;
  supplementForm.value = {
    platform: "",
    start_time: "",
    end_time: "",
    site_codes: [],
  };
  dateRange.value = null;
  supplementDialogVisible.value = true;
};

// 快速选择时间范围
const setQuickTimeRange = (hours: number) => {
  const now = new Date();
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
  dateRange.value = [start, now];
  updateTimeFromRange();
};

// 从日期范围更新时间字符串
const updateTimeFromRange = () => {
  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value;
    // 如果已经是字符串格式，直接使用
    if (typeof start === "string" && typeof end === "string") {
      supplementForm.value.start_time = start;
      supplementForm.value.end_time = end;
    } else {
      // 如果是 Date 对象，进行格式化
      supplementForm.value.start_time = formatDateTime(start);
      supplementForm.value.end_time = formatDateTime(end);
    }
  }
};

// 格式化日期时间
const formatDateTime = (date: Date | string): string => {
  // 如果已经是字符串，直接返回
  if (typeof date === "string") {
    return date;
  }

  // 如果是 Date 对象，进行格式化
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// 提交补单
const handleSubmitSupplement = async () => {
  try {
    await supplementFormRef.value?.validate();

    if (!supplementForm.value.start_time || !supplementForm.value.end_time) {
      ElMessage.warning("请选择时间范围");
      return;
    }

    await ElMessageBox.confirm(
      `确定要对平台 "${supplementForm.value.platform}" 进行补单吗？<br/>时间范围：${supplementForm.value.start_time} ~ ${supplementForm.value.end_time}`,
      "确认补单",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
        dangerouslyUseHTMLString: true,
      },
    );

    supplementLoading.value = true;
    supplementResult.value = null;

    const response = await supplementBetRecordsApi(supplementForm.value);

    supplementResult.value = {
      success: response.success,
      message: response.message,
      total_records: response.total_records,
    };

    if (response.success) {
      ElMessage.success("补单完成");
    } else {
      ElMessage.error(response.message || "补单失败");
    }
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("补单失败:", error);
      ElMessage.error(error?.message || "补单失败");
    }
  } finally {
    supplementLoading.value = false;
  }
};

// 页面加载
onMounted(() => {
  loadPlatforms();
});
</script>

<template>
  <div class="p-4">
    <!-- 页面标题和操作栏 -->
    <ElCard class="mb-4" shadow="never">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold mb-2">注单管理</h2>
          <p class="text-gray-500 text-sm">管理游戏注单数据，支持补单功能</p>
        </div>
        <div class="flex gap-2">
          <ElButton type="primary" @click="handleOpenSupplement">
            补单
          </ElButton>
        </div>
      </div>
    </ElCard>

    <!-- 补单对话框 -->
    <ElDialog
      v-model="supplementDialogVisible"
      title="补单"
      width="600px"
      :close-on-click-modal="false"
    >
      <ElForm
        ref="supplementFormRef"
        :model="supplementForm"
        :rules="supplementRules"
        label-width="100px"
      >
        <ElFormItem label="游戏平台" prop="platform">
          <ElSelect
            v-model="supplementForm.platform"
            placeholder="请选择游戏平台"
            style="width: 100%"
          >
            <ElOption
              v-for="item in platformOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="时间范围">
          <div class="w-full">
            <ElDatePicker
              v-model="dateRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 100%"
              @change="updateTimeFromRange"
            />
            <div class="mt-2 flex gap-2">
              <ElButton size="small" @click="setQuickTimeRange(1)">
                最近1小时
              </ElButton>
              <ElButton size="small" @click="setQuickTimeRange(6)">
                最近6小时
              </ElButton>
              <ElButton size="small" @click="setQuickTimeRange(24)">
                最近24小时
              </ElButton>
            </div>
          </div>
        </ElFormItem>

        <ElFormItem label="开始时间">
          <ElInput
            v-model="supplementForm.start_time"
            placeholder="格式: 2026-01-24 00:00:00"
            readonly
          />
        </ElFormItem>

        <ElFormItem label="结束时间">
          <ElInput
            v-model="supplementForm.end_time"
            placeholder="格式: 2026-01-24 19:00:00"
            readonly
          />
        </ElFormItem>

        <ElFormItem label="站点代码">
          <ElInput
            v-model="supplementForm.site_codes"
            placeholder="可选，留空则补所有站点"
            disabled
          />
          <div class="text-xs text-gray-500 mt-1">留空将对所有站点进行补单</div>
        </ElFormItem>
      </ElForm>

      <!-- 补单结果 -->
      <div v-if="supplementResult" class="mt-4">
        <ElAlert
          :title="supplementResult.success ? '补单成功' : '补单失败'"
          :type="supplementResult.success ? 'success' : 'error'"
          :closable="false"
        >
          <div class="mt-2">
            <p>{{ supplementResult.message }}</p>
            <p v-if="supplementResult.total_records > 0" class="mt-1">
              总记录数: {{ supplementResult.total_records }}
            </p>
          </div>
        </ElAlert>
      </div>

      <template #footer>
        <ElButton @click="supplementDialogVisible = false">关闭</ElButton>
        <ElButton
          type="primary"
          @click="handleSubmitSupplement"
          :loading="supplementLoading"
          :disabled="
            !supplementForm.platform ||
            !supplementForm.start_time ||
            !supplementForm.end_time
          "
        >
          开始补单
        </ElButton>
      </template>
    </ElDialog>

    <!-- 说明卡片 -->
    <ElCard shadow="never">
      <div class="text-sm text-gray-600">
        <h3 class="font-bold mb-2">补单说明：</h3>
        <ul class="list-disc list-inside space-y-1">
          <li>补单功能用于补充指定时间范围内的游戏注单数据</li>
          <li>选择游戏平台和时间范围后，系统将自动拉取该时间段的注单</li>
          <li>补单过程中会自动去重，不会产生重复数据</li>
          <li>建议每次补单的时间范围不超过24小时</li>
          <li>补单完成后会显示成功站点数、失败站点数和总记录数</li>
        </ul>
      </div>
    </ElCard>
  </div>
</template>

<style scoped lang="scss">
.el-table {
  .el-table__cell {
    padding: 12px 0;
  }
}
</style>
