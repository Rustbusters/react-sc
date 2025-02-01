<script lang="ts">
    import { onMount } from "svelte";
    import { Smile } from 'lucide-svelte';

    interface Props {
        inputElement: HTMLInputElement;
        onEmojiSelect?: (emoji: string) => void;
    }

    let { inputElement = $bindable(), onEmojiSelect }: Props = $props();
    let open: boolean = $state(false);
    let dropdownRef: HTMLDivElement;

    const emojiList = [
        "😂",
        "❤️",
        "😍",
        "🤣",
        "😊",
        "🙏",
        "🥰",
        "😭",
        "😘",
        "👍",
        "🤔",
        "😅",
        "🎉",
        "👏",
        "🥳",
        "🤗",
        "😎",
        "💔",
        "💕",
        "😜",
    ];

    const insertEmoji = (emoji: string) => {
        onEmojiSelect?.(emoji);
    };

    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
            open = false;
        }
    };

    onMount(() => {
        document.addEventListener("click", handleClickOutside);
        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    });
</script>

<div
    class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-400"
>
    <button
        onclick={(e) => {
            e.stopPropagation();
            open = !open;
        }}
        class="emoji-button hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 bg-white dark:bg-gray-700 rounded-full p-1"
        aria-label="Insert emoji"
    >
        <Smile class="size-5"/>
    </button>

    <div
        bind:this={dropdownRef}
        class="emoji-dropdown {open
            ? 'grid'
            : 'hidden'} select-none absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 grid-cols-5 gap-2"
    >
        {#each emojiList as emoji}
            <button
                onclick={(e) => {
                    e.stopPropagation();
                    insertEmoji(emoji);
                }}
                class="emoji-option p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-200"
            >
                {emoji}
            </button>
        {/each}
    </div>
</div>
