import { requestClient } from "#/api/request";

export namespace BkGroupApi {
  export interface GroupItem {
    id: number;
    name: string;
    rate: number;
    rights: string;
    remark: string;
    sort: number;
    status: number;
  }
}

export async function getGroupListApi() {
  return requestClient.get<{ list: BkGroupApi.GroupItem[] }>("/user-groups");
}

export async function createGroupApi(p: {
  name: string;
  rate: number;
  rights?: string;
  remark?: string;
  sort?: number;
  status: number;
}) {
  return requestClient.post<{ id: number }>("/user-groups", p);
}

export async function updateGroupApi(p: {
  id: number;
  name: string;
  rate: number;
  rights?: string;
  remark?: string;
  sort?: number;
  status: number;
}) {
  return requestClient.put(`/user-groups/${p.id}`, p);
}

export async function deleteGroupApi(id: number) {
  return requestClient.delete(`/user-groups/${id}`);
}
