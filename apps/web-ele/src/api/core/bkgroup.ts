import { requestClient } from "#/api/request";

export namespace BkGroupApi {
  export interface GroupItem {
    id: number;
    name: string;
    title_heat: string;
    title_description: string;
    title_picture: string;
    img: string;
    level: number;
    level_text: string;
    promotion_type: number;
    promotion_type_text: string;
    price: number;
    old_price: number;
    rate: number;
    day_num: number;
    gift_num: number;
    download_num: number;
    day_tips: string;
    price_tips: string;
    rights: string;
    remark: string;
    sort: number;
    status: number;
    is_disabled_text: string;
    updated_at: string;
  }

  export interface GroupPayload {
    id?: number;
    name: string;
    title_heat?: string;
    title_description?: string;
    title_picture?: string;
    img?: string;
    level: number;
    promotion_type: number;
    price: number;
    old_price: number;
    rate: number;
    day_num: number;
    gift_num: number;
    download_num: number;
    day_tips?: string;
    price_tips?: string;
    rights?: string;
    remark?: string;
    sort?: number;
    status: number;
  }
}

export async function getGroupListApi(name = "") {
  return requestClient.get<{ list: BkGroupApi.GroupItem[] }>("/user-groups", {
    params: name ? { name } : undefined,
  });
}

export async function createGroupApi(p: BkGroupApi.GroupPayload) {
  return requestClient.post<{ id: number }>("/user-groups", p);
}

export async function updateGroupApi(p: BkGroupApi.GroupPayload & { id: number }) {
  return requestClient.put(`/user-groups/${p.id}`, p);
}

export async function deleteGroupApi(id: number) {
  return requestClient.delete(`/user-groups/${id}`);
}
