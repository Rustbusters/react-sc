import Compressor from 'compressorjs';
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function fileToUint8Array(file: File): Promise<Uint8Array> {
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
}

export function compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
        new Compressor(file, {
            quality: 0.8,
            maxWidth: 1920,
            maxHeight: 1080,
            success: (result) => {
                resolve(result as File);
            },
            error: (err) => {
                console.error('Compression failed:', err);
                reject(err);
            },
        });
    });
}

export async function fileToBase64(file: File): Promise<string> {
    if (isImageFile(file)) {
        // Log dimensione originale
        const originalBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
        console.log(`Original image size: ${(originalBase64.length * 0.75 / 1024).toFixed(2)}KB`);

        // Comprimi e log dimensione compressa
        const compressedFile = await compressImage(file);
        const compressedBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(compressedFile);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
        console.log(`Compressed image size: ${(compressedBase64.length * 0.75 / 1024).toFixed(2)}KB`);
        console.log(`Compression ratio: ${(100 - (compressedBase64.length / originalBase64.length) * 100).toFixed(2)}%`);

        return compressedBase64;
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
}

export async function clipboardToUint8Array(item: ClipboardItem): Promise<Uint8Array | null> {
    if (IMAGE_MIME_TYPES.some(type => item.types.includes(type))) {
        const blob = await item.getType(item.types.find(type => IMAGE_MIME_TYPES.includes(type)) || 'image/png');
        const buffer = await blob.arrayBuffer();
        return new Uint8Array(buffer);
    }
    return null;
}

export async function clipboardToBase64(item: ClipboardItem): Promise<string | null> {
    if (IMAGE_MIME_TYPES.some(type => item.types.includes(type))) {
        const blob = await item.getType(item.types.find(type => IMAGE_MIME_TYPES.includes(type)) || 'image/png');
        const file = new File([blob], 'clipboard-image.png', { type: 'image/png' });
        return fileToBase64(file);
    }
    return null;
}

export function isImageFile(file: File): boolean {
    return IMAGE_MIME_TYPES.includes(file.type);
}

export function createImagePreview(data: Uint8Array): string {
    const blob = new Blob([data], { type: 'image/png' });
    return URL.createObjectURL(blob);
}
