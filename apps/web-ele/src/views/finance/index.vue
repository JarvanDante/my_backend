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
  ElPagination,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";

import {
  createRechargePkgApi,
  createVipPkgApi,
  deleteRechargePkgApi,
  deleteVipPkgApi,
  type FinanceApi,
  getBalanceLogListApi,
  getOrderListApi,
  getRechargePkgListApi,
  getVipPkgListApi,
  updateRechargePkgApi,
  updateVipPkgApi,
} from "#/api/core/finance";

defineOptions({ name: "FinanceManage" });

const activeTab = ref("recharge");

// ---------- 充值套餐 ----------
const rpkgs = ref<FinanceApi.RechargePkg[]>([]);
const rpkgLoading = ref(false);
async function loadRpkgs() {
  rpkgLoading.value = true;
  try {
    const res = await getRechargePkgListApi();
    rpkgs.value = res.list || [];
  } finally {
    rpkgLoading.value = false;
  }
}
const rDialog = ref(false);
const rEdit = ref(false);
const rForm = reactive<any>({ id: 0, name: "", amount: 0, coin: 0, bonus: 0, sort: 0, status: true });
function openRCreate() {
  rEdit.value = false;
  Object.assign(rForm, { id: 0, name: "", amount: 0, coin: 0, bonus: 0, sort: 0, status: true });
  rDialog.value = true;
}
function openREdit(row: FinanceApi.RechargePkg) {
  rEdit.value = true;
  Object.assign(rForm, { ...row, status: row.status === 1 });
  rDialog.value = true;
}
async function saveR() {
  const p = { ...rForm, status: rForm.status ? 1 : 0 };
  if (rEdit.value) await updateRechargePkgApi(p);
  else await createRechargePkgApi(p);
  ElMessage.success("保存成功");
  rDialog.value = false;
  loadRpkgs();
}
async function delR(row: FinanceApi.RechargePkg) {
  await ElMessageBox.confirm(`删除充值套餐「${row.name}」?`, "提示", { type: "warning" });
  await deleteRechargePkgApi(row.id);
  ElMessage.success("已删除");
  loadRpkgs();
}

// ---------- VIP 套餐 ----------
const vpkgs = ref<FinanceApi.VipPkg[]>([]);
const vpkgLoading = ref(false);
async function loadVpkgs() {
  vpkgLoading.value = true;
  try {
    const res = await getVipPkgListApi();
    vpkgs.value = res.list || [];
  } finally {
    vpkgLoading.value = false;
  }
}
const vDialog = ref(false);
const vEdit = ref(false);
const vForm = reactive<any>({ id: 0, name: "", days: 30, price: 0, group_id: 0, sort: 0, status: true });
function openVCreate() {
  vEdit.value = false;
  Object.assign(vForm, { id: 0, name: "", days: 30, price: 0, group_id: 0, sort: 0, status: true });
  vDialog.value = true;
}
function openVEdit(row: FinanceApi.VipPkg) {
  vEdit.value = true;
  Object.assign(vForm, { ...row, status: row.status === 1 });
  vDialog.value = true;
}
async function saveV() {
  const p = { ...vForm, status: vForm.status ? 1 : 0 };
  if (vEdit.value) await updateVipPkgApi(p);
  else await createVipPkgApi(p);
  ElMessage.success("保存成功");
  vDialog.value = false;
  loadVpkgs();
}
async function delV(row: FinanceApi.VipPkg) {
  await ElMessageBox.confirm(`删除VIP套餐「${row.name}」?`, "提示", { type: "warning" });
  await deleteVipPkgApi(row.id);
  ElMessage.success("已删除");
  loadVpkgs();
}

// ---------- 充值订单 ----------
const orders = ref<FinanceApi.OrderItem[]>([]);
const orderLoading = ref(false);
const orderPage = reactive({ current: 1, size: 20, total: 0 });
const orderSearch = reactive({ order_no: "", status: 0 });
const orderStatusOpts = [
  { label: "全部", value: 0 },
  { label: "待支付", value: 1 },
  { label: "已支付", value: 2 },
  { label: "已取消", value: 3 },
];
const orderStatusTag: Record<number, { t: string; type: "info" | "success" | "danger" }> = {
  0: { t: "待支付", type: "info" },
  1: { t: "已支付", type: "success" },
  [-1]: { t: "已取消", type: "danger" },
};
async function loadOrders() {
  orderLoading.value = true;
  try {
    const res = await getOrderListApi({
      order_no: orderSearch.order_no || undefined,
      status: orderSearch.status,
      page: orderPage.current,
      size: orderPage.size,
    });
    orders.value = res.list || [];
    orderPage.total = res.total || 0;
  } finally {
    orderLoading.value = false;
  }
}

// ---------- 全站流水 ----------
const blogs = ref<FinanceApi.BalanceLogItem[]>([]);
const blogLoading = ref(false);
const blogPage = reactive({ current: 1, size: 20, total: 0 });
const blogSearch = reactive({ scene: "", direction: 0 });
async function loadBlogs() {
  blogLoading.value = true;
  try {
    const res = await getBalanceLogListApi({
      scene: blogSearch.scene || undefined,
      direction: blogSearch.direction,
      page: blogPage.current,
      size: blogPage.size,
    });
    blogs.value = res.list || [];
    blogPage.total = res.total || 0;
  } finally {
    blogLoading.value = false;
  }
}

function onTab(name: string | number) {
  if (name === "recharge" && !rpkgs.value.length) loadRpkgs();
  if (name === "vip" && !vpkgs.value.length) loadVpkgs();
  if (name === "orders") loadOrders();
  if (name === "logs") loadBlogs();
}

onMounted(loadRpkgs);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <ElTabs v-model="activeTab" type="border-card" @tab-change="onTab">
        <!-- 充值套餐 -->
        <ElTabPane label="充值套餐" name="recharge">
          <div class="mb-3">
            <ElButton type="primary" @click="openRCreate">新建充值套餐</ElButton>
          </div>
          <ElTable v-loading="rpkgLoading" :data="rpkgs" border stripe>
            <ElTableColumn prop="id" label="ID" width="70" />
            <ElTableColumn prop="name" label="名称" min-width="140" />
            <ElTableColumn prop="amount" label="价格(元)" width="100" align="right" />
            <ElTableColumn prop="coin" label="到账金币" width="100" align="right" />
            <ElTableColumn prop="bonus" label="赠送" width="90" align="right" />
            <ElTableColumn prop="sort" label="排序" width="70" align="center" />
            <ElTableColumn label="状态" width="80" align="center">
              <template #default="{ row }">
                <ElTag :type="row.status === 1 ? 'success' : 'info'">
                  {{ row.status === 1 ? "上架" : "下架" }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="openREdit(row)">编辑</ElButton>
                <ElButton link type="danger" @click="delR(row)">删除</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>

        <!-- VIP 套餐 -->
        <ElTabPane label="VIP套餐" name="vip">
          <div class="mb-3">
            <ElButton type="primary" @click="openVCreate">新建VIP套餐</ElButton>
          </div>
          <ElTable v-loading="vpkgLoading" :data="vpkgs" border stripe>
            <ElTableColumn prop="id" label="ID" width="70" />
            <ElTableColumn prop="name" label="名称" min-width="140" />
            <ElTableColumn prop="days" label="时长(天)" width="100" align="right" />
            <ElTableColumn prop="price" label="金币价" width="100" align="right" />
            <ElTableColumn prop="group_id" label="关联组" width="90" align="center" />
            <ElTableColumn prop="sort" label="排序" width="70" align="center" />
            <ElTableColumn label="状态" width="80" align="center">
              <template #default="{ row }">
                <ElTag :type="row.status === 1 ? 'success' : 'info'">
                  {{ row.status === 1 ? "上架" : "下架" }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="openVEdit(row)">编辑</ElButton>
                <ElButton link type="danger" @click="delV(row)">删除</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>

        <!-- 充值订单 -->
        <ElTabPane label="充值订单" name="orders">
          <div class="mb-3 flex items-center gap-2">
            <ElInput v-model="orderSearch.order_no" placeholder="订单号" clearable style="width: 200px" @keyup.enter="loadOrders" />
            <ElSelect v-model="orderSearch.status" style="width: 120px">
              <ElOption v-for="o in orderStatusOpts" :key="o.value" :label="o.label" :value="o.value" />
            </ElSelect>
            <ElButton type="primary" @click="loadOrders">查询</ElButton>
          </div>
          <ElTable v-loading="orderLoading" :data="orders" border stripe>
            <ElTableColumn prop="order_no" label="订单号" min-width="200" />
            <ElTableColumn prop="user_id" label="用户ID" width="90" />
            <ElTableColumn prop="amount" label="金额" width="90" align="right" />
            <ElTableColumn prop="coin" label="金币" width="90" align="right" />
            <ElTableColumn label="状态" width="90" align="center">
              <template #default="{ row }">
                <ElTag :type="orderStatusTag[row.status]?.type">{{ orderStatusTag[row.status]?.t }}</ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="pay_at" label="支付时间" width="170" />
            <ElTableColumn prop="created_at" label="创建时间" width="170" />
          </ElTable>
          <div class="mt-3 flex justify-end">
            <ElPagination
              v-model:current-page="orderPage.current"
              :total="orderPage.total"
              :page-size="orderPage.size"
              layout="total, prev, pager, next"
              @current-change="loadOrders"
            />
          </div>
        </ElTabPane>

        <!-- 全站流水 -->
        <ElTabPane label="全站流水" name="logs">
          <div class="mb-3 flex items-center gap-2">
            <ElInput v-model="blogSearch.scene" placeholder="场景 如 recharge" clearable style="width: 180px" @keyup.enter="loadBlogs" />
            <ElSelect v-model="blogSearch.direction" style="width: 120px">
              <ElOption label="全部" :value="0" />
              <ElOption label="收入" :value="1" />
              <ElOption label="支出" :value="2" />
            </ElSelect>
            <ElButton type="primary" @click="loadBlogs">查询</ElButton>
          </div>
          <ElTable v-loading="blogLoading" :data="blogs" border stripe>
            <ElTableColumn prop="user_id" label="用户ID" width="90" />
            <ElTableColumn label="方向" width="70" align="center">
              <template #default="{ row }">
                <ElTag :type="row.direction === 1 ? 'success' : 'danger'" size="small">
                  {{ row.direction === 1 ? "收入" : "支出" }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="scene" label="场景" width="120" />
            <ElTableColumn prop="amount" label="金额" width="90" align="right" />
            <ElTableColumn prop="balance_after" label="变动后" width="100" align="right" />
            <ElTableColumn prop="ref_id" label="关联" min-width="160" show-overflow-tooltip />
            <ElTableColumn prop="remark" label="备注" min-width="120" show-overflow-tooltip />
            <ElTableColumn prop="created_at" label="时间" width="170" />
          </ElTable>
          <div class="mt-3 flex justify-end">
            <ElPagination
              v-model:current-page="blogPage.current"
              :total="blogPage.total"
              :page-size="blogPage.size"
              layout="total, prev, pager, next"
              @current-change="loadBlogs"
            />
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <!-- 充值套餐弹窗 -->
    <ElDialog v-model="rDialog" :title="rEdit ? '编辑充值套餐' : '新建充值套餐'" width="440px">
      <ElForm label-width="90px">
        <ElFormItem label="名称"><ElInput v-model="rForm.name" /></ElFormItem>
        <ElFormItem label="价格(元)"><ElInputNumber v-model="rForm.amount" :min="0" :precision="2" /></ElFormItem>
        <ElFormItem label="到账金币"><ElInputNumber v-model="rForm.coin" :min="0" /></ElFormItem>
        <ElFormItem label="赠送金币"><ElInputNumber v-model="rForm.bonus" :min="0" /></ElFormItem>
        <ElFormItem label="排序"><ElInputNumber v-model="rForm.sort" :min="0" /></ElFormItem>
        <ElFormItem label="上架"><ElSwitch v-model="rForm.status" /></ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="rDialog = false">取消</ElButton>
        <ElButton type="primary" @click="saveR">保存</ElButton>
      </template>
    </ElDialog>

    <!-- VIP套餐弹窗 -->
    <ElDialog v-model="vDialog" :title="vEdit ? '编辑VIP套餐' : '新建VIP套餐'" width="440px">
      <ElForm label-width="90px">
        <ElFormItem label="名称"><ElInput v-model="vForm.name" /></ElFormItem>
        <ElFormItem label="时长(天)"><ElInputNumber v-model="vForm.days" :min="1" /></ElFormItem>
        <ElFormItem label="金币价"><ElInputNumber v-model="vForm.price" :min="0" :precision="2" /></ElFormItem>
        <ElFormItem label="关联组ID"><ElInputNumber v-model="vForm.group_id" :min="0" /></ElFormItem>
        <ElFormItem label="排序"><ElInputNumber v-model="vForm.sort" :min="0" /></ElFormItem>
        <ElFormItem label="上架"><ElSwitch v-model="vForm.status" /></ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="vDialog = false">取消</ElButton>
        <ElButton type="primary" @click="saveV">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
