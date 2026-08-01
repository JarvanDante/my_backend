import { requestClient } from "#/api/request";

export namespace SiteConfigApi {
  export interface CurrentData {
    site_code: string;
    env: string;
    namespace_id: string;
    data_id: string;
    group: string;
    exists: boolean;
    content: string;
  }

  export interface PublishData {
    version: number;
    data_id: string;
  }

  export interface HistoryItem {
    id: number;
    version: number;
    env: string;
    content: string;
    operator: number;
    remark: string;
    created_at: string;
  }

  export interface HistoryData {
    list: HistoryItem[];
    total: number;
    page: number;
    size: number;
  }
}

export async function getCurrentConfigApi(siteId: number) {
  return requestClient.get<SiteConfigApi.CurrentData>(`/sites/${siteId}/config`);
}

export async function publishConfigApi(siteId: number, content: string, remark: string) {
  return requestClient.post<SiteConfigApi.PublishData>(
    `/sites/${siteId}/config/publish`,
    { id: siteId, content, remark }
  );
}

export async function getConfigHistoryApi(siteId: number, page = 1, size = 20) {
  return requestClient.get<SiteConfigApi.HistoryData>(
    `/sites/${siteId}/config/history`,
    { params: { page, size } }
  );
}

export async function rollbackConfigApi(siteId: number, version: number) {
  return requestClient.post<SiteConfigApi.PublishData>(
    `/sites/${siteId}/config/rollback`,
    { id: siteId, version }
  );
}
