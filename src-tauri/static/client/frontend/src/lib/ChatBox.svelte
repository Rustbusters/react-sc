<script lang="ts">
    import { CircleUserRound, LoaderCircle, Paperclip, Send, X } from "lucide-svelte";
    import { messages, serializeKey } from "../stores/store";
    import { type Message as Msg } from "../types/message";
    import { sendMessage } from "../utils/chat";
    import { fileToBase64, isImageFile } from "../utils/file";
    import EmojiButton from "./EmojiButton.svelte";
    import Message from "./Message.svelte";
    import Toast from "./Toast.svelte";
    import { clientUsers } from "../stores/users";
    import type { User } from "../types/websocket";

    interface Props {
        clientId: number;
        destinationId: number;
        onImageClick?: (src: string) => void;
    }

    let { clientId, destinationId, onImageClick }: Props = $props();

    let inputElement: HTMLInputElement | undefined = $state();
    let inputValue = $state("");

    // svelte-ignore non_reactive_update
    let chatBox: HTMLDivElement;
    let chatBoxWrapper: HTMLDivElement;

    // Track if chat is scrolled to bottom
    let isAtBottom = true;

    let showToast = $state(false);
    let toastMessage = $state("");
    let toastId = $state(0);

    // Get destination user's name
    const user: User = $derived(
        $clientUsers[clientId]?.users.find((u) => u.id === destinationId) ?? {
            id: destinationId,
            name: `Client ${destinationId}`,
        }
    );

    // Scrolls to bottom without animation
    const scrollToBottom = () => {
        if (chatBox) {
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    };

    // Handle image load event
    function handleImageLoad() {
        setTimeout(scrollToBottom, 60);
    }

    // Initial scroll and message observer
    $effect.root(() => {
        if (chatBox) {
            // Immediate scroll on mount
            scrollToBottom();
        }
    });

    // Watch for new messages and scroll if needed
    $effect(() => {
        if ($messages[serializeKey(clientId, destinationId)] && isAtBottom) {
            // Aggiungiamo un delay leggermente più lungo per assicurarci che il DOM sia aggiornato
            setTimeout(scrollToBottom, 60);
        }
    });

    // Reset scroll position when changing chat
    $effect(() => {
        isAtBottom = true;
        destinationId; // signal dependency
        setTimeout(scrollToBottom, 0);
    });

    // Check if user has scrolled away from bottom
    const checkScroll = () => {
        if (!chatBox) return;
        const threshold = 1;
        isAtBottom =
            Math.abs(
                chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight
            ) <= threshold;
    };

    let imageData: string | null = $state(null);
    let imagePreview: string | null = $state(null);
    let fileInput: HTMLInputElement;
    let isSendingImage = $state(false);

    async function handleImageSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (file && isImageFile(file)) {
            try {
                imageData = await fileToBase64(file);
                imagePreview = imageData;
            } catch (error) {
                console.error('Error processing image:', error);
                toastMessage = "Failed to process image. Please try again.";
                toastId++;
                showToast = true;
            }
        }
        input.value = "";
    }

    async function handlePaste(event: ClipboardEvent) {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.kind === "file") {
                const file = item.getAsFile();
                if (file && isImageFile(file)) {
                    event.preventDefault();
                    try {
                        imageData = await fileToBase64(file);
                        imagePreview = imageData;
                    } catch (error) {
                        console.error('Error processing pasted image:', error);
                        toastMessage = "Failed to process image. Please try again.";
                        toastId++;
                        showToast = true;
                    }
                    return;
                }
            }
        }
    }

    async function handleSend() {
        if (!imageData && !inputValue.trim()) return;

        try {
            if (imageData) {
                isSendingImage = true;
                await sendMessage(clientId, destinationId, imageData, "Image");
                imageData = null;
                imagePreview = null;
                isSendingImage = false;
            }

            if (inputValue.trim()) {
                await sendMessage(clientId, destinationId, inputValue, "Text");
                inputValue = "";
                if (inputElement) {
                    inputElement.value = "";
                }
            }

            // Forziamo isAtBottom a true e chiamiamo scrollToBottom con un delay
            isAtBottom = true;
            // Aumentiamo il delay per assicurarci che il messaggio sia stato renderizzato
            setTimeout(() => {
                scrollToBottom();
                // Doppio check per assicurarci che lo scroll sia avvenuto
                setTimeout(scrollToBottom, 50);
            }, 60);
        } catch (error) {
            isSendingImage = false;
            console.error(error);
            toastMessage = "Failed to send message. Please try again.";
            toastId++;
            showToast = true;
        }
    }

    function cancelImage() {
        imageData = null;
        imagePreview = null;
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    }

    // Handle emoji insertion maintaining cursor position
    function handleEmoji(emoji: string) {
        const cursorPos = inputElement?.selectionStart ?? inputValue.length;
        inputValue =
            inputValue.slice(0, cursorPos) +
            emoji +
            inputValue.slice(cursorPos);

        // Update cursor position after emoji insertion
        setTimeout(() => {
            if (inputElement) {
                const newPosition = cursorPos + emoji.length;
                inputElement.setSelectionRange(newPosition, newPosition);
                inputElement.focus();
            }
        }, 0);
    }

    let isDragging = $state(false);

    function handleDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        isDragging = true;
    }

    function handleDragLeave(event: DragEvent) {
        // Previeni che il leave si attivi quando si entra in elementi figli
        const rect = chatBox.getBoundingClientRect();
        const x = event.clientX;
        const y = event.clientY;
        
        if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
            isDragging = false;
        }
    }

    async function handleDrop(event: DragEvent) {
        event.preventDefault();
        isDragging = false;

        const file = event.dataTransfer?.files[0];
        if (file && isImageFile(file)) {
            try {
                imageData = await fileToBase64(file);
                imagePreview = imageData;
            } catch (error) {
                console.error('Error processing dropped image:', error);
                toastMessage = "Failed to process image. Please try again.";
                toastId++;
                showToast = true;
            }
        }
    }
</script>

<div class="w-full h-[450px] flex flex-col">
    <!-- Aggiungi intestazione -->
    <div class="p-4 border-b border-gray-100 dark:border-gray-700">
        <div class="flex items-center justify-between">
            <h3
                class="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2"
            >
                <CircleUserRound
                    class="size-5 text-gray-600 dark:text-gray-300"
                />
                {user.name}
            </h3>
            <span class="text-sm text-gray-500 dark:text-gray-400"
                >ID: {user.id}</span
            >
        </div>
    </div>

    <div 
        bind:this={chatBoxWrapper} 
        class="relative flex-1 overflow-hidden"
    >
        {#if isDragging}
            <div 
                class="absolute inset-5 backdrop-blur-sm bg-blue-100/70 dark:bg-blue-900/70 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10 pointer-events-none"
            >
                <p class="text-blue-600 dark:text-blue-400 font-medium">
                    Release here to attach image
                </p>
            </div>
        {/if}
        
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            bind:this={chatBox}
            onscroll={checkScroll}
            ondragover={handleDragOver}
            ondragleave={handleDragLeave}
            ondrop={handleDrop}
            class="chat-box absolute inset-0 overflow-y-auto space-y-4 p-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700"
        >
            {#each ($messages[serializeKey(clientId, destinationId)] || []) as msg}
                <Message 
                    message={msg} 
                    isReceived={msg.sender_id !== clientId}
                    onImageClick={onImageClick}
                    onImageLoad={handleImageLoad}
                />
            {/each}
        </div>
    </div>

    {#if imagePreview}
        <div
            class="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
        >
            <div class="relative inline-block">
                <img
                    src={imagePreview}
                    alt="Preview"
                    class="max-h-48 rounded-lg {isSendingImage ? 'opacity-50' : ''}"
                />
                {#if isSendingImage}
                    <div class="absolute inset-0 flex items-center justify-center">
                        <LoaderCircle class="size-8 text-blue-500 animate-spin" />
                    </div>
                {:else}
                    <button
                        onclick={cancelImage}
                        class="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                        <X class="size-4" />
                    </button>
                {/if}
            </div>
        </div>
    {/if}

    <div class="p-4 border-t border-gray-100 dark:border-gray-700">
        <div class="flex gap-2">
            <input
                type="file"
                accept="image/*"
                class="hidden"
                bind:this={fileInput}
                onchange={handleImageSelect}
            />
            <button
                onclick={() => fileInput.click()}
                class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Attach image"
            >
                <Paperclip class="size-5" />
            </button>
            <div class="relative flex-1">
                <input
                    type="text"
                    class="message-input w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                    placeholder="Write a message..."
                    bind:value={inputValue}
                    bind:this={inputElement}
                    onkeydown={handleKeydown}
                    onpaste={handlePaste}
                />
                <EmojiButton {inputElement} onEmojiSelect={handleEmoji} />
            </div>
            <button
                class="send-button p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center"
                onclick={handleSend}
            >
                <Send class="size-5" />
            </button>
        </div>
    </div>
</div>

{#if showToast}
    <Toast
        message={toastMessage}
        type="error"
        onClose={() => (showToast = false)}
        key={toastId}
    />
{/if}
