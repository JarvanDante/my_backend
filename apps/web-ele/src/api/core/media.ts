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

/** 封面/图片：本站加密成 .bnc 后写入统一存储 my-storage */
export function uploadMediaApi(file: File, purpose = "cover") {
  return requestClient.upload<MediaApi.UploadResult>("/media/upload", {
    file,
    purpose,
  });
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
