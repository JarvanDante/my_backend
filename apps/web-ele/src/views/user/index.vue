<script lang="ts" setup>
import { nextTick, onMounted, reactive, ref, watch } from "vue";

import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElDrawer,
  ElForm,
  ElFormItem,
  ElImage,
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
import dayjs from "dayjs";
import QRCode from "qrcode";

import {
  adjustBalanceApi,
  batchDisableUsersApi,
  getBalanceLogsApi,
  getUserDetailApi,
  getUserListApi,
  setUserDisableApi,
  setUserGroupApi,
  type BkUserApi,
} from "#/api/core/bkuser";
import { getGroupListApi, type BkGroupApi } from "#/api/core/bkgroup";
import { adminMediaUrl } from "#/utils/media";
import { encodeId, parseAdminId } from "#/utils/idcrypt";

defineOptions({ name: "UserManage" });

const loading = ref(false);
const tableData = ref<BkUserApi.UserItem[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const groups = ref<BkGroupApi.GroupItem[]>([]);

// 与公司后台一致: 空=全部; 是否类 1是/0否; 状态 0正常/1禁用
const yesNoOptions = [
  { label: "是", value: 1 },
  { label: "否", value: 0 },
];
const statusOptions = [
  { label: "正常", value: 0 },
  { label: "禁用", value: 1 },
];
const deviceOptions = [
  { label: "H5(ios)", value: "h5" },
  { label: "Android", value: "android" },
];

const searchForm = reactive({
  group_id: undefined as number | undefined,
  is_up: undefined as number | undefined,
  is_valid: undefined as number | undefined,
  status: undefined as number | undefined,
  device_type: undefined as string | undefined,
  start_time: undefined as string | undefined,
  end_time: undefined as string | undefined,
  user_id: "" as string,
  username: "",
  parent_id: "" as string,
  channel: "",
  phone: "",
});

/** 公司 空/1/0 → API 0全部/1是/2否 */
function mapYesNoToApi(v: number | undefined) {
  if (v === 1) return 1;
  if (v === 0) return 2;
  return 0;
}

/** 公司 is_disabled 空/0/1 → API status 0全部/1正常/2禁用 */
function mapStatusToApi(v: number | undefined) {
  if (v === 0) return 1;
  if (v === 1) return 2;
  return 0;
}

function toYmd(v?: string) {
  if (!v) return undefined;
  return Number(dayjs(v).format("YYYYMMDD"));
}

function sexLabel(sex: number) {
  if (sex === 1) return "男";
  if (sex === 2) return "女";
  return "未知";
}

function parseTag(tag: string) {
  if (!tag) return "-";
  try {
    const arr = JSON.parse(tag);
    if (Array.isArray(arr) && arr.length) return arr.join(",");
  } catch {
    if (tag !== "[]") return tag;
  }
  return "-";
}

function fmtEpoch(sec: number) {
  if (!sec) return "-";
  return dayjs.unix(sec).format("YYYY-MM-DD HH:mm:ss");
}

function deviceText(row: BkUserApi.UserItem) {
  const base = row.device_type || "-";
  const ext = row.device_ext ? `(${row.device_ext})` : "";
  const ver = row.device_version ? ` v:${row.device_version}` : "";
  return `${base}${ext}${ver}`;
}

function imgSrc(img: string) {
  if (!img) return "";
  return adminMediaUrl(img);
}

async function fetchList() {
  loading.value = true;
  try {
    const userId = parseAdminId(searchForm.user_id) || parseAdminId(searchForm.username);
    const parentId = parseAdminId(searchForm.parent_id);
    const res = await getUserListApi({
      user_id: userId > 0 ? userId : undefined,
      username: userId > 0 ? undefined : searchForm.username || undefined,
      phone: searchForm.phone || undefined,
      parent_id: parentId > 0 ? parentId : undefined,
      channel: searchForm.channel || undefined,
      group_id: searchForm.group_id || undefined,
      is_up: mapYesNoToApi(searchForm.is_up),
      is_valid: mapYesNoToApi(searchForm.is_valid),
      status: mapStatusToApi(searchForm.status),
      device_type: searchForm.device_type || undefined,
      start_date: toYmd(searchForm.start_time || undefined),
      end_date: toYmd(searchForm.end_time || undefined),
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
  searchForm.group_id = undefined;
  searchForm.is_up = undefined;
  searchForm.is_valid = undefined;
  searchForm.status = undefined;
  searchForm.device_type = undefined;
  searchForm.start_time = undefined;
  searchForm.end_time = undefined;
  searchForm.user_id = "";
  searchForm.username = "";
  searchForm.parent_id = "";
  searchForm.channel = "";
  searchForm.phone = "";
  handleSearch();
}

// ---------- 登录二维码 ----------
const qrVisible = ref(false);
const qrText = ref("");
const qrDataUrl = ref("");
const qrUsername = ref("");
async function openLoginQr(row: BkUserApi.UserItem) {
  if (!row.account_slat) {
    ElMessage.warning("无登录凭证");
    return;
  }
  qrUsername.value = encodeId(row.id) || row.username;
  qrText.value = row.account_slat;
  qrVisible.value = true;
  await nextTick();
  try {
    qrDataUrl.value = await QRCode.toDataURL(row.account_slat, {
      width: 220,
      margin: 1,
    });
  } catch {
    qrDataUrl.value = "";
  }
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

// ---------- 批量冻结/解冻 ----------
const selectedRows = ref<BkUserApi.UserItem[]>([]);
function handleSelectionChange(rows: BkUserApi.UserItem[]) {
  selectedRows.value = rows;
}
async function handleBatchDisable(op: "disable" | "enable") {
  const ids = selectedRows.value.map((r) => r.id);
  if (!ids.length) return;
  let reason = "";
  if (op === "disable") {
    const { value } = await ElMessageBox.prompt(
      `批量冻结选中的 ${ids.length} 个用户, 请输入冻结原因`,
      "批量冻结",
      { inputPlaceholder: "如: 违规", type: "warning" },
    );
    reason = value || "后台批量冻结";
  } else {
    await ElMessageBox.confirm(`批量解冻选中的 ${ids.length} 个用户?`, "提示", {
      type: "warning",
    });
  }
  const res = await batchDisableUsersApi(ids, op, reason);
  ElMessage.success(
    `${op === "disable" ? "冻结" : "解冻"}完成, 实际变更 ${res.affected} 人`,
  );
  fetchList();
}

// ---------- 调组 ----------
const groupVisible = ref(false);
const groupForm = reactive({ id: 0, group_id: 0 });
async function openGroup(row: BkUserApi.UserItem) {
  groupForm.id = row.id;
  groupForm.group_id = row.group_id;
  if (!groups.value.length) {
    const res = await getGroupListApi();
    groups.value = res.list || [];
  }
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

watch(qrVisible, (v) => {
  if (!v) {
    qrDataUrl.value = "";
    qrText.value = "";
  }
});

onMounted(async () => {
  try {
    const res = await getGroupListApi();
    groups.value = res.list || [];
  } catch {
    groups.value = [];
  }
  fetchList();
});
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <ElForm :inline="true" class="user-search-form mb-2" @submit.prevent="handleSearch">
          <ElFormItem label="等级:">
            <ElSelect
              v-model="searchForm.group_id"
              clearable
              placeholder="请选择.."
              style="width: 200px"
            >
              <ElOption v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="Up主:">
            <ElSelect
              v-model="searchForm.is_up"
              clearable
              placeholder="请选择.."
              style="width: 200px"
            >
              <ElOption v-for="o in yesNoOptions" :key="`up-${o.value}`" :label="o.label" :value="o.value" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="有效用户:">
            <ElSelect
              v-model="searchForm.is_valid"
              clearable
              placeholder="请选择.."
              style="width: 200px"
            >
              <ElOption v-for="o in yesNoOptions" :key="`v-${o.value}`" :label="o.label" :value="o.value" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="状态:">
            <ElSelect
              v-model="searchForm.status"
              clearable
              placeholder="请选择.."
              style="width: 200px"
            >
              <ElOption v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="设备类型:">
            <ElSelect
              v-model="searchForm.device_type"
              clearable
              placeholder="请选择.."
              style="width: 200px"
            >
              <ElOption v-for="o in deviceOptions" :key="o.value" :label="o.label" :value="o.value" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="注册时间:">
            <ElDatePicker
              v-model="searchForm.start_time"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              placeholder="yyyy-mm-dd H:i:s"
              style="width: 200px"
            />
            <span class="mx-1">-</span>
            <ElDatePicker
              v-model="searchForm.end_time"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              placeholder="yyyy-mm-dd H:i:s"
              style="width: 200px"
            />
          </ElFormItem>
          <ElFormItem label="用户ID:">
            <ElInput
              v-model="searchForm.user_id"
              clearable
              placeholder="请输入用户ID"
              style="width: 200px"
              @keyup.enter="handleSearch"
            />
          </ElFormItem>
          <ElFormItem label="用户名:">
            <ElInput
              v-model="searchForm.username"
              clearable
              placeholder="请输入用户名"
              style="width: 200px"
              @keyup.enter="handleSearch"
            />
          </ElFormItem>
          <ElFormItem label="上级ID:">
            <ElInput
              v-model="searchForm.parent_id"
              clearable
              placeholder="请输入上级用户ID"
              style="width: 200px"
              @keyup.enter="handleSearch"
            />
          </ElFormItem>
          <ElFormItem label="渠道名:">
            <ElInput
              v-model="searchForm.channel"
              clearable
              placeholder="请输入渠道名"
              style="width: 200px"
              @keyup.enter="handleSearch"
            />
          </ElFormItem>
          <ElFormItem label="手机号码:">
            <ElInput
              v-model="searchForm.phone"
              clearable
              placeholder="请输入手机号码"
              style="width: 200px"
              @keyup.enter="handleSearch"
            />
          </ElFormItem>
          <ElFormItem>
            <ElButton type="primary" @click="handleSearch">搜索</ElButton>
            <ElButton @click="handleReset">重置</ElButton>
          </ElFormItem>
      </ElForm>

      <div class="mb-2 flex items-center gap-2">
        <ElButton
          type="danger"
          plain
          :disabled="!selectedRows.length"
          @click="handleBatchDisable('disable')"
        >
          批量冻结
        </ElButton>
        <ElButton
          type="success"
          plain
          :disabled="!selectedRows.length"
          @click="handleBatchDisable('enable')"
        >
          批量解冻
        </ElButton>
        <span v-if="selectedRows.length" class="text-muted-foreground text-xs">
          已选 {{ selectedRows.length }} 人
        </span>
      </div>

      <ElTable
        v-loading="loading"
        :data="tableData"
        border
        stripe
        size="small"
        @selection-change="handleSelectionChange"
      >
        <ElTableColumn type="selection" width="42" align="center" />
        <ElTableColumn label="用户ID" width="120" align="center">
          <template #default="{ row }">
            <div>{{ row.id }}</div>
            <div class="text-muted-foreground text-xs">{{ encodeId(row.id) || row.username }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="昵称" width="140" align="center">
          <template #default="{ row }">
            <div>{{ row.nickname || "-" }}</div>
            <div class="text-xs">性别:{{ sexLabel(row.sex) }}</div>
            <div class="text-xs" style="color: #4d56d2">标签:{{ parseTag(row.tag) }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="头像" width="80" align="center">
          <template #default="{ row }">
            <ElImage
              v-if="row.img"
              :src="imgSrc(row.img)"
              preview-teleported
              :preview-src-list="[imgSrc(row.img)]"
              fit="cover"
              style="width: 40px; height: 40px"
            />
            <span v-else>-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="balance" label="余额" width="90" align="center" />
        <ElTableColumn prop="gift_count" label="收益" width="90" align="center" />
        <ElTableColumn prop="credit" label="积分" width="90" align="center" />
        <ElTableColumn label="是否UP" width="80" align="center">
          <template #default="{ row }">
            {{ row.is_up === 1 ? "是" : "否" }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="VIP信息" width="180" align="center">
          <template #default="{ row }">
            <div>等级:{{ row.group_name || "-" }}</div>
            <div>折扣:{{ row.group_rate ?? "-" }}</div>
            <div>开始:{{ fmtEpoch(row.group_start_time) }}</div>
            <div>到期:{{ fmtEpoch(row.group_end_time) }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="上级" width="90" align="center">
          <template #default="{ row }">
            {{ row.parent_id || "-" }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="电话/账号" width="130" align="center">
          <template #default="{ row }">
            {{ row.phone || "-" }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="设备" width="140" align="center">
          <template #default="{ row }">
            {{ deviceText(row) }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="movie_fee_rate" label="视频分成(%)" width="100" align="center" />
        <ElTableColumn prop="post_fee_rate" label="帖子分成(%)" width="100" align="center" />
        <ElTableColumn prop="channel" label="渠道名" width="90" align="center" />
        <ElTableColumn label="状态" width="80" align="center">
          <template #default="{ row }">
            <ElTag :type="row.is_disabled === 0 ? 'success' : 'danger'" size="small">
              {{ row.is_disabled === 0 ? "正常" : "禁用" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="share_num" label="分享人数" width="90" align="center" />
        <ElTableColumn label="注册信息" width="160" align="center">
          <template #default="{ row }">
            <div>IP:{{ row.register_ip || "-" }}</div>
            <div>时间:{{ row.register_at || "-" }}</div>
            <div>地区:{{ row.register_area || "-" }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="最近登陆" width="160" align="center">
          <template #default="{ row }">
            <div>IP:{{ row.last_ip || "-" }}</div>
            <div>时间:{{ row.last_login_at || "-" }}</div>
            <div>登陆次数:{{ row.login_num ?? 0 }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="210" fixed="right" align="center">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openDetail(row)">详情</ElButton>
            <ElButton link type="primary" @click="openGroup(row)">编辑</ElButton>
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

    <!-- 登录二维码 -->
    <ElDialog v-model="qrVisible" :title="`登录二维码 - ${qrUsername}`" width="360px" align-center>
      <div class="flex flex-col items-center gap-3">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="login-qrcode" style="width: 220px; height: 220px" />
        <div class="text-muted-foreground break-all text-center text-xs">{{ qrText }}</div>
        <div class="text-muted-foreground text-center text-xs">
          找回账号: 用户在 App 登录页选择「找回账号」, 扫码或粘贴此凭证即可把账号恢复到新设备
        </div>
      </div>
    </ElDialog>

    <!-- 详情抽屉 -->
    <ElDrawer v-model="detailVisible" title="用户详情" size="640px">
      <div v-if="detail">
        <ElDescriptions :column="2" border size="small">
          <ElDescriptionsItem label="ID">{{ detail.id }}</ElDescriptionsItem>
          <ElDescriptionsItem label="用户名">{{ encodeId(detail.id) || detail.username }}</ElDescriptionsItem>
          <ElDescriptionsItem label="昵称">{{ detail.nickname }}</ElDescriptionsItem>
          <ElDescriptionsItem label="手机">{{ detail.phone || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="性别">{{ sexLabel(detail.sex) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="标签">{{ parseTag(detail.tag) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="用户组">{{ detail.group_name || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="折扣">{{ detail.group_rate }}</ElDescriptionsItem>
          <ElDescriptionsItem label="余额">{{ detail.balance }}</ElDescriptionsItem>
          <ElDescriptionsItem label="收益">{{ detail.gift_count }}</ElDescriptionsItem>
          <ElDescriptionsItem label="积分">{{ detail.credit }}</ElDescriptionsItem>
          <ElDescriptionsItem label="累计充值">{{ detail.money_count }}</ElDescriptionsItem>
          <ElDescriptionsItem label="是否UP">{{ detail.is_up === 1 ? "是" : "否" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="有效用户">{{ detail.is_valid === 1 ? "是" : "否" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="渠道">{{ detail.channel || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="推荐人">
            {{ detail.parent_id ? encodeId(detail.parent_id) || detail.parent_name : "-" }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="粉丝/关注">{{ detail.fans }}/{{ detail.follow }}</ElDescriptionsItem>
          <ElDescriptionsItem label="分享人数">{{ detail.share_num }}</ElDescriptionsItem>
          <ElDescriptionsItem label="设备">{{ deviceText(detail) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="登录次数">{{ detail.login_num }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最后IP">{{ detail.last_ip || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="注册IP">{{ detail.register_ip || "-" }}</ElDescriptionsItem>
          <ElDescriptionsItem label="登录凭证" :span="2">
            <ElButton
              v-if="detail.account_slat"
              link
              type="primary"
              @click="openLoginQr(detail)"
            >
              查看登录二维码(找回账号用)
            </ElButton>
            <span v-else>-</span>
          </ElDescriptionsItem>
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

<style scoped>
.user-search-form :deep(.el-form-item) {
  margin-right: 24px;
  margin-bottom: 16px;
}
.user-search-form :deep(.el-form-item__label) {
  padding-right: 8px;
  font-weight: 500;
}
</style>
