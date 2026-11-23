export function isOpfsSupported(): boolean {
	return (
		typeof navigator !== "undefined" &&
		typeof navigator.storage !== "undefined" &&
		typeof navigator.storage.getDirectory === "function"
	);
}

const OPFS_DIR_NAME = "editnovel_binary_store";

async function getOpfsDirectory(): Promise<FileSystemDirectoryHandle | null> {
	if (!isOpfsSupported()) return null;
	try {
		const root = await navigator.storage.getDirectory();
		return await root.getDirectoryHandle(OPFS_DIR_NAME, { create: true });
	} catch {
		return null;
	}
}

export async function saveFileToOpfs(
	id: string,
	data: Blob | ArrayBuffer,
): Promise<boolean> {
	const dir = await getOpfsDirectory();
	if (!dir) return false;
	try {
		const fileHandle = await dir.getFileHandle(id, { create: true });
		const writable = await fileHandle.createWritable();
		await writable.write(data);
		await writable.close();
		return true;
	} catch {
		return false;
	}
}

export async function readFileFromOpfs(id: string): Promise<File | null> {
	const dir = await getOpfsDirectory();
	if (!dir) return null;
	try {
		const fileHandle = await dir.getFileHandle(id);
		return await fileHandle.getFile();
	} catch {
		return null;
	}
}

export async function deleteFileFromOpfs(id: string): Promise<boolean> {
	const dir = await getOpfsDirectory();
	if (!dir) return false;
	try {
		await dir.removeEntry(id);
		return true;
	} catch {
		return false;
	}
}

export async function listOpfsFileIds(): Promise<string[]> {
	const dir = await getOpfsDirectory();
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

export async function clearOpfsStorage(): Promise<void> {
	const dir = await getOpfsDirectory();
	if (!dir) return;
	try {
		if ("keys" in dir && typeof dir.keys === "function") {
			for await (const name of dir.keys()) {
				await dir.removeEntry(name).catch(() => {});
			}
		}
	} catch {}
}
