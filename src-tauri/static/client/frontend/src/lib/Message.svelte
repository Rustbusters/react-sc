<script lang="ts">
    import { AlertTriangle } from 'lucide-svelte';
    import type { Message } from "../types/message";

    interface Props {
        message: Message;
        isReceived: boolean;
        onImageClick?: (src: string) => void;
        onImageLoad?: () => void;
    }

    let { message, isReceived, onImageClick, onImageLoad }: Props = $props();
</script>

<div class="flex {isReceived ? 'justify-start' : 'justify-end'} animate-fadeIn">
    <div class="flex flex-col {message.content.type === 'Text' ? 'max-w-[70%]' : 'w-[60%]'} gap-0.5">
        {#if message.content.type === "Text"}
            <div 
                class="inline-block rounded-2xl px-4 py-2 {isReceived
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none'
                    : message.status === 'failed'
                        ? 'bg-blue-300 text-white rounded-br-none'
                        : 'bg-blue-500 text-white rounded-br-none'} shadow-sm break-words whitespace-pre-wrap overflow-hidden"
            >
                {message.content.data}
            </div>
        {:else if message.content.type === "Image"}
            <div 
                class="p-1 rounded-xl {isReceived
                    ? 'bg-gray-100 dark:bg-gray-700 rounded-bl-none'
                    : message.status === 'failed'
                        ? 'bg-blue-300 rounded-br-none'
                        : 'bg-blue-500 rounded-br-none'} shadow-sm"
            >
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <img 
                    src={message.content.data}
                    alt="Sent img"
                    class="w-full h-auto rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    loading="lazy"
                    onclick={() => onImageClick?.(message.content.data)}
                    onload={onImageLoad}
                />
            </div>
        {/if}
        <div class="flex items-center gap-1 px-1 {isReceived ? 'justify-start' : 'justify-end'}">
            <span class="text-xs text-gray-500 dark:text-gray-400">
                {message.timestamp}
            </span>
            {#if message.status === 'failed'}
                <AlertTriangle class="size-3 text-red-500" />
            {/if}
        </div>
    </div>
</div>

<style>
/* Evita taglio di parole brevi e garantisci spezzatura del testo */
.inline-block {
    word-wrap: break-word;
    word-break: break-word;
}
</style>
