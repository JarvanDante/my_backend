import { requestClient } from "#/api/request";

import type { VideoCategoryApi } from "#/api/core/video-category";

export type PostCategoryApi = VideoCategoryApi;

export function getPostCategoryListApi(params: VideoCategoryApi.ListParams) {
  return requestClient.get<VideoCategoryApi.Page<VideoCategoryApi.Item>>(
    "/post-categories",
    { params },
  );
}
export function createPostCategoryApi(body: VideoCategoryApi.SaveBody) {
  return requestClient.post<{ id: number }>("/post-categories", body);
}
export function updatePostCategoryApi(
  id: number,
  body: VideoCategoryApi.SaveBody,
) {
  return requestClient.put(`/post-categories/${id}`, { ...body, id });
}
export function deletePostCategoryApi(id: number) {
  return requestClient.delete(`/post-categories/${id}`);
}
