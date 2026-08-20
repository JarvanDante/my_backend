import { requestClient } from "#/api/request";

/**
 * 视频分类(对接 my_service /backend/video-categories*)。
 *
 * kind: 0 普通分类(给作品打标, 同步出现在 H5 顶栏)
 *       1 新更 / 2 推荐 / 3 榜单 —— 只占 H5 栏位, 不作为作品分类。
 * status 传 string, 空串=全部。
 */
export namespace VideoCategoryApi {
  export interface Item {
    id: number;
    name: string;
    kind: number;
    rank: number;
    status: number;
    created_at: string;
  }
  export interface ListParams {
    kind?: string;
    status?: string;
    page?: number;
    size?: number;
  }
  export interface SaveBody {
    name: string;
    kind?: number;
    rank?: number;
    status?: number;
  }
  export interface Page<T> {
    list: T[];
    total: number;
  }
}

export function getVideoCategoryListApi(params: VideoCategoryApi.ListParams) {
  return requestClient.get<VideoCategoryApi.Page<VideoCategoryApi.Item>>(
    "/video-categories",
    { params },
  );
}
export function createVideoCategoryApi(body: VideoCategoryApi.SaveBody) {
  return requestClient.post<{ id: number }>("/video-categories", body);
}
export function updateVideoCategoryApi(
  id: number,
  body: VideoCategoryApi.SaveBody,
) {
  return requestClient.put(`/video-categories/${id}`, { ...body, id });
}
export function deleteVideoCategoryApi(id: number) {
  return requestClient.delete(`/video-categories/${id}`);
}
