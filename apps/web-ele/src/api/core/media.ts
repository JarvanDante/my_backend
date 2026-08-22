import { requestClient } from "#/api/request";

export namespace MediaApi {
  export interface UploadResult {
    id: number;
    url: string;
    object_key: string;
    bucket: string;
    purpose: string;
    content_type: string;
    size: number;
  }

  export interface MultipartInit {
    upload_id: string;
    object_key: string;
    bucket: string;
    purpose: string;
    content_type: string;
    size: number;
    part_size: number;
    part_count: number;
  }

  export interface PresignItem {
    part_number: number;
    url: string;
    method: string;
    expires_in: number;
  }

  export interface PartItem {
    part_number: number;
    etag: string;
    size: number;
  }
}

/** 小文件/封面：走统一存储，写入桶 my-storage */
export async function uploadMediaApi(file: File, purpose = "cover") {
  const init = await requestClient.post<{
    id: string;
    upload_url: string;
    object_key: string;
    bucket: string;
  }>("/media/storage/init", {
    filename: file.name || "image.jpg",
    purpose,
    content_type: file.type || "",
    size: file.size,
  });
  const put = await fetch(init.upload_url, { method: "PUT", body: file });
  if (!put.ok) {
    throw new Error(`统一存储直传失败(${put.status})`);
  }
  const done = await requestClient.post<{
    id: string;
    url: string;
    object_key: string;
    bucket: string;
    size: number;
  }>("/media/storage/confirm", { id: init.id });
  return {
    id: 0,
    url: done.url,
    object_key: done.object_key || init.object_key || init.id,
    bucket: done.bucket || init.bucket || "my-storage",
    purpose,
    content_type: file.type || "",
    size: done.size || file.size,
  } satisfies MediaApi.UploadResult;
}

export function multipartInitApi(p: {
  filename: string;
  purpose?: string;
  content_type?: string;
  size: number;
  part_size?: number;
}) {
  return requestClient.post<MediaApi.MultipartInit>("/media/multipart/init", {
    purpose: "video",
    ...p,
  });
}

export function multipartPresignApi(uploadId: string, partNumbers: number[]) {
  return requestClient.post<{ list: MediaApi.PresignItem[] }>(
    "/media/multipart/presign",
    { upload_id: uploadId, part_numbers: partNumbers }
  );
}

export function multipartPartsApi(uploadId: string) {
  return requestClient.get<{
    upload_id: string;
    status: number;
    part_count: number;
    list: MediaApi.PartItem[];
  }>("/media/multipart/parts", { params: { upload_id: uploadId } });
}

export function multipartCompleteApi(
  uploadId: string,
  parts?: { part_number: number; etag: string }[]
) {
  return requestClient.post<MediaApi.UploadResult>(
    "/media/multipart/complete",
    { upload_id: uploadId, parts: parts || [] }
  );
}

export function multipartAbortApi(uploadId: string) {
  return requestClient.post("/media/multipart/abort", {
    upload_id: uploadId,
  });
}
