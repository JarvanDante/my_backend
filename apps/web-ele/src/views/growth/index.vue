<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElButton,
  ElCard,
  ElCheckbox,
  ElCheckboxGroup,
  ElDialog,
  ElForm,
  ElFormItem,
  ElImage,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
  ElUpload,
} from "element-plus";

import {
  createGroupApi,
  deleteGroupApi,
  getGroupListApi,
  type BkGroupApi,
  updateGroupApi,
} from "#/api/core/bkgroup";
import { uploadMediaApi } from "#/api/core/media";

defineOptions({ name: "GrowthManage" });

const promotionOpts = [
  { value: 0, label: "正常价格" },
  { value: 1, label: "新人专享" },
];
const rightsOpts = [
  { value: "anwang", label: "暗网无限看" },
  { value: "vip_post", label: "VIP帖子无限看" },
  { value: "vip_movie", label: "VIP视频无限看" },
  { value: "vip_cartoon", label: "VIP动漫无限看" },
  { value: "vip_comics", label: "VIP漫画无限看" },
  { value: "vip_line", label: "高速线路" },
  { value: "comment", label: "评论吐槽" },
  { value: "nickname", label: "修改昵称" },
  { value: "game", label: "解锁游戏" },
  { value: "chat", label: "解锁陪聊" },
  { value: "yuanjiao", label: "解锁援交" },
  { value: "no_ad", label: "免广告" },
  { value: "member_discount", label: "购片折扣" },
  { value: "gift_coin", label: "赠送金币" },
];

function parseRights(raw: string): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.map(String);
    if (v && typeof v === "object") {
      return Object.keys(v).filter((k) => Boolean((v as Record<string, unknown>)[k]));
    }
  } catch {
    /* ignore */
  }
  return [];
}

function emptyGroup() {
  return {
    id: 0,
    name: "",
    title_heat: "",
    title_description: "",
    title_picture: "",
    img: "",
    level: 1,
    promotion_type: 0,
    price: 0,
    old_price: 0,
    rate: 100,
    day_num: 30,
    gift_num: 0,
    download_num: 0,
    day_tips: "",
    price_tips: "",
    rightsKeys: [] as string[],
    remark: "",
    sort: 0,
    status: 1,
  };
}

const searchName = ref("");
const groups = ref<BkGroupApi.GroupItem[]>([]);
const gLoading = ref(false);
const selectedIds = ref<number[]>([]);
async function loadGroups() {
  gLoading.value = true;
  try {
    const res = await getGroupListApi(searchName.value.trim());
    groups.value = res.list || [];
  } finally {
    gLoading.value = false;
  }
}
function resetSearch() {
  searchName.value = "";
  loadGroups();
}
function onSelectionChange(rows: BkGroupApi.GroupItem[]) {
  selectedIds.value = rows.map((r) => r.id);
}

const gDialog = ref(false);
const gEdit = ref(false);
const gForm = reactive(emptyGroup());
const imgUploading = ref(false);
const titlePicUploading = ref(false);

function openGCreate() {
  gEdit.value = false;
  Object.assign(gForm, emptyGroup());
  gDialog.value = true;
}
function openGEdit(row: BkGroupApi.GroupItem) {
  gEdit.value = true;
  Object.assign(gForm, emptyGroup(), {
    ...row,
    rightsKeys: parseRights(row.rights),
    status: row.status === 1 ? 1 : 0,
  });
  gDialog.value = true;
}
function toPayload() {
  return {
    id: gForm.id,
    name: gForm.name,
    title_heat: gForm.title_heat,
    title_description: gForm.title_description,
    title_picture: gForm.title_picture,
    img: gForm.img,
    level: 1,
    promotion_type: gForm.promotion_type,
    price: Number(gForm.price) || 0,
    old_price: Number(gForm.old_price) || 0,
    rate: gForm.rate,
    day_num: gForm.day_num,
    gift_num: gForm.gift_num,
    download_num: gForm.download_num,
    day_tips: gForm.day_tips,
    price_tips: gForm.price_tips,
    rights: JSON.stringify(gForm.rightsKeys || []),
    remark: gForm.remark,
    sort: gForm.sort,
    status: gForm.status,
  };
}
async function saveG() {
  if (!gForm.name) {
    ElMessage.warning("请输入名称");
    return;
  }
  if (!gForm.day_num || gForm.day_num < 1) {
    ElMessage.warning("可用天数必须大于0");
    return;
  }
  const p = toPayload();
  if (gEdit.value) await updateGroupApi({ ...p, id: gForm.id });
  else await createGroupApi(p);
  ElMessage.success("保存成功");
  gDialog.value = false;
  loadGroups();
}
async function delG(row: BkGroupApi.GroupItem) {
  await ElMessageBox.confirm(`确定删除「${row.name}」? 组内有用户会被拒绝。`, "提示", {
    type: "warning",
  });
  await deleteGroupApi(row.id);
  ElMessage.success("已删除");
  loadGroups();
}
async function delSelected() {
  if (!selectedIds.value.length) {
    ElMessage.warning("请选择需要的数据");
    return;
  }
  await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 条?`, "提示", {
    type: "warning",
  });
  for (const id of selectedIds.value) {
    await deleteGroupApi(id);
  }
  ElMessage.success("已删除");
  loadGroups();
}

async function onImgChange(file: any, field: "img" | "title_picture") {
  const raw: File | undefined = file?.raw;
  if (!raw) return false;
  const uploading = field === "img" ? imgUploading : titlePicUploading;
  uploading.value = true;
  try {
    const res = await uploadMediaApi(raw, "cover");
    gForm[field] = res.url;
    ElMessage.success("上传成功");
  } finally {
    uploading.value = false;
  }
  return false;
}

onMounted(loadGroups);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <ElForm :inline="true" class="mb-2" @submit.prevent="loadGroups">
        <ElFormItem label="名称:">
          <ElInput
            v-model="searchName"
            clearable
            placeholder="输入名称"
            style="width: 220px"
            @keyup.enter="loadGroups"
          />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" native-type="submit">搜索</ElButton>
          <ElButton @click="resetSearch">重置</ElButton>
        </ElFormItem>
      </ElForm>
      <div class="mb-3 flex gap-2">
            <ElButton type="primary" @click="openGCreate">添加</ElButton>
            <ElButton type="danger" @click="delSelected">删除</ElButton>
          </div>
          <ElTable
            v-loading="gLoading"
            :data="groups"
            border
            stripe
            size="small"
            @selection-change="onSelectionChange"
          >
            <ElTableColumn type="selection" width="42" align="center" />
            <ElTableColumn prop="id" label="ID" width="70" align="center" />
            <ElTableColumn prop="name" label="名称" min-width="140" align="center" />
            <ElTableColumn label="会员头衔" width="90" align="center">
              <template #default="{ row }">
                {{ row.title_heat?.trim() ? row.title_heat : "学徒" }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="封面" width="70" align="center">
              <template #default="{ row }">
                <ElImage
                  v-if="row.img"
                  :src="row.img"
                  fit="contain"
                  class="h-6 w-8"
                  preview-teleported
                  :preview-src-list="[row.img]"
                />
                <span v-else>-</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="price" label="价格" width="80" align="center" />
            <ElTableColumn prop="old_price" label="原价" width="80" align="center" />
            <ElTableColumn prop="sort" label="排序" width="70" align="center" />
            <ElTableColumn prop="day_num" label="可用天数" width="90" align="center" />
            <ElTableColumn prop="gift_num" label="赠送金币" width="90" align="center" />
            <ElTableColumn prop="download_num" label="下载次数" width="90" align="center" />
            <ElTableColumn prop="rate" label="购片折扣" width="90" align="center" />
            <ElTableColumn prop="promotion_type_text" label="促销类型" width="100" align="center" />
            <ElTableColumn label="是否禁用" width="90" align="center">
              <template #default="{ row }">
                <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.is_disabled_text || (row.status === 1 ? "正常" : "禁用") }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="updated_at" label="更新时间" width="120" align="center" />
            <ElTableColumn label="操作" width="140" fixed="right" align="center">
              <template #default="{ row }">
                <ElButton link type="primary" @click="openGEdit(row)">编辑</ElButton>
                <ElButton link type="danger" @click="delG(row)">删除</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
    </ElCard>

    <ElDialog
      v-model="gDialog"
      :title="gEdit ? '编辑会员等级' : '添加会员等级'"
      width="720px"
      top="5vh"
    >
      <ElForm label-width="140px">
        <ElFormItem label="名称" required>
          <ElInput v-model="gForm.name" placeholder="请输入名称" />
        </ElFormItem>
        <ElFormItem label="会员头衔">
          <ElInput
            v-model="gForm.title_heat"
            maxlength="5"
            show-word-limit
            placeholder="未填写时默认为学徒"
          />
        </ElFormItem>
        <ElFormItem label="头部会员卡描述">
          <ElInput
            v-model="gForm.title_description"
            maxlength="21"
            show-word-limit
            placeholder="请输入头部会员卡描述"
          />
        </ElFormItem>
        <ElFormItem label="促销类型" required>
          <ElSelect v-model="gForm.promotion_type" class="w-full">
            <ElOption
              v-for="o in promotionOpts"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="价格" required>
          <ElInputNumber v-model="gForm.price" :min="0" :precision="2" class="w-full" />
        </ElFormItem>
        <ElFormItem label="原价" required>
          <ElInputNumber v-model="gForm.old_price" :min="0" :precision="2" class="w-full" />
        </ElFormItem>
        <ElFormItem label="购片折扣" required>
          <ElInputNumber v-model="gForm.rate" :min="-2" :max="100" class="w-full" />
          <div class="text-muted-foreground mt-1 text-xs leading-5">
            1. 购买金币视频或金币帖子的折扣, 帖子折扣实际无效<br>
            2. 填写 -1 表示金币视频免费<br>
            3. 填写 -2 表示金币视频和金币帖子免费
          </div>
        </ElFormItem>
        <ElFormItem label="可用天数" required>
          <ElInputNumber v-model="gForm.day_num" :min="1" class="w-full" />
        </ElFormItem>
        <ElFormItem label="赠送金币" required>
          <ElInputNumber v-model="gForm.gift_num" :min="0" class="w-full" />
        </ElFormItem>
        <ElFormItem label="下载次数" required>
          <ElInputNumber v-model="gForm.download_num" :min="0" class="w-full" />
        </ElFormItem>
        <ElFormItem label="天数提示">
          <ElInput v-model="gForm.day_tips" placeholder="请输入天数提示" />
        </ElFormItem>
        <ElFormItem label="价格提示">
          <ElInput v-model="gForm.price_tips" placeholder="请输入价格提示" />
        </ElFormItem>
        <ElFormItem label="排序" required>
          <ElInputNumber v-model="gForm.sort" :min="0" class="w-full" />
        </ElFormItem>
        <ElFormItem label="封面" required>
          <div class="flex items-start gap-3">
            <ElImage
              v-if="gForm.img"
              :src="gForm.img"
              fit="contain"
              class="h-20 w-28 rounded border"
            />
            <ElUpload
              :show-file-list="false"
              accept="image/*"
              :disabled="imgUploading"
              :before-upload="() => false"
              :on-change="(f: any) => onImgChange(f, 'img')"
            >
              <ElButton :loading="imgUploading">
                {{ gForm.img ? "更换封面" : "上传封面" }}
              </ElButton>
            </ElUpload>
          </div>
        </ElFormItem>
        <ElFormItem label="头衔背景图">
          <div class="flex items-start gap-3">
            <ElImage
              v-if="gForm.title_picture"
              :src="gForm.title_picture"
              fit="contain"
              class="h-20 w-28 rounded border"
            />
            <ElUpload
              :show-file-list="false"
              accept="image/*"
              :disabled="titlePicUploading"
              :before-upload="() => false"
              :on-change="(f: any) => onImgChange(f, 'title_picture')"
            >
              <ElButton :loading="titlePicUploading">
                {{ gForm.title_picture ? "更换图片" : "上传图片" }}
              </ElButton>
            </ElUpload>
          </div>
        </ElFormItem>
        <ElFormItem label="描述">
          <ElInput
            v-model="gForm.remark"
            type="textarea"
            :rows="2"
            placeholder="建议最多 20-25 个字"
          />
        </ElFormItem>
        <ElFormItem label="是否禁用" required>
          <ElRadioGroup v-model="gForm.status">
            <ElRadio :value="1">否</ElRadio>
            <ElRadio :value="0">是</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="会员权益" required>
          <ElCheckboxGroup v-model="gForm.rightsKeys">
            <ElCheckbox
              v-for="o in rightsOpts"
              :key="o.value"
              :value="o.value"
            >
              {{ o.value }} | {{ o.label }}
            </ElCheckbox>
          </ElCheckboxGroup>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="gDialog = false">取消</ElButton>
        <ElButton type="primary" @click="saveG">立即提交</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
