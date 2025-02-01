<script lang="ts">
    import { clientUsers, initializeClientUsers, setRefreshing } from "../stores/users";
    import ChatBox from "./ChatBox.svelte";
    import { CircleUserRound, LoaderCircle } from "lucide-svelte";
    import { onMount } from "svelte";
    import { requestRegisteredUsers } from "../utils/users";
    import ImageViewer from "./ImageViewer.svelte";
    import { unreadMessages, clearUnread, currentChats } from "../stores/store";

    interface Props {
        clientId: number;
        destinationId: number;
    }

    let { clientId, destinationId = $bindable(-1) }: Props = $props();

    // Initialize users list and request registered users on component mount
    onMount(() => {
        initializeClientUsers(clientId);
        requestRegisteredUsers(clientId);
    });

    // Refresh users list from server
    async function refreshUsers() {
        setRefreshing(clientId, true);
        await requestRegisteredUsers(clientId);
    }

    let activeImage = $state<string | null>(null);

    $effect(() => {
        // Update current chat when destination changes
        currentChats.update(chats => ({
            ...chats,
            [clientId]: destinationId
        }));

        // Clear unread messages when switching to a chat
        if (destinationId !== -1) {
            clearUnread(clientId, destinationId);
        }

        // Reset active image when changing chat
        activeImage = null;
    });

    function handleUserSelect(userId: number) {
        destinationId = userId;
    }
</script>

<div class="flex w-full">
    <div class="w-52 bg-white dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700 overflow-hidden">
        <div class="p-2 border-b border-gray-300 dark:border-gray-700">
            <button
                class="w-full px-3 py-2 flex items-center justify-center gap-2 text-sm
                       bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500
                       rounded-lg transition-colors text-gray-800 dark:text-white"
                onclick={refreshUsers}
            >
                <span>Refresh Users</span>
                {#if $clientUsers[clientId]?.isRefreshing}
                    <LoaderCircle class="size-4 animate-spin"/>
                {/if}
            </button>
        </div>
        <div class="px-3 py-2">
            {#if $clientUsers[clientId]?.isLoading}
                <div class="flex justify-center py-4">
                    <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            {:else}
                <div class="space-y-2">
                    {#each $clientUsers[clientId]?.users || [] as user}
                        <button
                            class="w-full p-2 rounded cursor-pointer transition-colors flex items-center gap-2 relative
                                   {destinationId === user.id 
                                       ? 'bg-blue-100 dark:bg-blue-900' 
                                       : 'hover:bg-gray-100 dark:hover:bg-gray-700'}"
                            onclick={() => handleUserSelect(user.id)}
                        >
                            <CircleUserRound class="size-5 {destinationId === user.id 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-gray-600 dark:text-gray-300'}"/>
                            <span class="{destinationId === user.id 
                                ? 'text-blue-600 dark:text-blue-400 font-medium' 
                                : 'text-gray-800 dark:text-gray-100'}">
                                {user.name}
                            </span>
                            
                            {#if ($unreadMessages[clientId]?.[user.id] ?? 0) > 0}
                                <span class="absolute right-2 top-1/2 -translate-y-1/2 min-w-[20px] h-5 flex items-center justify-center bg-blue-500 text-white text-xs rounded-full px-1.5">
                                    {$unreadMessages[clientId][user.id]}
                                </span>
                            {/if}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>

    {#if destinationId !== -1}
        <div class="relative flex-1">
            <ChatBox 
                {clientId} 
                {destinationId} 
                onImageClick={(src) => activeImage = src}
            />
            
            {#if activeImage}
                <ImageViewer 
                    src={activeImage} 
                    onClose={() => activeImage = null}
                />
            {/if}
        </div>
    {:else}
        <div class="flex items-center justify-center w-full h-[450px]">
            <p class="text-gray-500 dark:text-gray-400">
                Select a user to start chatting
            </p>
        </div>
    {/if}
</div>
