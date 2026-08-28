import { requestClient } from "#/api/request";

import type { VideoCategoryApi } from "#/api/core/video-category";

export type DouyinCategoryApi = VideoCategoryApi;

export function getDouyinCategoryListApi(params: VideoCategoryApi.ListParams) {
  return requestClient.get<VideoCategoryApi.Page<VideoCategoryApi.Item>>(
    "/douyin-categories",
    { params },
  );
}
export function createDouyinCategoryApi(body: VideoCategoryApi.SaveBody) {
  return requestClient.post<{ id: number }>("/douyin-categories", body);
}
export function updateDouyinCategoryApi(
  id: number,
  body: VideoCategoryApi.SaveBody,
) {
  return requestClient.put(`/douyin-categories/${id}`, { ...body, id });
}
export function deleteDouyinCategoryApi(id: number) {
  return requestClient.delete(`/douyin-categories/${id}`);
}
