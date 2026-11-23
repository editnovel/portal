interface ImageDecoderOptions {
	data: ReadableStream<Uint8Array>;
	type: string;
}

interface ImageFrame {
	image: {
		displayWidth: number;
		displayHeight: number;
		width?: number;
		height?: number;
		close: () => void;
	};
	close: () => void;
}

interface ImageDecoderInstance {
	decode: (options?: { frameIndex?: number }) => Promise<ImageFrame>;
}

interface ImageDecoderConstructor {
	new (options: ImageDecoderOptions): ImageDecoderInstance;
}

export function isHardwareDecodingSupported(): boolean {
	return (
		typeof window !== "undefined" &&
		typeof (window as unknown as { ImageDecoder?: ImageDecoderConstructor })
			.ImageDecoder !== "undefined"
	);
}

export interface DecodedImageResult {
	width: number;
	height: number;
	bitmap?: ImageBitmap;
}

export async function decodeImageHardware(
	blob: Blob,
): Promise<DecodedImageResult> {
	if (isHardwareDecodingSupported()) {
		try {
			const ImageDecoderClass = (
				window as unknown as { ImageDecoder: ImageDecoderConstructor }
			).ImageDecoder;
			const decoder = new ImageDecoderClass({
				data: blob.stream(),
				type: blob.type || "image/jpeg",
			});
			const frame = await decoder.decode({ frameIndex: 0 });
			const width = frame.image.displayWidth || frame.image.width || 0;
			const height = frame.image.displayHeight || frame.image.height || 0;
			let bitmap: ImageBitmap | undefined;
			if (typeof createImageBitmap !== "undefined") {
				bitmap = await createImageBitmap(
					frame.image as unknown as ImageBitmapSource,
				);
			}
			frame.close();
			return { width, height, bitmap };
		} catch {
			// Fallback if mime-type is unsupported by hardware decoder
		}
	}

	if (typeof createImageBitmap !== "undefined") {
		try {
			const bitmap = await createImageBitmap(blob);
			return {
				width: bitmap.width,
				height: bitmap.height,
				bitmap,
			};
		} catch {
			// Fallback to DOM Image if createImageBitmap fails
		}
	}

	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(blob);
		const img = new Image();
		img.onload = () => {
			const width = img.naturalWidth;
			const height = img.naturalHeight;
			URL.revokeObjectURL(url);
			resolve({ width, height });
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to decode image"));
		};
		img.src = url;
	});
}

export async function getImageDimensions(
	blob: Blob,
): Promise<{ width: number; height: number }> {
	const result = await decodeImageHardware(blob);
	if (result.bitmap) {
		result.bitmap.close();
	}
	return { width: result.width, height: result.height };
}
