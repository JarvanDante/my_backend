import {
  multipartCompleteApi,
  multipartInitApi,
  multipartPartsApi,
  multipartPresignApi,
  type MediaApi,
} from "#/api/core/media";

export type MultipartProgress = {
  loadedParts: number;
  totalParts: number;
  percent: number;
};

/**
 * H5 分片直传 MinIO。
 * 注意: MinIO 桶需配置 CORS, 并 ExposeHeaders: ETag。
 */
export async function uploadVideoMultipart(
  file: File,
  options?: {
    purpose?: string;
    partSize?: number;
    concurrency?: number;
    onProgress?: (p: MultipartProgress) => void;
  }
): Promise<MediaApi.UploadResult> {
  const concurrency = options?.concurrency ?? 3;
  const init = await multipartInitApi({
    filename: file.name,
    purpose: options?.purpose || "video",
    content_type: file.type || "video/mp4",
    size: file.size,
    part_size: options?.partSize,
  });

  const { upload_id, part_size, part_count } = init;
  const existed = await multipartPartsApi(upload_id);
  const doneMap = new Map<number, string>();
  for (const p of existed.list || []) {
    doneMap.set(p.part_number, p.etag);
  }

  const need = Array.from({ length: part_count }, (_, i) => i + 1).filter(
    (n) => !doneMap.has(n)
  );

  const report = () => {
    options?.onProgress?.({
      loadedParts: doneMap.size,
      totalParts: part_count,
      percent: Math.min(
        100,
        Math.round((doneMap.size / Math.max(part_count, 1)) * 100)
      ),
    });
  };
  report();

  for (let i = 0; i < need.length; i += concurrency) {
    const batch = need.slice(i, i + concurrency);
    const { list } = await multipartPresignApi(upload_id, batch);
    await Promise.all(
      list.map(async (item) => {
        const start = (item.part_number - 1) * part_size;
        const blob = file.slice(start, start + part_size);
        const put = await fetch(item.url, { method: "PUT", body: blob });
        if (!put.ok) {
          throw new Error(`分片 ${item.part_number} 上传失败(${put.status})`);
        }
        const etag = (put.headers.get("ETag") || "").replaceAll('"', "");
        if (!etag) {
          throw new Error(
            `分片 ${item.part_number} 未返回 ETag(请检查 MinIO CORS ExposeHeaders)`
          );
        }
        doneMap.set(item.part_number, etag);
        report();
      })
    );
  }

  const parts = Array.from(doneMap.entries())
    .map(([part_number, etag]) => ({ part_number, etag }))
    .sort((a, b) => a.part_number - b.part_number);

  return multipartCompleteApi(upload_id, parts);
}
