import { OPFS_DIRS, type OpfsBucket } from "./opfs-keys";

export function isOpfsSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage !== "undefined" &&
    typeof navigator.storage.getDirectory === "function"
  );
}

function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function sanitizeOpfsFilename(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (safe.length > 0 && safe.length <= 120 && safe === id) {
    return safe;
  }
  const prefix = (safe || "entry").slice(0, 100);
  return `${prefix}_${fnv1aHex(id)}`;
}

export function buildImageOpfsKey(fileId: string, imageName: string): string {
  return sanitizeOpfsFilename(`${fileId}__${imageName}`);
}

async function getOpfsDirectory(
  bucket: OpfsBucket = OPFS_DIRS.binaries
): Promise<FileSystemDirectoryHandle | null> {
  if (!isOpfsSupported()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(bucket, { create: true });
  } catch {
    return null;
  }
}

export async function saveFileToOpfs(
  id: string,
  data: Blob | ArrayBuffer | Uint8Array,
  bucket: OpfsBucket = OPFS_DIRS.binaries
): Promise<boolean> {
  const dir = await getOpfsDirectory(bucket);
  if (!dir) return false;
  try {
    const fileHandle = await dir.getFileHandle(sanitizeOpfsFilename(id), { create: true });
    const writable = await fileHandle.createWritable();
    const payload: Blob | ArrayBuffer =
      data instanceof Uint8Array ? new Uint8Array(data).buffer : data;
    await writable.write(payload);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

export async function readFileFromOpfs(
  id: string,
  bucket: OpfsBucket = OPFS_DIRS.binaries
): Promise<File | null> {
  const dir = await getOpfsDirectory(bucket);
  if (!dir) return null;
  try {
    const fileHandle = await dir.getFileHandle(sanitizeOpfsFilename(id));
    return await fileHandle.getFile();
  } catch {
    return null;
  }
}

export async function deleteFileFromOpfs(
  id: string,
  bucket: OpfsBucket = OPFS_DIRS.binaries
): Promise<boolean> {
  const dir = await getOpfsDirectory(bucket);
  if (!dir) return false;
  try {
    await dir.removeEntry(sanitizeOpfsFilename(id));
    return true;
  } catch {
    return false;
  }
}

export async function listOpfsFileIds(bucket: OpfsBucket = OPFS_DIRS.binaries): Promise<string[]> {
  const dir = await getOpfsDirectory(bucket);
  if (!dir) return [];
  const ids: string[] = [];
  try {
    if ("keys" in dir && typeof dir.keys === "function") {
      for await (const name of dir.keys()) {
        ids.push(name);
      }
    }
  } catch {}
  return ids;
}

export async function clearOpfsBucket(bucket: OpfsBucket): Promise<void> {
  const dir = await getOpfsDirectory(bucket);
  if (!dir) return;
  try {
    if ("keys" in dir && typeof dir.keys === "function") {
      for await (const name of dir.keys()) {
        await dir.removeEntry(name).catch(() => {});
      }
    }
  } catch {}
}

export async function clearOpfsStorage(bucket?: OpfsBucket): Promise<void> {
  if (bucket) {
    await clearOpfsBucket(bucket);
    return;
  }
  await Promise.all([clearOpfsBucket(OPFS_DIRS.binaries), clearOpfsBucket(OPFS_DIRS.images)]);
}

export async function saveImageToOpfs(
  fileId: string,
  imageName: string,
  data: Blob | ArrayBuffer | Uint8Array
): Promise<boolean> {
  return saveFileToOpfs(buildImageOpfsKey(fileId, imageName), data, OPFS_DIRS.images);
}

export async function readImageFromOpfs(fileId: string, imageName: string): Promise<File | null> {
  const direct = await readFileFromOpfs(buildImageOpfsKey(fileId, imageName), OPFS_DIRS.images);
  if (direct) return direct;
  return readFileFromOpfs(imageName, OPFS_DIRS.images);
}

export async function deleteImageFromOpfs(fileId: string, imageName: string): Promise<boolean> {
  return deleteFileFromOpfs(buildImageOpfsKey(fileId, imageName), OPFS_DIRS.images);
}

export async function listOpfsImageKeys(): Promise<string[]> {
  return listOpfsFileIds(OPFS_DIRS.images);
}
