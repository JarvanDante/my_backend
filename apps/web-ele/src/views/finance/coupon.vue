<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

import {
  ElAlert,
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
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";

import {
  type CouponApi,
  createCouponApi,
  deleteCouponApi,
  getCouponListApi,
  getUserCouponListApi,
  grantCouponApi,
  updateCouponApi,
} from "#/api/core/coupon";

defineOptions({ name: "FinanceCoupon" });

const activeTab = ref("tpl");

function money(v: number | undefined) {
  return Number(v ?? 0).toFixed(2);
}

// 券类型/场景常量与 internal/modules/coupon/service 的 Type*/Scene* 对齐
const typeMap: Record<number, string> = { 1: "抵用券", 2: "折扣券" };
const sceneMap: Record<number, string> = {
  1: "充值",
  2: "内容购买",
  3: "通用",
};
const tplStatusOpts = [
  { label: "全部状态", value: "" },
  { label: "启用", value: "1" },
  { label: "停用", value: "0" },
];
const userStatusOpts = [
  { label: "全部状态", value: "" },
  { label: "未使用", value: "1" },
  { label: "已使用", value: "2" },
  { label: "已过期", value: "3" },
];

// ---------- Tab1: 券模板 ----------
const loading = ref(false);
const list = ref<CouponApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
// 筛选值全部 string, 空串=不筛选(后端 status 空串会被转成 -1 表示不过滤)
const search = reactive({ status: "", keyword: "" });

async function fetchList() {
  loading.value = true;
  try {
    const res = await getCouponListApi({
      status: search.status,
      keyword: search.keyword,
      page: page.current,
      size: page.size,
    });
    list.value = res.list || [];
    page.total = res.total || 0;
  } finally {
    loading.value = false;
  }
}
function doSearch() {
  page.current = 1;
  fetchList();
}
function resetSearch() {
  search.status = "";
  search.keyword = "";
  doSearch();
}

const dialog = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
const emptyForm = (): CouponApi.SaveBody & { id: number } => ({
  id: 0,
  name: "",
  type: 1,
  scene: 3,
  face_value: 0,
  discount: 0,
  threshold: 0,
  max_deduct: 0,
  total: -1,
  per_limit: 1,
  expire_day: 7,
  status: 1,
});
const form = reactive(emptyForm());
const rules = {
  name: [{ required: true, message: "券名必填", trigger: "blur" }],
};
/** 抵用券只用 face_value，折扣券只用 discount/max_deduct，两组字段互斥 */
const isCash = computed(() => form.type === 1);

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  dialog.value = true;
}
function openEdit(row: CouponApi.Item) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    name: row.name,
    type: row.type,
    scene: row.scene,
    face_value: row.face_value,
    discount: row.discount,
    threshold: row.threshold,
    max_deduct: row.max_deduct,
    total: row.total,
    per_limit: row.per_limit,
    expire_day: row.expire_day,
    status: row.status,
  });
  dialog.value = true;
}
/** 切换类型时清掉另一组字段，避免运营两边都填、后端存下脏数据 */
function onTypeChange() {
  if (isCash.value) {
    form.discount = 0;
    form.max_deduct = 0;
  } else {
    form.face_value = 0;
  }
}

async function handleSave() {
  await formRef.value?.validate();
  // 与后端 normalizeTpl 的校验保持一致，先在前端给出即时反馈
  if (isCash.value && Number(form.face_value) <= 0) {
    ElMessage.warning("抵用券面额需大于 0");
    return;
  }
  if (!isCash.value && (Number(form.discount) <= 0 || Number(form.discount) >= 100)) {
    ElMessage.warning("折扣需在 1~99 之间（85 表示 85 折）");
    return;
  }
  const body: CouponApi.SaveBody = {
    name: form.name,
    type: form.type,
    scene: form.scene,
    face_value: isCash.value ? Number(form.face_value) || 0 : 0,
    discount: isCash.value ? 0 : Number(form.discount) || 0,
    threshold: Number(form.threshold) || 0,
    max_deduct: isCash.value ? 0 : Number(form.max_deduct) || 0,
    total: Number(form.total) || -1,
    per_limit: Number(form.per_limit) || 0,
    expire_day: Number(form.expire_day) || 0,
    status: form.status,
  };
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateCouponApi(form.id, body);
      ElMessage.success("已保存");
    } else {
      await createCouponApi(body);
      ElMessage.success("已新增");
    }
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: CouponApi.Item) {
  await ElMessageBox.confirm(
    `确认删除券模板「${row.name}」？已发放的券只能停用不能删除：该模板已发放 ${row.issued} 张，只要发放过一张，后端就会拒绝删除，请改用「停用」。`,
    "删除券模板",
    { type: "warning" },
  );
  await deleteCouponApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

/** 停用/启用: 走 Update，后端只在 status 为 0/1 时才写该字段 */
async function toggleStatus(row: CouponApi.Item) {
  const next = row.status === 1 ? 0 : 1;
  await ElMessageBox.confirm(
    next === 0
      ? `停用「${row.name}」后不能再领取/发放，已发出的券不受影响，仍可正常使用。`
      : `启用「${row.name}」，用户可以重新领取。`,
    "提示",
    { type: "warning" },
  );
  await updateCouponApi(row.id, {
    name: row.name,
    type: row.type,
    scene: row.scene,
    face_value: row.face_value,
    discount: row.discount,
    threshold: row.threshold,
    max_deduct: row.max_deduct,
    total: row.total,
    per_limit: row.per_limit,
    expire_day: row.expire_day,
    status: next,
  });
  ElMessage.success(next === 1 ? "已启用" : "已停用");
  fetchList();
}

// ---------- 定向发放 ----------
const grantDialog = ref(false);
const granting = ref(false);
const grantRow = ref<null | CouponApi.Item>(null);
const grantText = ref("");
const grantResult = ref<CouponApi.GrantResult | null>(null);

function openGrant(row: CouponApi.Item) {
  grantRow.value = row;
  grantText.value = "";
  grantResult.value = null;
  grantDialog.value = true;
}
/** 支持换行 / 逗号 / 空格混合分隔，去重后按数字提交 */
function parseUserIds(text: string) {
  const ids = text
    .split(/[\s,，;；]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(ids)];
}
async function submitGrant() {
  if (!grantRow.value) return;
  const ids = parseUserIds(grantText.value);
  if (ids.length === 0) {
    ElMessage.warning("请填写至少一个合法用户ID");
    return;
  }
  granting.value = true;
  try {
    const res = await grantCouponApi(grantRow.value.id, ids);
    grantResult.value = res;
    if (res.failed > 0) {
      ElMessage.warning(`发放完成：成功 ${res.success}，失败 ${res.failed}`);
    } else {
      ElMessage.success(`发放成功 ${res.success} 张`);
    }
    fetchList(); // issued 会变，刷新库存
  } finally {
    granting.value = false;
  }
}

// ---------- Tab2: 用户券记录 ----------
const uLoading = ref(false);
const uList = ref<CouponApi.UserItem[]>([]);
const uPage = reactive({ current: 1, size: 20, total: 0 });
const uSearch = reactive({ tpl_id: "", user_id: "", status: "" });
const uStatusTagType: Record<number, "danger" | "info" | "success"> = {
  1: "success",
  2: "info",
  3: "danger",
};

async function fetchUsers() {
  uLoading.value = true;
  try {
    const res = await getUserCouponListApi({
      tpl_id: uSearch.tpl_id,
      user_id: uSearch.user_id,
      status: uSearch.status,
      page: uPage.current,
      size: uPage.size,
    });
    uList.value = res.list || [];
    uPage.total = res.total || 0;
  } finally {
    uLoading.value = false;
  }
}
function doUserSearch() {
  uPage.current = 1;
  fetchUsers();
}
function resetUserSearch() {
  uSearch.tpl_id = "";
  uSearch.user_id = "";
  uSearch.status = "";
  doUserSearch();
}
/** 从模板行跳到用户券 Tab 并带上 tpl_id 过滤 */
function viewIssued(row: CouponApi.Item) {
  uSearch.tpl_id = String(row.id);
  uSearch.user_id = "";
  uSearch.status = "";
  activeTab.value = "users";
  doUserSearch();
}

function onTab(name: number | string) {
  if (name === "users" && uList.value.length === 0) fetchUsers();
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <ElTabs v-model="activeTab" type="border-card" @tab-change="onTab">
        <!-- ---------- 券模板 ---------- -->
        <ElTabPane label="券模板" name="tpl">
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <ElSelect
              v-model="search.status"
              style="width: 140px"
              @change="doSearch"
            >
              <ElOption
                v-for="o in tplStatusOpts"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </ElSelect>
            <ElInput
              v-model="search.keyword"
              placeholder="券名关键字"
              style="width: 200px"
              clearable
              @keyup.enter="doSearch"
            />
            <ElButton type="primary" @click="doSearch">查询</ElButton>
            <ElButton @click="resetSearch">重置</ElButton>
            <div class="flex-1"></div>
            <ElButton type="primary" @click="openCreate">新增券模板</ElButton>
          </div>

          <ElTable v-loading="loading" :data="list" border stripe>
            <ElTableColumn prop="id" label="ID" width="70" />
            <ElTableColumn
              prop="name"
              label="券名"
              min-width="150"
              show-overflow-tooltip
            />
            <ElTableColumn label="类型" width="90" align="center">
              <template #default="{ row }">
                <ElTag
                  :type="row.type === 1 ? 'success' : 'warning'"
                  size="small"
                >
                  {{ typeMap[row.type] ?? row.type }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="优惠" width="170">
              <template #default="{ row }">
                <!-- 抵用券看 face_value，折扣券看 discount(+封顶)，两者互斥 -->
                <span v-if="row.type === 1" class="text-red-500">
                  减 {{ money(row.face_value) }}
                </span>
                <span v-else class="text-orange-500">
                  {{ (row.discount / 10).toFixed(1) }} 折
                  <span v-if="row.max_deduct > 0" class="text-xs text-gray-400">
                    最高减 {{ money(row.max_deduct) }}
                  </span>
                </span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="门槛" width="110" align="right">
              <template #default="{ row }">
                <span v-if="row.threshold > 0">
                  满 {{ money(row.threshold) }}
                </span>
                <span v-else class="text-gray-400">无门槛</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="场景" width="100" align="center">
              <template #default="{ row }">
                {{ sceneMap[row.scene] ?? row.scene }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="库存" width="120" align="center">
              <template #default="{ row }">
                <span v-if="row.total === -1">
                  {{ row.issued }} / <span class="text-gray-400">不限量</span>
                </span>
                <span v-else :class="row.issued >= row.total ? 'text-red-500' : ''">
                  {{ row.issued }} / {{ row.total }}
                </span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="每人限领" width="90" align="center">
              <template #default="{ row }">
                {{ row.per_limit > 0 ? row.per_limit : "不限" }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="有效期" width="100" align="center">
              <template #default="{ row }">
                {{ row.expire_day }} 天
              </template>
            </ElTableColumn>
            <ElTableColumn label="状态" width="80" align="center">
              <template #default="{ row }">
                <ElTag
                  :type="row.status === 1 ? 'success' : 'info'"
                  size="small"
                >
                  {{ row.status === 1 ? "启用" : "停用" }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="created_at" label="创建时间" width="170" />
            <ElTableColumn label="操作" width="250" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="openGrant(row)">
                  发放
                </ElButton>
                <ElButton link type="primary" @click="viewIssued(row)">
                  记录
                </ElButton>
                <ElButton link type="primary" @click="openEdit(row)">
                  编辑
                </ElButton>
                <ElButton
                  link
                  :type="row.status === 1 ? 'warning' : 'success'"
                  @click="toggleStatus(row)"
                >
                  {{ row.status === 1 ? "停用" : "启用" }}
                </ElButton>
                <ElButton link type="danger" @click="handleDelete(row)">
                  删除
                </ElButton>
              </template>
            </ElTableColumn>
          </ElTable>

          <div class="mt-4 flex justify-end">
            <ElPagination
              v-model:current-page="page.current"
              v-model:page-size="page.size"
              :total="page.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              @size-change="fetchList"
              @current-change="fetchList"
            />
          </div>
        </ElTabPane>

        <!-- ---------- 用户券记录 ---------- -->
        <ElTabPane label="用户券记录" name="users">
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <ElInput
              v-model="uSearch.tpl_id"
              placeholder="券模板ID"
              style="width: 140px"
              clearable
              @keyup.enter="doUserSearch"
            />
            <ElInput
              v-model="uSearch.user_id"
              placeholder="用户ID"
              style="width: 140px"
              clearable
              @keyup.enter="doUserSearch"
            />
            <ElSelect
              v-model="uSearch.status"
              style="width: 140px"
              @change="doUserSearch"
            >
              <ElOption
                v-for="o in userStatusOpts"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </ElSelect>
            <ElButton type="primary" @click="doUserSearch">查询</ElButton>
            <ElButton @click="resetUserSearch">重置</ElButton>
          </div>

          <ElTable v-loading="uLoading" :data="uList" border stripe>
            <ElTableColumn prop="id" label="ID" width="80" />
            <ElTableColumn prop="user_id" label="用户ID" width="90" />
            <ElTableColumn prop="tpl_id" label="模板ID" width="90" />
            <ElTableColumn
              prop="name"
              label="券名"
              min-width="150"
              show-overflow-tooltip
            />
            <ElTableColumn label="类型" width="90" align="center">
              <template #default="{ row }">
                <ElTag
                  :type="row.type === 1 ? 'success' : 'warning'"
                  size="small"
                >
                  {{ typeMap[row.type] ?? row.type }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="优惠" width="150">
              <template #default="{ row }">
                <!-- 面值是领取时的快照，模板改价不影响已发出的券 -->
                <span v-if="row.type === 1" class="text-red-500">
                  减 {{ money(row.face_value) }}
                </span>
                <span v-else class="text-orange-500">
                  {{ (row.discount / 10).toFixed(1) }} 折
                </span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="状态" width="90" align="center">
              <template #default="{ row }">
                <!-- 直接用后端 status_text -->
                <ElTag :type="uStatusTagType[row.status] ?? 'info'" size="small">
                  {{ row.status_text }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn
              prop="ref_id"
              label="核销订单"
              min-width="150"
              show-overflow-tooltip
            />
            <ElTableColumn prop="expire_at" label="过期时间" width="170" />
            <ElTableColumn prop="used_at" label="使用时间" width="170" />
            <ElTableColumn prop="created_at" label="领取时间" width="170" />
          </ElTable>

          <div class="mt-4 flex justify-end">
            <ElPagination
              v-model:current-page="uPage.current"
              v-model:page-size="uPage.size"
              :total="uPage.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              @size-change="fetchUsers"
              @current-change="fetchUsers"
            />
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <!-- 券模板表单 -->
    <ElDialog
      v-model="dialog"
      :title="isEdit ? '编辑券模板' : '新增券模板'"
      width="600px"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="110px">
        <ElFormItem label="券名" prop="name">
          <ElInput v-model="form.name" placeholder="如: 满100减20" />
        </ElFormItem>
        <ElFormItem label="券类型">
          <ElSelect
            v-model="form.type"
            style="width: 180px"
            @change="onTypeChange"
          >
            <ElOption label="抵用券(直接减面额)" :value="1" />
            <ElOption label="折扣券(按折扣率)" :value="2" />
          </ElSelect>
          <span class="ml-2 text-xs text-gray-400">
            两类券的优惠字段互斥，切换会清空另一组
          </span>
        </ElFormItem>
        <!-- 抵用券: 只显示面额 -->
        <ElFormItem v-if="isCash" label="面额">
          <ElInputNumber v-model="form.face_value" :min="0" :precision="2" />
          <span class="ml-2 text-xs text-gray-400">必须大于 0</span>
        </ElFormItem>
        <!-- 折扣券: 只显示折扣与封顶 -->
        <template v-else>
          <ElFormItem label="折扣">
            <ElInputNumber v-model="form.discount" :min="1" :max="99" />
            <span class="ml-2 text-xs text-gray-400">
              85 = 85折，取值 1~99
            </span>
          </ElFormItem>
          <ElFormItem label="最高抵扣">
            <ElInputNumber v-model="form.max_deduct" :min="0" :precision="2" />
            <span class="ml-2 text-xs text-gray-400">
              0 = 不封顶；折扣券建议设封顶，防止大额订单抵扣过多
            </span>
          </ElFormItem>
        </template>
        <ElFormItem label="使用门槛">
          <ElInputNumber v-model="form.threshold" :min="0" :precision="2" />
          <span class="ml-2 text-xs text-gray-400">
            订单金额低于门槛时该券抵扣为 0
          </span>
        </ElFormItem>
        <ElFormItem label="适用场景">
          <ElSelect v-model="form.scene" style="width: 180px">
            <ElOption label="充值" :value="1" />
            <ElOption label="内容购买" :value="2" />
            <ElOption label="通用" :value="3" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="发行总量">
          <ElInputNumber v-model="form.total" :min="-1" />
          <span class="ml-2 text-xs text-gray-400">
            -1 = 不限量；限量时后端按 issued &lt; total 条件递增防超发
          </span>
        </ElFormItem>
        <ElFormItem label="每人限领">
          <ElInputNumber v-model="form.per_limit" :min="0" />
          <span class="ml-2 text-xs text-gray-400">
            0 = 不限；发放时超限的用户会单独失败
          </span>
        </ElFormItem>
        <ElFormItem label="有效天数">
          <ElInputNumber v-model="form.expire_day" :min="1" />
          <span class="ml-2 text-xs text-gray-400">
            领取后 N 天内有效，留空/0 后端按 7 天处理
          </span>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="form.status" style="width: 180px">
            <ElOption label="启用" :value="1" />
            <ElOption label="停用" :value="0" />
          </ElSelect>
          <span class="ml-2 text-xs text-gray-400">停用后不可领取/发放</span>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">
          保存
        </ElButton>
      </template>
    </ElDialog>

    <!-- 定向发放 -->
    <ElDialog
      v-model="grantDialog"
      :title="`定向发放 - ${grantRow?.name ?? ''}`"
      width="600px"
    >
      <div class="mb-3 rounded bg-gray-50 p-2 text-xs leading-5 text-gray-600">
        逐个用户发放，单个失败不影响其他人。常见失败原因：已达该券领取上限（每人限领
        {{ grantRow?.per_limit || "不限" }}）、该券已领完（总量用尽）、券已停用。
      </div>
      <ElInput
        v-model="grantText"
        type="textarea"
        :rows="6"
        placeholder="用户ID，一行一个，或用逗号/空格分隔，自动去重"
      />
      <div v-if="grantResult" class="mt-3">
        <ElAlert
          :type="grantResult.failed > 0 ? 'warning' : 'success'"
          :closable="false"
          :title="`成功 ${grantResult.success} 张，失败 ${grantResult.failed} 张`"
        />
        <div
          v-if="grantResult.errors && grantResult.errors.length > 0"
          class="mt-2 max-h-40 overflow-auto rounded bg-red-50 p-2 text-xs leading-5 text-red-600"
        >
          <div v-for="(e, i) in grantResult.errors" :key="i">{{ e }}</div>
        </div>
      </div>
      <template #footer>
        <ElButton @click="grantDialog = false">关闭</ElButton>
        <ElButton type="primary" :loading="granting" @click="submitGrant">
          确认发放
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>
