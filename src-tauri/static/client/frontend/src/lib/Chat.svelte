<script lang="ts">
    import {LoaderCircle} from "lucide-svelte";
    import {
        clientUsernames,
        currentChats,
        isDisconnecting,
        pendingUnregistrations,
        registrationStatus,
    } from "../stores/store";
    import {connectionStatus} from "../utils/websocket/main";
    import ChatContainer from "./ChatContainer.svelte";
    import ServerSelector from "./ServerSelector.svelte";
    import Toast from "./Toast.svelte";
    import {clearUserEvent, userEvents} from "../stores/events";

    interface Props {
        clientId: number;
    }

    let {clientId}: Props = $props();

    let destinationId = $derived($currentChats[clientId] ?? -1);
    let toastData = $state<{ message: string; type: 'error' | 'success'; key: number } | null>(null);

    // Subscribe to user events
    $effect(() => {
        const event = $userEvents[clientId];
        if (event) {
            toastData = {
                message: event.message,
                type: event.type,
                key: Date.now()
            };
            clearUserEvent(clientId);
        }
    });

    // Function to show toast from child components
    function showToast(message: string, type: 'error' | 'success') {
        toastData = {
            message,
            type,
            key: Date.now()
        };
    }

    async function handleUnregister() {
        if ($isDisconnecting[clientId]) return;

        // Prima settiamo isDisconnecting
        isDisconnecting.update((state) => ({
            ...state,
            [clientId]: true,
        }));

        try {
            // Qui dovremmo settare pendingUnregistrations PRIMA della chiamata API
            pendingUnregistrations.update((set) => {
                set.add(clientId);
                return set;
            });

            const response = await fetch("/api/unregister", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    client_id: clientId,
                    server_id: $registrationStatus[clientId],
                }),
            });

            if (!response.ok) {
                // Cleanup in caso di errore
                isDisconnecting.update((state) => ({
                    ...state,
                    [clientId]: false,
                }));
                pendingUnregistrations.update((set) => {
                    set.delete(clientId);
                    return set;
                });
                return;
            }
        } catch (error) {
            console.error("Error unregistering:", error);
            isDisconnecting.update((state) => ({
                ...state,
                [clientId]: false,
            }));
        }
    }
</script>

<div
        class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-transform duration-200 relative"
>
    <div class="p-4 border-b border-gray-300 dark:border-gray-700">
        <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
                <div class="relative">
                    <div
                            class="status-indicator w-3 h-3 {$connectionStatus
                            ? 'bg-green-500'
                            : 'bg-red-500'} rounded-full"
                    ></div>
                    <div
                            class="status-ping w-3 h-3 {$connectionStatus
                            ? 'bg-green-500 animate-ping'
                            : 'bg-red-500'} rounded-full absolute inset-0"
                    ></div>
                </div>
                <h2
                        class="text-lg font-semibold text-gray-800 dark:text-gray-100"
                >
                    {$clientUsernames[clientId] || `Chat ${clientId}`}
                </h2>
            </div>
            <div class="flex items-center gap-2">
                {#if $registrationStatus[clientId]}
                    <button
                            class="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors duration-200 flex items-center gap-1 disabled:opacity-75"
                            onclick={handleUnregister}
                            disabled={$isDisconnecting[clientId]}
                    >
                        {#if $isDisconnecting[clientId]}
                            <LoaderCircle class="size-3 animate-spin"/>
                        {/if}
                        Disconnect
                    </button>
                    <span
                            class="text-xs text-gray-500 dark:text-gray-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full"
                    >
                        Server {$registrationStatus[clientId]}
                    </span>
                {/if}
                <span
                        class="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full"
                >
                    ID: {clientId}
                </span>
            </div>
        </div>
    </div>
    {#if $registrationStatus[clientId]}
        <ChatContainer {clientId} {destinationId}/>
    {:else}
        <ServerSelector {clientId} {showToast}/>
    {/if}

    {#if toastData}
        <Toast
                message={toastData.message}
                type={toastData.type}
                onClose={() => toastData = null}
                key={toastData.key}
        />
    {/if}
</div>
