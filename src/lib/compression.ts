export function isCompressionStreamsSupported(): boolean {
	return (
		typeof CompressionStream !== "undefined" &&
		typeof DecompressionStream !== "undefined"
	);
}

export async function compressBytes(
	bytes: Uint8Array,
	format: "gzip" | "deflate" = "gzip",
): Promise<Uint8Array> {
	if (!isCompressionStreamsSupported()) {
		return bytes;
	}
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(bytes);
			controller.close();
		},
	});
	const compressedStream = stream.pipeThrough(new CompressionStream(format));
	const response = new Response(compressedStream);
	const buffer = await response.arrayBuffer();
	return new Uint8Array(buffer);
}

export async function decompressBytes(
	bytes: Uint8Array,
	format: "gzip" | "deflate" = "gzip",
): Promise<Uint8Array> {
	if (!isCompressionStreamsSupported()) {
		return bytes;
	}
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(bytes);
			controller.close();
		},
	});
	const decompressedStream = stream.pipeThrough(
		new DecompressionStream(format),
	);
	const response = new Response(decompressedStream);
	const buffer = await response.arrayBuffer();
	return new Uint8Array(buffer);
}

export async function compressString(text: string): Promise<Uint8Array> {
	const encoder = new TextEncoder();
	const rawBytes = encoder.encode(text);
	return compressBytes(rawBytes);
}

export async function decompressToString(
	compressedBytes: Uint8Array,
): Promise<string> {
	const decompressed = await decompressBytes(compressedBytes);
	const decoder = new TextDecoder();
	return decoder.decode(decompressed);
}
