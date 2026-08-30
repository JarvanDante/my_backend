<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
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
  getCustomerUrlApi,
  getFollowListApi,
  getMessageListApi,
  getNoticeListApi,
  getShareLogListApi,
  getShareStatsApi,
  type OpsApi,
  pushNoticeApi,
  setCustomerUrlApi,
  setNoticeStatusApi,
} from "#/api/core/ops";
import { encodeId } from "#/utils/idcrypt";

defineOptions({ name: "OpsManage" });

const activeTab = ref("notice");

// ---------- 公告 ----------
const notices = ref<OpsApi.NoticeItem[]>([]);
const nLoading = ref(false);
const nPage = reactive({ current: 1, size: 20, total: 0 });
async function loadNotices() {
  nLoading.value = true;
  try {
    const res = await getNoticeListApi({ page: nPage.current, size: nPage.size });
    notices.value = res.list || [];
    nPage.total = res.total || 0;
  } finally {
    nLoading.value = false;
  }
}
const pushDialog = ref(false);
const pushForm = reactive({ title: "", content: "", type: "notice" });
function openPush() {
  Object.assign(pushForm, { title: "", content: "", type: "notice" });
  pushDialog.value = true;
}
async function doPush() {
  if (!pushForm.title || !pushForm.content) return ElMessage.warning("标题和内容必填");
  await pushNoticeApi(pushForm);
  ElMessage.success("发布成功");
  pushDialog.value = false;
  loadNotices();
}
async function toggleNotice(row: OpsApi.NoticeItem) {
  await setNoticeStatusApi(row.id, row.status === 1 ? 0 : 1);
  ElMessage.success("已更新");
  loadNotices();
}

// ---------- 客服链接 ----------
const customerUrl = ref("");
const urlLoading = ref(false);
async function loadUrl() {
  const res = await getCustomerUrlApi();
  customerUrl.value = res.url || "";
}
async function saveUrl() {
  urlLoading.value = true;
  try {
    await setCustomerUrlApi(customerUrl.value);
    ElMessage.success("已保存(前台即时生效)");
  } finally {
    urlLoading.value = false;
  }
}

// ---------- 消息监控 ----------
const msgs = ref<OpsApi.MessageItem[]>([]);
const mLoading = ref(false);
const mPage = reactive({ current: 1, size: 20, total: 0 });
const mSearch = reactive({ keyword: "" });
async function loadMsgs() {
  mLoading.value = true;
  try {
    const res = await getMessageListApi({ keyword: mSearch.keyword || undefined, page: mPage.current, size: mPage.size });
    msgs.value = res.list || [];
    mPage.total = res.total || 0;
  } finally {
    mLoading.value = false;
  }
}

// ---------- 关注 ----------
const follows = ref<OpsApi.FollowItem[]>([]);
const fLoading = ref(false);
const fPage = reactive({ current: 1, size: 20, total: 0 });
const fSearch = reactive({ user_id: undefined as number | undefined });
async function loadFollows() {
  fLoading.value = true;
  try {
    const res = await getFollowListApi({ user_id: fSearch.user_id || undefined, page: fPage.current, size: fPage.size });
    follows.value = res.list || [];
    fPage.total = res.total || 0;
  } finally {
    fLoading.value = false;
  }
}

// ---------- 分享统计 ----------
const shareStats = ref<OpsApi.ShareStats | null>(null);
const ssLoading = ref(false);
async function loadShareStats() {
  ssLoading.value = true;
  try {
    shareStats.value = await getShareStatsApi(20);
  } finally {
    ssLoading.value = false;
  }
}

function onTab(name: string | number) {
  if (name === "notice") loadNotices();
  if (name === "customer") loadUrl();
  if (name === "message") loadMsgs();
  if (name === "follow") loadFollows();
  if (name === "share") loadShareStats();
}

onMounted(loadNotices);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <ElTabs v-model="activeTab" type="border-card" @tab-change="onTab">
        <!-- 公告 -->
        <ElTabPane label="系统公告" name="notice">
          <div class="mb-3"><ElButton type="primary" @click="openPush">发布公告/推送</ElButton></div>
          <ElTable v-loading="nLoading" :data="notices" border stripe>
            <ElTableColumn prop="id" label="ID" width="70" />
            <ElTableColumn prop="title" label="标题" min-width="160" />
            <ElTableColumn prop="type" label="类型" width="90" align="center" />
            <ElTableColumn label="状态" width="80" align="center">
              <template #default="{ row }">
                <ElTag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? "上架" : "下线" }}</ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="created_at" label="发布时间" width="170" />
            <ElTableColumn label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <ElButton link :type="row.status === 1 ? 'danger' : 'success'" @click="toggleNotice(row)">
                  {{ row.status === 1 ? "下线" : "上架" }}
                </ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
          <div class="mt-3 flex justify-end">
            <ElPagination v-model:current-page="nPage.current" :total="nPage.total" :page-size="nPage.size" layout="total, prev, pager, next" @current-change="loadNotices" />
          </div>
        </ElTabPane>

        <!-- 客服链接 -->
        <ElTabPane label="客服配置" name="customer">
          <div class="max-w-xl">
            <ElFormItem label="客服链接" label-width="90px">
              <ElInput v-model="customerUrl" placeholder="https://..." />
            </ElFormItem>
            <div class="pl-[90px]">
              <ElButton type="primary" :loading="urlLoading" @click="saveUrl">保存</ElButton>
              <span class="text-muted-foreground ml-3 text-xs">保存后前台「客服链接」接口即时返回新值</span>
            </div>
          </div>
        </ElTabPane>

        <!-- 消息监控 -->
        <ElTabPane label="消息监控" name="message">
          <div class="mb-3 flex items-center gap-2">
            <ElInput v-model="mSearch.keyword" placeholder="内容关键字" clearable style="width: 220px" @keyup.enter="loadMsgs" />
            <ElButton type="primary" @click="loadMsgs">查询</ElButton>
          </div>
          <ElTable v-loading="mLoading" :data="msgs" border stripe>
            <ElTableColumn prop="id" label="ID" width="80" />
            <ElTableColumn prop="from_id" label="发送方" width="90" />
            <ElTableColumn prop="to_id" label="接收方" width="90" />
            <ElTableColumn prop="content" label="内容" min-width="240" show-overflow-tooltip />
            <ElTableColumn prop="created_at" label="时间" width="170" />
          </ElTable>
          <div class="mt-3 flex justify-end">
            <ElPagination v-model:current-page="mPage.current" :total="mPage.total" :page-size="mPage.size" layout="total, prev, pager, next" @current-change="loadMsgs" />
          </div>
        </ElTabPane>

        <!-- 关注 -->
        <ElTabPane label="关注关系" name="follow">
          <div class="mb-3 flex items-center gap-2">
            <ElInput v-model.number="fSearch.user_id" placeholder="关注人用户ID" clearable style="width: 180px" @keyup.enter="loadFollows" />
            <ElButton type="primary" @click="loadFollows">查询</ElButton>
          </div>
          <ElTable v-loading="fLoading" :data="follows" border stripe>
            <ElTableColumn prop="user_id" label="关注人ID" width="100" />
            <ElTableColumn prop="user_name" label="关注人" min-width="140" />
            <ElTableColumn prop="home_id" label="被关注ID" width="100" />
            <ElTableColumn prop="home_name" label="被关注人" min-width="140" />
            <ElTableColumn prop="created_at" label="时间" width="170" />
          </ElTable>
          <div class="mt-3 flex justify-end">
            <ElPagination v-model:current-page="fPage.current" :total="fPage.total" :page-size="fPage.size" layout="total, prev, pager, next" @current-change="loadFollows" />
          </div>
        </ElTabPane>

        <!-- 分享统计 -->
        <ElTabPane label="分享/拉新" name="share">
          <div v-loading="ssLoading">
            <div v-if="shareStats" class="mb-4 flex gap-8">
              <div>分享总次数: <b>{{ shareStats.total_shares }}</b></div>
              <div>分享人数: <b>{{ shareStats.sharer_count }}</b></div>
            </div>
            <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div>
                <div class="mb-2 font-medium">渠道分布</div>
                <ElTable :data="shareStats?.channels || []" border size="small">
                  <ElTableColumn prop="channel" label="渠道" />
                  <ElTableColumn prop="count" label="次数" width="100" align="right" />
                </ElTable>
              </div>
              <div>
                <div class="mb-2 font-medium">拉新排行</div>
                <ElTable :data="shareStats?.invite_rank || []" border size="small">
                  <ElTableColumn prop="user_id" label="用户ID" width="90" />
                  <ElTableColumn label="推荐人">
                    <template #default="{ row }">
                      {{ encodeId(row.user_id) || row.username }}
                    </template>
                  </ElTableColumn>
                  <ElTableColumn prop="invite_count" label="拉新数" width="100" align="right" />
                </ElTable>
              </div>
            </div>
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <ElDialog v-model="pushDialog" title="发布公告/推送" width="480px">
      <ElForm label-width="70px">
        <ElFormItem label="类型">
          <ElSelect v-model="pushForm.type" style="width: 100%">
            <ElOption label="公告(notice)" value="notice" />
            <ElOption label="推送(push)" value="push" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="标题"><ElInput v-model="pushForm.title" /></ElFormItem>
        <ElFormItem label="内容"><ElInput v-model="pushForm.content" type="textarea" :rows="4" /></ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="pushDialog = false">取消</ElButton>
        <ElButton type="primary" @click="doPush">发布</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
