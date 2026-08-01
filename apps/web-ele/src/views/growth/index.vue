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
  ElPagination,
  ElProgress,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from "element-plus";

import {
  createGroupApi,
  deleteGroupApi,
  getGroupListApi,
  type BkGroupApi,
  updateGroupApi,
} from "#/api/core/bkgroup";
import {
  createTaskApi,
  deleteTaskApi,
  getSignStatsApi,
  getTaskListApi,
  getTaskLogListApi,
  type GrowthApi,
  updateTaskApi,
} from "#/api/core/growth";

defineOptions({ name: "GrowthManage" });

const activeTab = ref("groups");

// ---------- 用户组 ----------
const groups = ref<BkGroupApi.GroupItem[]>([]);
const gLoading = ref(false);
async function loadGroups() {
  gLoading.value = true;
  try {
    const res = await getGroupListApi();
    groups.value = res.list || [];
  } finally {
    gLoading.value = false;
  }
}
const gDialog = ref(false);
const gEdit = ref(false);
const gForm = reactive<any>({ id: 0, name: "", rate: 100, rights: "{}", remark: "", sort: 0, status: true });
function openGCreate() {
  gEdit.value = false;
  Object.assign(gForm, { id: 0, name: "", rate: 100, rights: "{}", remark: "", sort: 0, status: true });
  gDialog.value = true;
}
function openGEdit(row: BkGroupApi.GroupItem) {
  gEdit.value = true;
  Object.assign(gForm, { ...row, status: row.status === 1 });
  gDialog.value = true;
}
async function saveG() {
  const p = { ...gForm, status: gForm.status ? 1 : 0 };
  if (gEdit.value) await updateGroupApi(p);
  else await createGroupApi(p);
  ElMessage.success("保存成功(更新会同步组内用户快照)");
  gDialog.value = false;
  loadGroups();
}
async function delG(row: BkGroupApi.GroupItem) {
  await ElMessageBox.confirm(`删除用户组「${row.name}」?组内有用户会被拒绝。`, "提示", { type: "warning" });
  await deleteGroupApi(row.id);
  ElMessage.success("已删除");
  loadGroups();
}

// ---------- 任务 ----------
const tasks = ref<GrowthApi.TaskItem[]>([]);
const tLoading = ref(false);
async function loadTasks() {
  tLoading.value = true;
  try {
    const res = await getTaskListApi();
    tasks.value = res.list || [];
  } finally {
    tLoading.value = false;
  }
}
const tDialog = ref(false);
const tEdit = ref(false);
const tForm = reactive<any>({ id: 0, name: "", type: "", description: "", max_num: 1, reward: 10, status: true, sort: 0 });
function openTCreate() {
  tEdit.value = false;
  Object.assign(tForm, { id: 0, name: "", type: "", description: "", max_num: 1, reward: 10, status: true, sort: 0 });
  tDialog.value = true;
}
function openTEdit(row: GrowthApi.TaskItem) {
  tEdit.value = true;
  Object.assign(tForm, { ...row, status: row.status === 1 });
  tDialog.value = true;
}
async function saveT() {
  const p = { ...tForm, status: tForm.status ? 1 : 0 };
  if (tEdit.value) await updateTaskApi(p);
  else await createTaskApi(p);
  ElMessage.success("保存成功");
  tDialog.value = false;
  loadTasks();
}
async function delT(row: GrowthApi.TaskItem) {
  await ElMessageBox.confirm(`删除任务「${row.name}」?`, "提示", { type: "warning" });
  await deleteTaskApi(row.id);
  ElMessage.success("已删除");
  loadTasks();
}

// ---------- 签到统计 ----------
const stats = ref<GrowthApi.SignStats | null>(null);
const sLoading = ref(false);
async function loadStats() {
  sLoading.value = true;
  try {
    stats.value = await getSignStatsApi(0);
  } finally {
    sLoading.value = false;
  }
}
function maxCount() {
  if (!stats.value || !stats.value.days.length) return 1;
  return Math.max(...stats.value.days.map((d) => d.count));
}

function onTab(name: string | number) {
  if (name === "tasks" && !tasks.value.length) loadTasks();
  if (name === "sign") loadStats();
}

onMounted(loadGroups);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <ElTabs v-model="activeTab" @tab-change="onTab">
        <!-- 用户组 -->
        <ElTabPane label="用户组" name="groups">
          <div class="mb-3">
            <ElButton type="primary" @click="openGCreate">新建用户组</ElButton>
          </div>
          <ElTable v-loading="gLoading" :data="groups" border stripe>
            <ElTableColumn prop="id" label="ID" width="70" />
            <ElTableColumn prop="name" label="组名" min-width="140" />
            <ElTableColumn prop="rate" label="折扣(%)" width="100" align="right" />
            <ElTableColumn prop="sort" label="排序" width="70" align="center" />
            <ElTableColumn label="状态" width="80" align="center">
              <template #default="{ row }">
                <ElTag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? "启用" : "停用" }}</ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="remark" label="备注" min-width="140" show-overflow-tooltip />
            <ElTableColumn label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="openGEdit(row)">编辑</ElButton>
                <ElButton link type="danger" @click="delG(row)">删除</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>

        <!-- 任务 -->
        <ElTabPane label="任务配置" name="tasks">
          <div class="mb-3">
            <ElButton type="primary" @click="openTCreate">新建任务</ElButton>
          </div>
          <ElTable v-loading="tLoading" :data="tasks" border stripe>
            <ElTableColumn prop="id" label="ID" width="70" />
            <ElTableColumn prop="name" label="任务名" min-width="140" />
            <ElTableColumn prop="type" label="类型" width="120" />
            <ElTableColumn prop="max_num" label="单日上限" width="90" align="right" />
            <ElTableColumn prop="reward" label="奖励积分" width="90" align="right" />
            <ElTableColumn prop="sort" label="排序" width="70" align="center" />
            <ElTableColumn label="状态" width="80" align="center">
              <template #default="{ row }">
                <ElTag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? "上架" : "下线" }}</ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="openTEdit(row)">编辑</ElButton>
                <ElButton link type="danger" @click="delT(row)">删除</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>

        <!-- 签到统计 -->
        <ElTabPane label="签到统计" name="sign">
          <div v-loading="sLoading">
            <div v-if="stats" class="mb-4 flex gap-8">
              <div>本月签到用户数: <b>{{ stats.user_count }}</b></div>
              <div>总签到人次: <b>{{ stats.sign_count }}</b></div>
              <div>归属月: <b>{{ stats.year_month }}</b></div>
            </div>
            <div v-if="stats && stats.days.length" class="space-y-2">
              <div v-for="d in stats.days" :key="d.day" class="flex items-center gap-3">
                <span class="w-12 text-right text-sm">{{ d.day }}号</span>
                <ElProgress
                  :percentage="Math.round((d.count / maxCount()) * 100)"
                  :stroke-width="14"
                  style="flex: 1"
                  :format="() => d.count + ' 人'"
                />
              </div>
            </div>
            <div v-else-if="stats" class="text-muted-foreground py-6 text-center">本月暂无签到数据</div>
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <!-- 用户组弹窗 -->
    <ElDialog v-model="gDialog" :title="gEdit ? '编辑用户组' : '新建用户组'" width="440px">
      <ElForm label-width="90px">
        <ElFormItem label="组名"><ElInput v-model="gForm.name" /></ElFormItem>
        <ElFormItem label="折扣(%)"><ElInputNumber v-model="gForm.rate" :min="0" :max="100" /></ElFormItem>
        <ElFormItem label="排序"><ElInputNumber v-model="gForm.sort" :min="0" /></ElFormItem>
        <ElFormItem label="权益JSON"><ElInput v-model="gForm.rights" type="textarea" :rows="2" /></ElFormItem>
        <ElFormItem label="备注"><ElInput v-model="gForm.remark" /></ElFormItem>
        <ElFormItem label="启用"><ElSwitch v-model="gForm.status" /></ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="gDialog = false">取消</ElButton>
        <ElButton type="primary" @click="saveG">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 任务弹窗 -->
    <ElDialog v-model="tDialog" :title="tEdit ? '编辑任务' : '新建任务'" width="440px">
      <ElForm label-width="90px">
        <ElFormItem label="任务名"><ElInput v-model="tForm.name" /></ElFormItem>
        <ElFormItem label="类型"><ElInput v-model="tForm.type" placeholder="如 watch/share" /></ElFormItem>
        <ElFormItem label="描述"><ElInput v-model="tForm.description" /></ElFormItem>
        <ElFormItem label="单日上限"><ElInputNumber v-model="tForm.max_num" :min="1" /></ElFormItem>
        <ElFormItem label="奖励积分"><ElInputNumber v-model="tForm.reward" :min="0" :precision="2" /></ElFormItem>
        <ElFormItem label="排序"><ElInputNumber v-model="tForm.sort" :min="0" /></ElFormItem>
        <ElFormItem label="上架"><ElSwitch v-model="tForm.status" /></ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="tDialog = false">取消</ElButton>
        <ElButton type="primary" @click="saveT">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
