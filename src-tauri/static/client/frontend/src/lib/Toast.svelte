<script lang="ts">
    import { X } from 'lucide-svelte';

    interface Props {
        message: string;
        type?: 'error' | 'success';
        duration?: number;
        onClose?: () => void;
        key?: number;
    }

    let { message, type = 'error', duration = 3000, onClose, key = 0 }: Props = $props();
    
    let visible = $state(true);
    let timeout: number;

    $effect(() => {
        visible = true;
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            dismiss();
        }, duration);

        return () => {
            if (timeout) clearTimeout(timeout);
        };
    });

    function dismiss() {
        visible = false;
        if (timeout) clearTimeout(timeout);
        onClose?.();
    }
</script>

{#if visible}
    <div class="absolute top-20 left-1/2 -translate-x-1/2 z-10">
        <div class="px-4 py-2 rounded-lg shadow-lg {type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white flex items-center gap-2">
            <span>{message}</span>
            <button 
                onclick={dismiss}
                class="ml-2 p-1 hover:bg-black/20 rounded-full transition-colors"
                aria-label="Dismiss"
            >
                <X class="size-4" />
            </button>
        </div>
    </div>
{/if}
