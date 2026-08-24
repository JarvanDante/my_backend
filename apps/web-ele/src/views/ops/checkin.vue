<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElAlert,
  ElButton,
  ElCard,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElSelect,
} from "element-plus";

import {
  type CheckinApi,
  getCheckinConfigApi,
  getCheckinRewardsApi,
  saveCheckinConfigApi,
  saveCheckinRewardsApi,
} from "#/api/core/checkin";
import { getGroupListApi, type BkGroupApi } from "#/api/core/bkgroup";

defineOptions({ name: "OpsCheckin" });

const loading = ref(false)
const saving = ref(false)
const groups = ref<BkGroupApi.GroupItem[]>([])
const cfg = reactive<CheckinApi.Config>({
  makeup_points: 5,
  makeup_limit: 3,
  makeup_desc: "",
  vip_group_id: 0,
})
const rows = ref<CheckinApi.RewardRow[]>([])

function emptyRow(day: number): CheckinApi.RewardRow {
  return {
    day_num: day,
    label: `第${day}天`,
    points: 10 + (day - 1) * 8,
    gold: day,
    vip_days: 0,
    is_milestone: 0,
    ms_points: 0,
    ms_gold: 0,
    ms_vip_days: 0,
  }
}

async function load() {
  loading.value = true
  try {
    const [c, r, g] = await Promise.all([
      getCheckinConfigApi(),
      getCheckinRewardsApi(),
      getGroupListApi(),
    ])
    Object.assign(cfg, c.config)
    rows.value = (r.list || []).length ? r.list : Array.from({ length: 15 }, (_, i) => emptyRow(i + 1))
    groups.value = (g.list || []).filter((x) => x.status === 1)
  } finally {
    loading.value = false
  }
}

function genPoints() {
  rows.value = rows.value.map((row, i) => ({
    ...row,
    day_num: i + 1,
    label: row.label || `第${i + 1}天`,
    points: i + 1 === 15 ? 150 : 10 + i * 8,
    gold: i + 1,
  }))
}

function toggleMilestone(row: CheckinApi.RewardRow) {
  row.is_milestone = row.is_milestone === 1 ? 0 : 1
}

async function saveAll() {
  saving.value = true
  try {
    await Promise.all([
      saveCheckinConfigApi({ ...cfg }),
      saveCheckinRewardsApi(rows.value),
    ])
    ElMessage.success("已保存")
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never" v-loading="loading">
      <h3 class="mb-4 text-base font-semibold">补签 & 全局配置</h3>
      <ElForm label-width="160px" class="max-w-3xl">
        <ElFormItem label="补签消耗积分">
          <ElInputNumber v-model="cfg.makeup_points" :min="0" />
          <span class="ml-2 text-xs text-gray-400">积分/次</span>
        </ElFormItem>
        <ElFormItem label="每月可补签次数">
          <ElInputNumber v-model="cfg.makeup_limit" :min="0" />
          <span class="ml-2 text-xs text-gray-400">次/月</span>
        </ElFormItem>
        <ElFormItem label="补签规则描述">
          <ElInput v-model="cfg.makeup_desc" maxlength="21" show-word-limit placeholder="最多21字" />
        </ElFormItem>
        <ElFormItem label="签到VIP奖励会员组">
          <ElSelect v-model="cfg.vip_group_id" clearable style="width: 280px">
            <ElOption :value="0" label="不切换会员组（只续期）" />
            <ElOption
              v-for="g in groups"
              :key="g.id"
              :value="g.id"
              :label="`${g.name}（${g.day_num}天）`"
            />
          </ElSelect>
          <span class="ml-2 text-xs text-gray-400">vip_days &gt; 0 时延长该组时长</span>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <ElCard shadow="never" class="mt-4" v-loading="loading">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-base font-semibold">签到配置 1-15 天（积分 / 金币 / VIP天）</h3>
        <div class="flex gap-2">
          <ElButton type="primary" plain @click="genPoints">一键生成递增积分</ElButton>
          <ElButton type="primary" :loading="saving" @click="saveAll">保存配置</ElButton>
        </div>
      </div>
      <ElAlert
        type="info"
        :closable="false"
        class="mb-3"
        title="奖励填 0 表示该项不发。开启里程碑后当天只发里程碑奖励，普通奖励不生效。"
      />
      <div class="overflow-x-auto">
        <table class="ck-table">
          <thead>
            <tr>
              <th>天数</th>
              <th>标签名称</th>
              <th>普通签到奖励</th>
              <th>里程碑</th>
              <th>里程碑奖励</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.day_num" :class="{ mile: row.is_milestone === 1 }">
              <td><span class="day-no">{{ row.day_num }}</span></td>
              <td><ElInput v-model="row.label" /></td>
              <td class="nums">
                <ElInputNumber v-model="row.points" :min="0" size="small" :disabled="row.is_milestone === 1" />
                <i>积分</i>
                <ElInputNumber v-model="row.gold" :min="0" size="small" :disabled="row.is_milestone === 1" />
                <i>金币</i>
                <ElInputNumber v-model="row.vip_days" :min="0" size="small" :disabled="row.is_milestone === 1" />
                <i>VIP天</i>
              </td>
              <td>
                <ElButton
                  size="small"
                  :type="row.is_milestone === 1 ? 'warning' : 'default'"
                  @click="toggleMilestone(row)"
                >
                  {{ row.is_milestone === 1 ? "已开启" : "开启里程碑" }}
                </ElButton>
              </td>
              <td class="nums">
                <template v-if="row.is_milestone === 1">
                  <ElInputNumber v-model="row.ms_points" :min="0" size="small" />
                  <i>积分</i>
                  <ElInputNumber v-model="row.ms_gold" :min="0" size="small" />
                  <i>金币</i>
                  <ElInputNumber v-model="row.ms_vip_days" :min="0" size="small" />
                  <i>VIP天</i>
                </template>
                <span v-else class="text-gray-400">开启后填写</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.ck-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.ck-table th,
.ck-table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  text-align: left;
  vertical-align: middle;
}
.ck-table th {
  color: var(--el-text-color-secondary);
  font-weight: 600;
  background: var(--el-fill-color-lighter);
}
.ck-table tr.mile {
  background: #fff8e1;
}
.day-no {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #ececf0;
  font-weight: 700;
}
.nums {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.nums i {
  font-style: normal;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.nums :deep(.el-input-number) {
  width: 110px;
}
</style>
