<script lang="ts">
    import { X, Download } from 'lucide-svelte';
    import { onMount } from 'svelte';

    interface Props {
        src: string;
        onClose: () => void;
        containerClass?: string;
    }

    let { src, onClose, containerClass = '' }: Props = $props();

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            onClose();
        }
    }

    function downloadImage() {
        const link = document.createElement('a');
        link.href = src;
        link.download = `image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    onMount(() => {
        document.addEventListener('keydown', handleKeydown);
        return () => {
            document.removeEventListener('keydown', handleKeydown);
        };
    });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    class="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm {containerClass}"
    onclick={onClose}
>
    <div 
        class="relative w-[80%] h-[80%] flex items-center justify-center"
        onclick={(e) => e.stopPropagation()}
    >
        <div class="relative w-full h-full flex items-center justify-center">
            <img
                {src}
                alt="Full size"
                class="rounded-lg shadow-xl min-w-[300px] min-h-[300px] w-auto h-auto max-w-full max-h-full object-contain"
            />
            <div class="absolute -top-4 -right-4 flex gap-2">
                <button
                    onclick={downloadImage}
                    class="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors shadow-lg backdrop-blur-sm"
                >
                    <Download class="size-5" />
                </button>
                <button
                    onclick={onClose}
                    class="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors shadow-lg backdrop-blur-sm"
                >
                    <X class="size-5" />
                </button>
            </div>
        </div>
    </div>
</div>
