import { requestClient } from "#/api/request";

import type { VideoCategoryApi } from "#/api/core/video-category";

export type CartoonCategoryApi = VideoCategoryApi;

export function getCartoonCategoryListApi(params: VideoCategoryApi.ListParams) {
  return requestClient.get<VideoCategoryApi.Page<VideoCategoryApi.Item>>(
    "/cartoon-categories",
    { params },
  );
}
export function createCartoonCategoryApi(body: VideoCategoryApi.SaveBody) {
  return requestClient.post<{ id: number }>("/cartoon-categories", body);
}
export function updateCartoonCategoryApi(
  id: number,
  body: VideoCategoryApi.SaveBody,
) {
  return requestClient.put(`/cartoon-categories/${id}`, { ...body, id });
}
export function deleteCartoonCategoryApi(id: number) {
  return requestClient.delete(`/cartoon-categories/${id}`);
}
