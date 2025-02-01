const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function fileToUint8Array(file: File): Promise<Uint8Array> {
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
}

export async function fileToBase64(file: File): Promise<string> {
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
        return fileToBase64(new File([blob], 'clipboard-image.png', { type: 'image/png' }));
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
