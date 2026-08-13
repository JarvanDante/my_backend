<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElAlert,
  ElButton,
  ElCard,
  ElDatePicker,
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
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";

import {
  addFilterWordsApi,
  createAnnApi,
  createJumptabApi,
  deleteAnnApi,
  deleteFilterWordApi,
  deleteJumptabApi,
  getAnnListApi,
  getFilterWordListApi,
  getJumptabListApi,
  type OpsConfigApi,
  updateAnnApi,
  updateJumptabApi,
} from "#/api/core/opsconfig";

defineOptions({ name: "OpsConfig" });

const activeTab = ref("announcement");

// 三个 Tab 共用的启用/禁用编码(后端 status 只认 0/1)
const statusOpts = [
  { label: "全部", value: "" },
  { label: "关闭", value: "0" },
  { label: "开启", value: "1" },
];

/* ==================== 公告 ==================== */
const annLoading = ref(false);
const annList = ref<OpsConfigApi.AnnItem[]>([]);
const annPage = reactive({ current: 1, size: 20, total: 0 });
// 筛选参数保持 string, 空串=不筛选(后端 statusOf("")=-1 才是"全部")
const annSearch = reactive({ status: "" });

async function loadAnn() {
  annLoading.value = true;
  try {
    const res = await getAnnListApi({
      status: annSearch.status,
      page: annPage.current,
      size: annPage.size,
    });
    annList.value = res.list || [];
    annPage.total = res.total || 0;
  } finally {
    annLoading.value = false;
  }
}
function annSearchDo() {
  annPage.current = 1;
  loadAnn();
}
function annReset() {
  annSearch.status = "";
  annSearchDo();
}

const annDialog = ref(false);
const annIsEdit = ref(false);
const annSaving = ref(false);
const annFormRef = ref();
const emptyAnn = () => ({
  id: 0,
  title: "",
  content: "",
  text_node: "",
  cover: "",
  jump_url: "",
  sys_type: "app",
  start_at: "",
  end_at: "",
  status: 1,
});
const annForm = reactive(emptyAnn());
const annRules = {
  title: [{ required: true, message: "标题必填", trigger: "blur" }],
  end_at: [{ required: true, message: "结束时间必填", trigger: "change" }],
};

function openAnnCreate() {
  annIsEdit.value = false;
  Object.assign(annForm, emptyAnn());
  annDialog.value = true;
}
function openAnnEdit(row: OpsConfigApi.AnnItem) {
  annIsEdit.value = true;
  Object.assign(annForm, {
    id: row.id,
    title: row.title,
    content: row.content,
    text_node: row.text_node,
    cover: row.cover,
    jump_url: row.jump_url,
    sys_type: row.sys_type || "app",
    start_at: row.start_at,
    end_at: row.end_at,
    status: row.status,
  });
  annDialog.value = true;
}
async function saveAnn() {
  await annFormRef.value?.validate();
  const body: OpsConfigApi.AnnSaveBody = {
    title: annForm.title,
    content: annForm.content,
    text_node: annForm.text_node,
    cover: annForm.cover,
    jump_url: annForm.jump_url,
    sys_type: annForm.sys_type,
    start_at: annForm.start_at, // 空串 = 后端取 now
    end_at: annForm.end_at,
    status: annForm.status,
  };
  annSaving.value = true;
  try {
    if (annIsEdit.value) {
      await updateAnnApi(annForm.id, body);
      ElMessage.success("已保存");
    } else {
      await createAnnApi(body);
      ElMessage.success("已新增");
    }
    annDialog.value = false;
    loadAnn();
  } finally {
    annSaving.value = false;
  }
}
async function delAnn(row: OpsConfigApi.AnnItem) {
  await ElMessageBox.confirm(`确认删除公告「${row.title}」?`, "提示", {
    type: "warning",
  });
  await deleteAnnApi(row.id);
  ElMessage.success("已删除");
  loadAnn();
}

/* ==================== 跳转位 ==================== */
const jtLoading = ref(false);
const jtList = ref<OpsConfigApi.JtItem[]>([]);
const jtPage = reactive({ current: 1, size: 20, total: 0 });
// location 在 Go 契约里是 int(后端按 location > 0 过滤), 所以这里破例用 number, 0=全部
const jtSearch = reactive({ status: "", location: 0 });

async function loadJt() {
  jtLoading.value = true;
  try {
    const res = await getJumptabListApi({
      status: jtSearch.status,
      location: jtSearch.location || 0,
      page: jtPage.current,
      size: jtPage.size,
    });
    jtList.value = res.list || [];
    jtPage.total = res.total || 0;
  } finally {
    jtLoading.value = false;
  }
}
function jtSearchDo() {
  jtPage.current = 1;
  loadJt();
}
function jtReset() {
  jtSearch.status = "";
  jtSearch.location = 0;
  jtSearchDo();
}

const jtDialog = ref(false);
const jtIsEdit = ref(false);
const jtSaving = ref(false);
const jtFormRef = ref();
const emptyJt = () => ({
  id: 0,
  cn_name: "",
  en_name: "",
  avatar: "",
  link: "",
  pic_jump_link: "",
  location: 1,
  rank: 0,
  status: 1,
});
const jtForm = reactive(emptyJt());
const jtRules = {
  cn_name: [{ required: true, message: "名称必填", trigger: "blur" }],
};

function openJtCreate() {
  jtIsEdit.value = false;
  Object.assign(jtForm, emptyJt());
  jtDialog.value = true;
}
function openJtEdit(row: OpsConfigApi.JtItem) {
  jtIsEdit.value = true;
  Object.assign(jtForm, {
    id: row.id,
    cn_name: row.cn_name,
    en_name: row.en_name,
    avatar: row.avatar,
    link: row.link,
    pic_jump_link: row.pic_jump_link,
    location: row.location,
    rank: row.rank,
    status: row.status,
  });
  jtDialog.value = true;
}
async function saveJt() {
  await jtFormRef.value?.validate();
  // 后端 JtCreate 直接拒 location <= 0, 这里先给即时反馈, 少一次往返
  if (Number(jtForm.location) <= 0) {
    ElMessage.warning("展示位置需大于 0");
    return;
  }
  const body: OpsConfigApi.JtSaveBody = {
    cn_name: jtForm.cn_name,
    en_name: jtForm.en_name,
    avatar: jtForm.avatar,
    link: jtForm.link,
    pic_jump_link: jtForm.pic_jump_link,
    location: Number(jtForm.location),
    rank: Number(jtForm.rank) || 0,
    status: jtForm.status,
  };
  jtSaving.value = true;
  try {
    if (jtIsEdit.value) {
      await updateJumptabApi(jtForm.id, body);
      ElMessage.success("已保存");
    } else {
      await createJumptabApi(body);
      ElMessage.success("已新增");
    }
    jtDialog.value = false;
    loadJt();
  } finally {
    jtSaving.value = false;
  }
}
async function delJt(row: OpsConfigApi.JtItem) {
  await ElMessageBox.confirm(`确认删除跳转位「${row.cn_name}」?`, "提示", {
    type: "warning",
  });
  await deleteJumptabApi(row.id);
  ElMessage.success("已删除");
  loadJt();
}

/* ==================== 敏感词 ==================== */
const fwLoading = ref(false);
const fwList = ref<OpsConfigApi.FwItem[]>([]);
const fwPage = reactive({ current: 1, size: 50, total: 0 });
const fwSearch = reactive({ keyword: "" });

async function loadFw() {
  fwLoading.value = true;
  try {
    const res = await getFilterWordListApi({
      keyword: fwSearch.keyword || undefined,
      page: fwPage.current,
      size: fwPage.size,
    });
    fwList.value = res.list || [];
    fwPage.total = res.total || 0;
  } finally {
    fwLoading.value = false;
  }
}
function fwSearchDo() {
  fwPage.current = 1;
  loadFw();
}
function fwReset() {
  fwSearch.keyword = "";
  fwSearchDo();
}

// 敏感词没有编辑接口(后端只提供 列表/新增/删除), 改词 = 删旧词 + 加新词
const fwDialog = ref(false);
const fwSaving = ref(false);
const fwText = ref("");

function openFwCreate() {
  fwText.value = "";
  fwDialog.value = true;
}
async function saveFw() {
  const words = [
    ...new Set(
      fwText.value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  if (words.length === 0) {
    ElMessage.warning("请至少输入一个敏感词");
    return;
  }
  fwSaving.value = true;
  try {
    // 契约本身收数组(FwAddReq.Words []string)且用 InsertIgnore 去重,
    // 所以一次请求即可, 不必逐条 POST; added = 实际入库数, 差额即已存在的重复词
    const res = await addFilterWordsApi(words);
    const added = res?.added ?? 0;
    const skipped = words.length - added;
    ElMessage.success(
      `提交 ${words.length} 个, 新增 ${added} 个${skipped > 0 ? `, 重复跳过 ${skipped} 个` : ""}`,
    );
    fwDialog.value = false;
    fwSearchDo();
  } finally {
    fwSaving.value = false;
  }
}
async function delFw(row: OpsConfigApi.FwItem) {
  await ElMessageBox.confirm(
    `确认删除敏感词「${row.word}」? 删除后该词将不再拦截 UGC 内容。`,
    "提示",
    { type: "warning" },
  );
  await deleteFilterWordApi(row.id);
  ElMessage.success("已删除");
  loadFw();
}

/* ==================== Tab 懒加载 ==================== */
// 只有第一次切到某个 Tab 才拉数据, 避免进页面就打三个接口
const loadedTabs = reactive<Record<string, boolean>>({ announcement: true });
function onTabChange(name: string) {
  if (loadedTabs[name]) return;
  loadedTabs[name] = true;
  if (name === "jumptab") loadJt();
  if (name === "filterword") loadFw();
}

onMounted(loadAnn);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <ElTabs v-model="activeTab" @tab-change="onTabChange">
        <!-- ---------- 公告 ---------- -->
        <ElTabPane label="公告" name="announcement">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <ElSelect
              v-model="annSearch.status"
              style="width: 120px"
              @change="annSearchDo"
            >
              <ElOption
                v-for="o in statusOpts"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </ElSelect>
            <ElButton type="primary" @click="annSearchDo">查询</ElButton>
            <ElButton @click="annReset">重置</ElButton>
            <div class="flex-1"></div>
            <ElButton type="primary" @click="openAnnCreate">新增公告</ElButton>
          </div>

          <ElTable v-loading="annLoading" :data="annList" border stripe>
            <ElTableColumn prop="id" label="ID" width="70" />
            <ElTableColumn
              prop="title"
              label="标题"
              min-width="160"
              show-overflow-tooltip
            />
            <ElTableColumn
              prop="content"
              label="内容"
              min-width="200"
              show-overflow-tooltip
            />
            <ElTableColumn prop="sys_type" label="投放端" width="90" />
            <ElTableColumn prop="start_at" label="开始时间" width="170" />
            <ElTableColumn prop="end_at" label="结束时间" width="170" />
            <ElTableColumn label="状态" width="90" align="center">
              <template #default="{ row }">
                <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? "开启" : "关闭" }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="openAnnEdit(row)">
                  编辑
                </ElButton>
                <ElButton link type="danger" @click="delAnn(row)">删除</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>

          <div class="mt-4 flex justify-end">
            <ElPagination
              v-model:current-page="annPage.current"
              v-model:page-size="annPage.size"
              :total="annPage.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              @size-change="loadAnn"
              @current-change="loadAnn"
            />
          </div>
        </ElTabPane>

        <!-- ---------- 跳转位 ---------- -->
        <ElTabPane label="跳转位" name="jumptab">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <ElSelect
              v-model="jtSearch.status"
              style="width: 120px"
              @change="jtSearchDo"
            >
              <ElOption
                v-for="o in statusOpts"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </ElSelect>
            <!-- location 契约是 int, 0=全部 -->
            <ElInputNumber
              v-model="jtSearch.location"
              :min="0"
              controls-position="right"
              style="width: 140px"
            />
            <span class="text-xs text-gray-400">展示位置(0=全部)</span>
            <ElButton type="primary" @click="jtSearchDo">查询</ElButton>
            <ElButton @click="jtReset">重置</ElButton>
            <div class="flex-1"></div>
            <ElButton type="primary" @click="openJtCreate">新增跳转位</ElButton>
          </div>

          <ElTable v-loading="jtLoading" :data="jtList" border stripe>
            <ElTableColumn prop="id" label="ID" width="70" />
            <ElTableColumn label="图标" width="80">
              <template #default="{ row }">
                <ElImage
                  v-if="row.avatar"
                  :src="row.avatar"
                  fit="cover"
                  style="width: 40px; height: 40px"
                  preview-teleported
                  :preview-src-list="[row.avatar]"
                />
                <span v-else class="text-gray-400">-</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="cn_name" label="中文名" min-width="120" />
            <ElTableColumn prop="en_name" label="英文名" min-width="120" />
            <ElTableColumn
              prop="link"
              label="跳转链接"
              min-width="180"
              show-overflow-tooltip
            />
            <ElTableColumn prop="location" label="位置" width="80" align="center" />
            <ElTableColumn prop="rank" label="权重" width="80" align="center" />
            <ElTableColumn label="状态" width="90" align="center">
              <template #default="{ row }">
                <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? "启用" : "禁用" }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="created_at" label="创建时间" width="170" />
            <ElTableColumn label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="openJtEdit(row)">
                  编辑
                </ElButton>
                <ElButton link type="danger" @click="delJt(row)">删除</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>

          <div class="mt-4 flex justify-end">
            <ElPagination
              v-model:current-page="jtPage.current"
              v-model:page-size="jtPage.size"
              :total="jtPage.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              @size-change="loadJt"
              @current-change="loadJt"
            />
          </div>
        </ElTabPane>

        <!-- ---------- 敏感词 ---------- -->
        <ElTabPane label="敏感词" name="filterword">
          <ElAlert
            class="mb-3"
            type="warning"
            :closable="false"
            show-icon
            title="敏感词用于 UGC 过滤"
            description="新增后立即对帖子 / 评论 / 投稿生效, 命中的内容会被拦截; 删除后该词不再拦截。敏感词没有编辑接口, 改词请先删除再新增。"
          />
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <ElInput
              v-model="fwSearch.keyword"
              placeholder="词内容模糊搜索"
              style="width: 220px"
              clearable
              @keyup.enter="fwSearchDo"
            />
            <ElButton type="primary" @click="fwSearchDo">查询</ElButton>
            <ElButton @click="fwReset">重置</ElButton>
            <div class="flex-1"></div>
            <ElButton type="primary" @click="openFwCreate">批量新增</ElButton>
          </div>

          <ElTable v-loading="fwLoading" :data="fwList" border stripe>
            <ElTableColumn prop="id" label="ID" width="80" />
            <ElTableColumn prop="word" label="敏感词" min-width="200" />
            <ElTableColumn prop="created_at" label="添加时间" width="180" />
            <ElTableColumn label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <ElButton link type="danger" @click="delFw(row)">删除</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>

          <div class="mt-4 flex justify-end">
            <ElPagination
              v-model:current-page="fwPage.current"
              v-model:page-size="fwPage.size"
              :total="fwPage.total"
              :page-sizes="[20, 50, 100, 200]"
              layout="total, sizes, prev, pager, next"
              @size-change="loadFw"
              @current-change="loadFw"
            />
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <!-- 公告表单 -->
    <ElDialog
      v-model="annDialog"
      :title="annIsEdit ? '编辑公告' : '新增公告'"
      width="620px"
    >
      <ElForm
        ref="annFormRef"
        :model="annForm"
        :rules="annRules"
        label-width="90px"
      >
        <ElFormItem label="标题" prop="title">
          <ElInput v-model="annForm.title" />
        </ElFormItem>
        <ElFormItem label="内容">
          <ElInput v-model="annForm.content" type="textarea" :rows="4" />
        </ElFormItem>
        <ElFormItem label="富文本">
          <ElInput
            v-model="annForm.text_node"
            type="textarea"
            :rows="3"
            placeholder="可选, 前端渲染用的富文本/HTML 片段"
          />
        </ElFormItem>
        <ElFormItem label="封面">
          <ElInput v-model="annForm.cover" placeholder="图片 URL" />
        </ElFormItem>
        <ElFormItem label="跳转链接">
          <ElInput v-model="annForm.jump_url" placeholder="可选" />
        </ElFormItem>
        <ElFormItem label="投放端">
          <ElSelect v-model="annForm.sys_type" style="width: 160px">
            <ElOption label="App" value="app" />
            <ElOption label="H5" value="h5" />
            <ElOption label="PC" value="pc" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="开始时间">
          <ElDatePicker
            v-model="annForm.start_at"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="留空 = 立即生效"
            style="width: 220px"
          />
        </ElFormItem>
        <ElFormItem label="结束时间" prop="end_at">
          <ElDatePicker
            v-model="annForm.end_at"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="必填, 如 2027-12-31 23:59:59"
            style="width: 220px"
          />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="annForm.status" style="width: 160px">
            <ElOption label="开启" :value="1" />
            <ElOption label="关闭" :value="0" />
          </ElSelect>
          <span class="ml-2 text-xs text-gray-400">
            仅"开启"且在有效期内的公告前台可见
          </span>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="annDialog = false">取消</ElButton>
        <ElButton type="primary" :loading="annSaving" @click="saveAnn">
          保存
        </ElButton>
      </template>
    </ElDialog>

    <!-- 跳转位表单 -->
    <ElDialog
      v-model="jtDialog"
      :title="jtIsEdit ? '编辑跳转位' : '新增跳转位'"
      width="560px"
    >
      <ElForm ref="jtFormRef" :model="jtForm" :rules="jtRules" label-width="90px">
        <ElFormItem label="中文名" prop="cn_name">
          <ElInput v-model="jtForm.cn_name" />
        </ElFormItem>
        <ElFormItem label="英文名">
          <ElInput v-model="jtForm.en_name" />
        </ElFormItem>
        <ElFormItem label="图标">
          <ElInput v-model="jtForm.avatar" placeholder="图片 URL" />
        </ElFormItem>
        <ElFormItem label="跳转链接">
          <ElInput v-model="jtForm.link" placeholder="如: /checkin" />
        </ElFormItem>
        <ElFormItem label="图片跳链">
          <ElInput v-model="jtForm.pic_jump_link" placeholder="可选" />
        </ElFormItem>
        <ElFormItem label="展示位置">
          <ElInputNumber v-model="jtForm.location" :min="1" />
          <span class="ml-2 text-xs text-gray-400">
            必填且需大于 0, 前台按位置取图标组
          </span>
        </ElFormItem>
        <ElFormItem label="排序权重">
          <ElInputNumber v-model="jtForm.rank" :min="0" />
          <span class="ml-2 text-xs text-gray-400">越大越靠前</span>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="jtForm.status" style="width: 160px">
            <ElOption label="启用" :value="1" />
            <ElOption label="禁用" :value="0" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="jtDialog = false">取消</ElButton>
        <ElButton type="primary" :loading="jtSaving" @click="saveJt">
          保存
        </ElButton>
      </template>
    </ElDialog>

    <!-- 敏感词批量新增 -->
    <ElDialog v-model="fwDialog" title="批量新增敏感词" width="520px">
      <ElAlert
        class="mb-3"
        type="info"
        :closable="false"
        show-icon
        title="一行一个词, 提交后立即对帖子 / 评论 / 投稿生效"
        description="重复的词后端会自动跳过, 提交结果里会给出实际新增数。"
      />
      <ElInput
        v-model="fwText"
        type="textarea"
        :rows="10"
        placeholder="一行一个敏感词, 例如:&#10;测试敏感词&#10;违禁词"
      />
      <template #footer>
        <ElButton @click="fwDialog = false">取消</ElButton>
        <ElButton type="primary" :loading="fwSaving" @click="saveFw">
          提交
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>
