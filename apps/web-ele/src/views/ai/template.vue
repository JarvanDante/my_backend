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
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import {
  type AiTemplateApi,
  createAiTemplateApi,
  deleteAiTemplateApi,
  getAiTemplateListApi,
  updateAiTemplateApi,
} from "#/api/core/aitemplate";

defineOptions({ name: "AiTemplate" });

// biz_type 与后端 ai_template.biz_type 一一对应(契约 v:"in:1,2,3,4,5,6")
const bizTypeMap: Record<number, string> = {
  1: "换脸",
  2: "脱衣",
  3: "文生图",
  4: "图生视频",
  5: "文生小说",
  6: "AI对话",
};
const bizTypeOpts = Object.entries(bizTypeMap).map(([value, label]) => ({
  label,
  value,
}));

const loading = ref(false);
const list = ref<AiTemplateApi.Item[]>([]);
const page = reactive({ current: 1, size: 20, total: 0 });
// 筛选项一律 string, 空串=全部。注意后端两者默认值不同:
// biz_type 空串→0 且 >0 才筛; status 空串→-1 且 >=0 才筛, 所以 status="0" 能筛出停用模板。
const search = reactive({ biz_type: "", status: "", keyword: "" });

async function fetchList() {
  loading.value = true;
  try {
    const res = await getAiTemplateListApi({
      biz_type: search.biz_type,
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
  fetchList();
}
function resetSearch() {
  search.biz_type = "";
  search.status = "";
  search.keyword = "";
  doSearch();
}

/** params 是 jsonb, 表格里折行展示太长, 这里压成一行摘要 */
function paramsBrief(params: Record<string, any>) {
  const keys = Object.keys(params || {});
  if (keys.length === 0) return "-";
  return JSON.stringify(params);
}

// ---------- 新增/编辑 ----------
const dialog = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
const emptyForm = () => ({
  id: 0,
  name: "",
  biz_type: 3,
  cover: "",
  preview: "",
  // 表单里用文本编辑 JSON, 提交前解析成对象(后端收的是 map[string]any, 不能传字符串)
  paramsText: "{}",
  cost_gold: 0,
  sort: 0,
  status: 1,
});
const form = reactive(emptyForm());
const rules = {
  name: [{ required: true, message: "模板名必填", trigger: "blur" }],
};

function openCreate() {
  isEdit.value = false;
  Object.assign(form, emptyForm());
  dialog.value = true;
}
function openEdit(row: AiTemplateApi.Item) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    name: row.name,
    biz_type: row.biz_type,
    cover: row.cover,
    preview: row.preview,
    paramsText: JSON.stringify(row.params || {}, null, 2),
    cost_gold: row.cost_gold,
    sort: row.sort,
    status: row.status,
  });
  dialog.value = true;
}

/** 把 textarea 里的 JSON 文本格式化一下, 顺便当成一次合法性自检 */
function formatParams() {
  try {
    form.paramsText = JSON.stringify(JSON.parse(form.paramsText || "{}"), null, 2);
    ElMessage.success("JSON 格式化完成");
  } catch (error: any) {
    ElMessage.warning(`预设参数不是合法 JSON: ${error?.message ?? error}`);
  }
}

async function handleSave() {
  await formRef.value?.validate();
  // params 会原样透传给供应商, 非法 JSON 一旦落库会让整条链路在运行时才炸,
  // 所以在提交前就拦下来, 而不是靠后端报 500。
  let params: Record<string, any> = {};
  const text = (form.paramsText || "").trim();
  if (text) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        ElMessage.warning("预设参数必须是 JSON 对象(形如 {\"key\":\"value\"})");
        return;
      }
      params = parsed;
    } catch (error: any) {
      ElMessage.warning(`预设参数不是合法 JSON: ${error?.message ?? error}`);
      return;
    }
  }
  const body: AiTemplateApi.SaveBody = {
    name: form.name.trim(),
    biz_type: form.biz_type,
    cover: form.cover,
    preview: form.preview,
    params,
    cost_gold: Number(form.cost_gold) || 0,
    sort: Number(form.sort) || 0,
    status: form.status,
  };
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateAiTemplateApi(form.id, body);
      ElMessage.success("已保存");
    } else {
      await createAiTemplateApi(body);
      ElMessage.success("已新增");
    }
    dialog.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: AiTemplateApi.Item) {
  await ElMessageBox.confirm(
    `确认删除模板「${row.name}」? 已提交的任务不受影响, 但重试时会取不到模板价而沿用原价。`,
    "提示",
    { type: "warning" },
  );
  await deleteAiTemplateApi(row.id);
  ElMessage.success("已删除");
  fetchList();
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <ElAlert type="info" :closable="false" show-icon class="mb-4">
        <template #title>模板说明</template>
        <div class="text-xs leading-5">
          模板决定一个玩法的<b>价格与预设参数</b>: 用户提交任务时只传自己的入参,
          金币价由服务端按 template_id 取 cost_gold 计算(前端传价一律不认);
          <b>预设参数(params)</b> 是 jsonb, 会与用户入参合并后发给 AI 供应商。
          只有<b>启用</b>状态的模板才会下发给前台并允许下单。排序 sort 降序展示。
        </div>
      </ElAlert>

      <div class="mb-4 flex flex-wrap items-center gap-2">
        <ElSelect v-model="search.biz_type" style="width: 140px" @change="doSearch">
          <ElOption label="全部玩法" value="" />
          <ElOption v-for="o in bizTypeOpts" :key="o.value" :label="o.label" :value="o.value" />
        </ElSelect>
        <ElSelect v-model="search.status" style="width: 130px" @change="doSearch">
          <ElOption label="全部状态" value="" />
          <ElOption label="启用" value="1" />
          <ElOption label="停用" value="0" />
        </ElSelect>
        <ElInput
          v-model="search.keyword"
          placeholder="模板名关键字"
          style="width: 200px"
          clearable
          @keyup.enter="doSearch"
        />
        <ElButton type="primary" @click="doSearch">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">新增模板</ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn prop="id" label="ID" width="70" />
        <ElTableColumn label="封面" width="80">
          <template #default="{ row }">
            <ElImage
              v-if="row.cover"
              :src="row.cover"
              fit="cover"
              style="width: 44px; height: 44px"
              preview-teleported
              :preview-src-list="[row.cover]"
            />
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="name" label="模板名" min-width="150" show-overflow-tooltip />
        <ElTableColumn label="玩法" width="110" align="center">
          <template #default="{ row }">
            <ElTag size="small">{{ bizTypeMap[row.biz_type] ?? row.biz_type }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="预设参数" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="font-mono text-xs">{{ paramsBrief(row.params) }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="单次金币" width="110" align="right">
          <template #default="{ row }">
            {{ Number(row.cost_gold).toFixed(2) }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="sort" label="排序" width="80" align="center" />
        <ElTableColumn label="状态" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? "启用" : "停用" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="created_at" label="创建时间" width="170" />
        <ElTableColumn label="操作" width="140" fixed="right">
          <template #default="{ row }">
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
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </ElCard>

    <ElDialog v-model="dialog" :title="isEdit ? '编辑AI模板' : '新增AI模板'" width="640px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="110px">
        <ElFormItem label="模板名" prop="name">
          <ElInput v-model="form.name" />
        </ElFormItem>
        <ElFormItem label="玩法类型">
          <ElSelect v-model="form.biz_type" style="width: 180px">
            <ElOption label="换脸" :value="1" />
            <ElOption label="脱衣" :value="2" />
            <ElOption label="文生图" :value="3" />
            <ElOption label="图生视频" :value="4" />
            <ElOption label="文生小说" :value="5" />
            <ElOption label="AI对话" :value="6" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="封面">
          <ElInput v-model="form.cover" placeholder="列表封面图 URL" />
        </ElFormItem>
        <ElFormItem label="效果预览">
          <ElInput v-model="form.preview" placeholder="示例产物 URL" />
        </ElFormItem>
        <ElFormItem label="预设参数">
          <div class="w-full">
            <ElInput
              v-model="form.paramsText"
              type="textarea"
              :rows="7"
              class="font-mono"
              placeholder='JSON 对象, 如 {"model":"face-v1","quality":"hd"}'
            />
            <div class="mt-1 flex items-center gap-2">
              <ElButton size="small" @click="formatParams">格式化校验</ElButton>
              <span class="text-xs text-gray-400">
                必须是合法 JSON 对象; 保存前会校验, 非法直接拦下不提交
              </span>
            </div>
          </div>
        </ElFormItem>
        <ElFormItem label="单次金币">
          <ElInputNumber v-model="form.cost_gold" :min="0" :precision="2" />
          <span class="ml-2 text-xs text-gray-400">0 = 免费玩法</span>
        </ElFormItem>
        <ElFormItem label="排序">
          <ElInputNumber v-model="form.sort" :min="0" />
          <span class="ml-2 text-xs text-gray-400">降序展示, 越大越靠前</span>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="form.status" style="width: 140px">
            <ElOption label="启用" :value="1" />
            <ElOption label="停用" :value="0" />
          </ElSelect>
          <span class="ml-2 text-xs text-gray-400">停用后前台不可见且无法下单</span>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
