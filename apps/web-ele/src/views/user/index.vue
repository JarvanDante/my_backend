<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElDrawer,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import {
  adjustBalanceApi,
  getBalanceLogsApi,
  getUserDetailApi,
  getUserListApi,
  setUserDisableApi,
  setUserGroupApi,
  type BkUserApi,
} from "#/api/core/bkuser";
import { getGroupListApi, type BkGroupApi } from "#/api/core/bkgroup";

defineOptions({ name: "UserManage" });

const loading = ref(false);
const tableData = ref<BkUserApi.UserItem[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const searchForm = reactive({ keyword: "", channel: "", status: 0 });
const statusOptions = [
  { label: "全部", value: 0 },
  { label: "正常", value: 1 },
  { label: "禁用", value: 2 },
];

async function fetchList() {
  loading.value = true;
  try {
    const res = await getUserListApi({
      keyword: searchForm.keyword || undefined,
      channel: searchForm.channel || undefined,
      status: searchForm.status,
      page: pagination.current,
      size: pagination.pageSize,
    });
    tableData.value = res.list || [];
    pagination.total = res.total || 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.current = 1;
  fetchList();
}
function handleReset() {
  searchForm.keyword = "";
  searchForm.channel = "";
  searchForm.status = 0;
  handleSearch();
}

// ---------- 详情抽屉 ----------
const detailVisible = ref(false);
const detail = ref<BkUserApi.UserDetail | null>(null);
const logs = ref<BkUserApi.BalanceLogItem[]>([]);
async function openDetail(row: BkUserApi.UserItem) {
  detailVisible.value = true;
  detail.value = null;
  const [d, l] = await Promise.all([
    getUserDetailApi(row.id),
    getBalanceLogsApi(row.id, 1, 20),
  ]);
  detail.value = d;
  logs.value = l.list || [];
}

// ---------- 禁用/解禁 ----------
async function handleDisable(row: BkUserApi.UserItem) {
  if (row.is_disabled === 1) {
    await ElMessageBox.confirm(`解禁用户「${row.username}」?`, "提示", { type: "warning" });
    await setUserDisableApi(row.id, "enable");
    ElMessage.success("已解禁");
  } else {
    const { value } = await ElMessageBox.prompt("请输入禁用原因", "禁用用户", {
      inputPlaceholder: "如: 违规",
    });
    await setUserDisableApi(row.id, "disable", value || "后台禁用");
    ElMessage.success("已禁用");
  }
  fetchList();
}

// ---------- 调组 ----------
const groupVisible = ref(false);
const groups = ref<BkGroupApi.GroupItem[]>([]);
const groupForm = reactive({ id: 0, group_id: 0 });
async function openGroup(row: BkUserApi.UserItem) {
  groupForm.id = row.id;
  groupForm.group_id = row.group_id;
  const res = await getGroupListApi();
  groups.value = res.list || [];
  groupVisible.value = true;
}
async function handleSaveGroup() {
  await setUserGroupApi(groupForm.id, groupForm.group_id);
  ElMessage.success("已调整用户组");
  groupVisible.value = false;
  fetchList();
}

// ---------- 调余额 ----------
const balanceVisible = ref(false);
const balanceForm = reactive({
  id: 0,
  target: "balance" as "balance" | "credit",
  amount: 0,
  remark: "",
});
function openBalance(row: BkUserApi.UserItem) {
  balanceForm.id = row.id;
  balanceForm.target = "balance";
  balanceForm.amount = 0;
  balanceForm.remark = "";
  balanceVisible.value = true;
}
async function handleSaveBalance() {
  if (!balanceForm.amount) {
    ElMessage.warning("调整数额不能为 0(正加负减)");
    return;
  }
  await adjustBalanceApi(
    balanceForm.id,
    balanceForm.target,
    balanceForm.amount,
    balanceForm.remark,
  );
  ElMessage.success("调整成功");
  balanceVisible.value = false;
  fetchList();
}

const dirTag: Record<number, string> = { 1: "收入", 2: "支出" };

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <ElInput
          v-model="searchForm.keyword"
          placeholder="用户名/手机/昵称"
          clearable
          style="width: 200px"
          @keyup.enter="handleSearch"
        />
        <ElInput
          v-model="searchForm.channel"
          placeholder="渠道"
          clearable
          style="width: 140px"
          @keyup.enter="handleSearch"
        />
        <ElSelect v-model="searchForm.status" style="width: 110px">
          <ElOption v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
        </ElSelect>
        <ElButton type="primary" @click="handleSearch">查询</ElButton>
        <ElButton @click="handleReset">重置</ElButton>
      </div>

      <ElTable v-loading="loading" :data="tableData" border stripe>
        <ElTableColumn prop="id" label="ID" width="70" />
        <ElTableColumn prop="username" label="用户名" min-width="140" />
        <ElTableColumn prop="nickname" label="昵称" width="120" />
        <ElTableColumn prop="phone" label="手机" width="120" />
        <ElTableColumn prop="group_name" label="用户组" width="100" />
        <ElTableColumn prop="balance" label="金币" width="90" align="right" />
        <ElTableColumn prop="credit" label="积分" width="90" align="right" />
        <ElTableColumn label="状态" width="80" align="center">
          <template #default="{ row }">
            <ElTag :type="row.is_disabled === 0 ? 'success' : 'danger'">
              {{ row.is_disabled === 0 ? "正常" : "禁用" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="register_at" label="注册时间" width="170" />
        <ElTableColumn label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openDetail(row)">详情</ElButton>
            <ElButton link type="primary" @click="openGroup(row)">调组</ElButton>
            <ElButton link type="primary" @click="openBalance(row)">调余额</ElButton>
            <ElButton
              link
              :type="row.is_disabled === 0 ? 'danger' : 'success'"
              @click="handleDisable(row)"
            >
              {{ row.is_disabled === 0 ? "禁用" : "解禁" }}
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-4 flex justify-end">
        <ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSearch"
          @current-change="fetchList"
        />
      </div>
    </ElCard>

    <!-- 详情抽屉 -->
    <ElDrawer v-model="detailVisible" title="用户详情" size="600px">
      <div v-if="detail">
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="ID">{{ detail.id }}</ElDescriptionsItem>
          <ElDescriptionsItem label="用户名">{{ detail.username }}</ElDescriptionsItem>
          <ElDescriptionsItem label="昵称">{{ detail.nickname }}</ElDescriptionsItem>
          <ElDescriptionsItem label="手机">{{ detail.phone || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="用户组">{{ detail.group_name || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="折扣">{{ detail.group_rate }}</ElDescriptionsItem>
          <ElDescriptionsItem label="金币">{{ detail.balance }}</ElDescriptionsItem>
          <ElDescriptionsItem label="积分">{{ detail.credit }}</ElDescriptionsItem>
          <ElDescriptionsItem label="累计充值">{{ detail.money_count }}</ElDescriptionsItem>
          <ElDescriptionsItem label="渠道">{{ detail.channel || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="推荐人">{{ detail.parent_name || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="粉丝/关注">{{ detail.fans }}/{{ detail.follow }}</ElDescriptionsItem>
          <ElDescriptionsItem label="登录次数">{{ detail.login_num }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最后IP">{{ detail.last_ip || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="状态" :span="2">
            <ElTag :type="detail.is_disabled === 0 ? 'success' : 'danger'">
              {{ detail.is_disabled === 0 ? "正常" : "禁用" }}
            </ElTag>
            <span v-if="detail.error_msg" class="text-muted-foreground ml-2 text-xs">
              {{ detail.error_msg }}
            </span>
          </ElDescriptionsItem>
        </ElDescriptions>

        <div class="mt-4 mb-2 font-medium">余额流水(最近20条)</div>
        <ElTable :data="logs" border size="small" max-height="300">
          <ElTableColumn label="方向" width="70" align="center">
            <template #default="{ row }">
              <ElTag :type="row.direction === 1 ? 'success' : 'danger'" size="small">
                {{ dirTag[row.direction] }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="scene" label="场景" width="110" />
          <ElTableColumn prop="amount" label="金额" width="90" align="right" />
          <ElTableColumn prop="balance_after" label="变动后" width="90" align="right" />
          <ElTableColumn prop="remark" label="备注" min-width="120" show-overflow-tooltip />
          <ElTableColumn prop="created_at" label="时间" width="160" />
        </ElTable>
      </div>
    </ElDrawer>

    <!-- 调组 -->
    <ElDialog v-model="groupVisible" title="调整用户组" width="380px">
      <ElForm label-width="80px">
        <ElFormItem label="用户组">
          <ElSelect v-model="groupForm.group_id" style="width: 100%" placeholder="选择用户组">
            <ElOption :value="0" label="(移出用户组)" />
            <ElOption v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="groupVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSaveGroup">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 调余额 -->
    <ElDialog v-model="balanceVisible" title="调整金币/积分" width="420px">
      <ElForm label-width="90px">
        <ElFormItem label="类型">
          <ElSelect v-model="balanceForm.target" style="width: 100%">
            <ElOption label="金币(balance)" value="balance" />
            <ElOption label="积分(credit)" value="credit" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="调整数额">
          <ElInputNumber v-model="balanceForm.amount" :step="10" style="width: 100%" />
          <span class="text-muted-foreground text-xs">正数增加, 负数扣减</span>
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="balanceForm.remark" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="balanceVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSaveBalance">确认调整</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
