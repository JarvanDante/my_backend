<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElAlert,
  ElButton,
  ElCard,
  ElDialog,
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
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";

import {
  createRedeemGoodsApi,
  deleteRedeemGoodsApi,
  getRedeemGoodsListApi,
  getRedeemGoodsOrdersApi,
  type RedeemGoodsApi,
  updateRedeemGoodsApi,
} from "#/api/core/redeemgoods";

defineOptions({ name: "OpsRedeemGoods" });

const activeTab = ref("goods");

// stock = -1 是后端约定的"不限量"哨兵值(Exchange 只在 stock > 0 时才递减库存)
const UNLIMITED_STOCK = -1;

/* ==================== 商品 ==================== */
const loading = ref(false);
const list = ref<RedeemGoodsApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
// status 保持 string: 空串=全部(后端 statusOf("")=-1), 传 0 会被当成"只看下架"
const search = reactive({ status: "", keyword: "" });
const statusOpts = [
  { label: "全部", value: "" },
  { label: "下架", value: "0" },
  { label: "上架", value: "1" },
];

async function loadGoods() {
  loading.value = true;
  try {
    const res = await getRedeemGoodsListApi({
      status: search.status,
      keyword: search.keyword || undefined,
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
  loadGoods();
}
function resetSearch() {
  search.status = "";
  search.keyword = "";
  doSearch();
}

/** 列表里 -1 要显示成"不限量", 0 是真的兑完了 */
function stockText(stock: number) {
  if (stock === UNLIMITED_STOCK) return "不限量";
  if (stock <= 0) return "已兑完";
  return String(stock);
}

const dialog = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
const emptyForm = () => ({
  id: 0,
  name: "",
  cover: "",
  intro: "",
  cost_gold: 1,
  stock: 100,
  unlimited: false, // 仅前端开关, 提交时映射成 stock = -1
  rank: 0,
  status: 1,
});
const form = reactive(emptyForm());
const rules = {
  name: [{ required: true, message: "商品名必填", trigger: "blur" }],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  dialog.value = true;
}
function openEdit(row: RedeemGoodsApi.Item) {
  isEdit.value = true;
  const unlimited = row.stock === UNLIMITED_STOCK;
  Object.assign(form, {
    id: row.id,
    name: row.name,
    cover: row.cover,
    intro: row.intro,
    cost_gold: row.cost_gold,
    // 不限量时输入框回落到 0, 关掉开关后运营需自行填库存
    stock: unlimited ? 0 : row.stock,
    unlimited,
    rank: row.rank,
    status: row.status,
  });
  dialog.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  if (Number(form.cost_gold) <= 0) {
    ElMessage.warning("金币价需大于 0");
    return;
  }
  const body: RedeemGoodsApi.SaveBody = {
    name: form.name,
    cover: form.cover,
    intro: form.intro,
    cost_gold: Number(form.cost_gold),
    // 后端 Update 对 stock 是无条件覆盖, 所以每次都要把完整库存值带上
    stock: form.unlimited ? UNLIMITED_STOCK : Number(form.stock) || 0,
    rank: Number(form.rank) || 0,
    status: form.status,
  };
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateRedeemGoodsApi(form.id, body);
      ElMessage.success("已保存");
    } else {
      await createRedeemGoodsApi(body);
      ElMessage.success("已新增");
    }
    dialog.value = false;
    loadGoods();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: RedeemGoodsApi.Item) {
  await ElMessageBox.confirm(
    `确认删除商品「${row.name}」? 已产生的兑换记录不会被删除。`,
    "提示",
    { type: "warning" },
  );
  await deleteRedeemGoodsApi(row.id);
  ElMessage.success("已删除");
  loadGoods();
}

/* ==================== 兑换记录 ==================== */
const orderLoading = ref(false);
const orders = ref<RedeemGoodsApi.OrderItem[]>([]);
const orderPage = reactive({ current: 1, size: 20, total: 0 });
// user_id / goods_id 契约是 int64, 这里用 string 承接输入框, 提交前转 number; 空串=不筛选
const orderSearch = reactive({ user_id: "", goods_id: "" });

async function loadOrders() {
  orderLoading.value = true;
  try {
    const res = await getRedeemGoodsOrdersApi({
      user_id: orderSearch.user_id ? Number(orderSearch.user_id) : undefined,
      goods_id: orderSearch.goods_id ? Number(orderSearch.goods_id) : undefined,
      page: orderPage.current,
      size: orderPage.size,
    });
    orders.value = res.list || [];
    orderPage.total = res.total || 0;
  } finally {
    orderLoading.value = false;
  }
}
function orderSearchDo() {
  orderPage.current = 1;
  loadOrders();
}
function orderReset() {
  orderSearch.user_id = "";
  orderSearch.goods_id = "";
  orderSearchDo();
}

// Tab 懒加载: 只有第一次切过去才拉数据
const loadedTabs = reactive<Record<string, boolean>>({ goods: true });
function onTabChange(name: string) {
  if (loadedTabs[name]) return;
  loadedTabs[name] = true;
  if (name === "orders") loadOrders();
}

/** 从商品行跳到它的兑换记录 */
function viewOrders(row: RedeemGoodsApi.Item) {
  orderSearch.user_id = "";
  orderSearch.goods_id = String(row.id);
  loadedTabs.orders = true; // 手动置位, 免得 onTabChange 再拉一次
  activeTab.value = "orders";
  orderSearchDo();
}

onMounted(loadGoods);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <ElTabs v-model="activeTab" type="border-card" @tab-change="onTabChange">
        <!-- ---------- 商品 ---------- -->
        <ElTabPane label="兑换商品" name="goods">
          <ElAlert
            class="mb-3"
            type="info"
            :closable="false"
            show-icon
            title="用户用金币兑换商品, 兑换即扣余额并写余额流水"
            description="库存填 -1(或打开「不限量」开关)表示不限量, 永不扣减; 库存为 0 时前台提示已兑完。"
          />
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <ElSelect v-model="search.status" style="width: 120px" @change="doSearch">
              <ElOption
                v-for="o in statusOpts"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </ElSelect>
            <ElInput
              v-model="search.keyword"
              placeholder="商品名关键字"
              style="width: 220px"
              clearable
              @keyup.enter="doSearch"
            />
            <ElButton type="primary" @click="doSearch">查询</ElButton>
            <ElButton @click="resetSearch">重置</ElButton>
            <div class="flex-1"></div>
            <ElButton type="primary" @click="openCreate">新增商品</ElButton>
          </div>

          <ElTable v-loading="loading" :data="list" border stripe>
            <ElTableColumn prop="id" label="ID" width="70" />
            <ElTableColumn label="封面" width="80">
              <template #default="{ row }">
                <ElImage
                  v-if="row.cover"
                  :src="row.cover"
                  fit="cover"
                  style="width: 48px; height: 48px"
                  preview-teleported
                  :preview-src-list="[row.cover]"
                />
                <span v-else class="text-gray-400">-</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="name" label="商品名" min-width="150" show-overflow-tooltip />
            <ElTableColumn prop="intro" label="简介" min-width="180" show-overflow-tooltip />
            <ElTableColumn label="金币价" width="130">
              <template #default="{ row }">
                <ElTag type="warning" size="small">
                  {{ Number(row.cost_gold).toFixed(2) }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="库存" width="100" align="center">
              <template #default="{ row }">
                <ElTag
                  v-if="row.stock === -1"
                  type="success"
                  size="small"
                  effect="plain"
                >
                  不限量
                </ElTag>
                <ElTag v-else-if="row.stock <= 0" type="danger" size="small">
                  已兑完
                </ElTag>
                <span v-else>{{ stockText(row.stock) }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="exchanged" label="已兑换" width="90" align="center" />
            <ElTableColumn prop="rank" label="权重" width="80" align="center" />
            <ElTableColumn label="状态" width="90" align="center">
              <template #default="{ row }">
                <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? "上架" : "下架" }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="created_at" label="创建时间" width="170" />
            <ElTableColumn label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="viewOrders(row)">记录</ElButton>
                <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
                <ElButton link type="danger" @click="handleDelete(row)">删除</ElButton>
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
              @size-change="loadGoods"
              @current-change="loadGoods"
            />
          </div>
        </ElTabPane>

        <!-- ---------- 兑换记录 ---------- -->
        <ElTabPane label="兑换记录" name="orders">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <ElInput
              v-model="orderSearch.user_id"
              placeholder="用户ID"
              style="width: 140px"
              clearable
              @keyup.enter="orderSearchDo"
            />
            <ElInput
              v-model="orderSearch.goods_id"
              placeholder="商品ID"
              style="width: 140px"
              clearable
              @keyup.enter="orderSearchDo"
            />
            <ElButton type="primary" @click="orderSearchDo">查询</ElButton>
            <ElButton @click="orderReset">重置</ElButton>
          </div>

          <ElTable v-loading="orderLoading" :data="orders" border stripe>
            <ElTableColumn prop="id" label="订单ID" width="90" />
            <ElTableColumn prop="user_id" label="用户ID" width="100" />
            <ElTableColumn prop="goods_id" label="商品ID" width="100" />
            <ElTableColumn prop="goods_name" label="商品名" min-width="180" show-overflow-tooltip />
            <ElTableColumn label="消耗金币" width="130">
              <template #default="{ row }">
                {{ Number(row.cost_gold).toFixed(2) }}
              </template>
            </ElTableColumn>
            <ElTableColumn prop="created_at" label="兑换时间" width="180" />
          </ElTable>

          <div class="mt-4 flex justify-end">
            <ElPagination
              v-model:current-page="orderPage.current"
              v-model:page-size="orderPage.size"
              :total="orderPage.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              @size-change="loadOrders"
              @current-change="loadOrders"
            />
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <!-- 商品表单 -->
    <ElDialog
      v-model="dialog"
      :title="isEdit ? '编辑商品' : '新增商品'"
      width="580px"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="商品名" prop="name">
          <ElInput v-model="form.name" />
        </ElFormItem>
        <ElFormItem label="封面">
          <ElInput v-model="form.cover" placeholder="图片 URL" />
        </ElFormItem>
        <ElFormItem label="简介">
          <ElInput v-model="form.intro" type="textarea" :rows="3" />
        </ElFormItem>
        <ElFormItem label="金币价">
          <ElInputNumber v-model="form.cost_gold" :min="0.01" :precision="2" :step="1" />
          <span class="ml-2 text-xs text-gray-400">必须大于 0</span>
        </ElFormItem>
        <ElFormItem label="不限量">
          <ElSwitch v-model="form.unlimited" />
          <span class="ml-2 text-xs text-gray-400">
            打开后提交库存 -1, 兑换不扣库存
          </span>
        </ElFormItem>
        <ElFormItem label="库存">
          <ElInputNumber v-model="form.stock" :min="0" :disabled="form.unlimited" />
          <span class="ml-2 text-xs text-gray-400">
            {{ form.unlimited ? "已设为不限量" : "0 = 已兑完, 前台不可兑" }}
          </span>
        </ElFormItem>
        <ElFormItem v-if="isEdit" label="已兑换">
          <span class="text-gray-500">该字段由兑换流程累加, 后台不可改</span>
        </ElFormItem>
        <ElFormItem label="排序权重">
          <ElInputNumber v-model="form.rank" :min="0" />
          <span class="ml-2 text-xs text-gray-400">越大越靠前</span>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="form.status" style="width: 160px">
            <ElOption label="上架" :value="1" />
            <ElOption label="下架" :value="0" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
