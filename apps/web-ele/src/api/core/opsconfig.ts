import { requestClient } from "#/api/request";

/**
 * 运营配置(公告 / 跳转位 / 敏感词), 对接 my_service /backend/announcement|jumptab|filterword。
 *
 * 命名说明: 文件名叫 opsconfig 而不是 ops/config —— 那两个名字分别被
 * 「运营管理(ops.ts)」和「系统配置(config.ts)」占了, 这里是第三套独立契约, 别混。
 *
 * 约定(整个后台统一):
 * - 列表筛选 status 一律传 **string**, 空串=不筛选。后端 statusOf("")=-1 才是"全部",
 *   传数字 0 会被当成"只看关闭的", 这是踩过的坑。
 * - 例外: 跳转位 location 在 Go 契约里就是 int(`Location int`), 后端按 `location > 0` 判断,
 *   所以这里必须传 number, 0=全部。
 * - requestClient 已把 {code,message,data} 解包成 data, 泛型写的是 data 的形状。
 */
export namespace OpsConfigApi {
  /** 公告 */
  export interface AnnItem {
    id: number;
    title: string;
    content: string;
    text_node: string;
    cover: string;
    jump_url: string;
    sys_type: string;
    start_at: string;
    end_at: string;
    status: number;
    created_at: string;
  }
  export interface AnnListParams {
    status?: string;
    page?: number;
    size?: number;
  }
  export interface AnnSaveBody {
    title: string;
    content?: string;
    text_node?: string;
    cover?: string;
    jump_url?: string;
    /** 投放端, 后端默认 app */
    sys_type?: string;
    /** 空串 = 后端取 now */
    start_at?: string;
    /** 必填, 格式 2027-12-31 23:59:59 */
    end_at: string;
    status?: number;
  }

  /** 跳转位 */
  export interface JtItem {
    id: number;
    cn_name: string;
    en_name: string;
    avatar: string;
    link: string;
    pic_jump_link: string;
    location: number;
    rank: number;
    status: number;
    created_at: string;
  }
  export interface JtListParams {
    /** 契约是 int: 0=全部, >0 精确匹配位置 */
    location?: number;
    status?: string;
    page?: number;
    size?: number;
  }
  export interface JtSaveBody {
    cn_name: string;
    en_name?: string;
    avatar?: string;
    link?: string;
    pic_jump_link?: string;
    /** 必填且需 >0, 后端 JtCreate 直接拒 <=0 */
    location: number;
    rank?: number;
    status?: number;
  }

  /** 敏感词 */
  export interface FwItem {
    id: number;
    word: string;
    created_at: string;
  }
  export interface FwListParams {
    keyword?: string;
    page?: number;
    size?: number;
  }

  export interface Page<T> {
    list: T[];
    total: number;
  }
}

/* ---------- 公告 ---------- */
export function getAnnListApi(params: OpsConfigApi.AnnListParams) {
  return requestClient.get<OpsConfigApi.Page<OpsConfigApi.AnnItem>>(
    "/announcement",
    { params },
  );
}
export function createAnnApi(body: OpsConfigApi.AnnSaveBody) {
  return requestClient.post<{ id: number }>("/announcement", body);
}
/** 注意: 后端更新是"非空才覆盖", 传空串等于保持原值, 无法把字段清空 */
export function updateAnnApi(id: number, body: OpsConfigApi.AnnSaveBody) {
  return requestClient.put(`/announcement/${id}`, { ...body, id });
}
export function deleteAnnApi(id: number) {
  return requestClient.delete(`/announcement/${id}`);
}

/* ---------- 跳转位 ---------- */
export function getJumptabListApi(params: OpsConfigApi.JtListParams) {
  return requestClient.get<OpsConfigApi.Page<OpsConfigApi.JtItem>>("/jumptab", {
    params,
  });
}
export function createJumptabApi(body: OpsConfigApi.JtSaveBody) {
  return requestClient.post<{ id: number }>("/jumptab", body);
}
export function updateJumptabApi(id: number, body: OpsConfigApi.JtSaveBody) {
  return requestClient.put(`/jumptab/${id}`, { ...body, id });
}
export function deleteJumptabApi(id: number) {
  return requestClient.delete(`/jumptab/${id}`);
}

/* ---------- 敏感词(无编辑接口, 只有 列表/新增/删除) ---------- */
export function getFilterWordListApi(params: OpsConfigApi.FwListParams) {
  return requestClient.get<OpsConfigApi.Page<OpsConfigApi.FwItem>>(
    "/filterword",
    { params },
  );
}
/**
 * 批量新增敏感词。契约本身就收数组(FwAddReq.Words []string),
 * 后端用 InsertIgnore 去重, 返回 added = 实际入库条数(重复的会被跳过),
 * 所以前端不需要循环调用, 一次请求即可拿到成功数。
 */
export function addFilterWordsApi(words: string[]) {
  return requestClient.post<{ added: number }>("/filterword", { words });
}
export function deleteFilterWordApi(id: number) {
  return requestClient.delete(`/filterword/${id}`);
}
