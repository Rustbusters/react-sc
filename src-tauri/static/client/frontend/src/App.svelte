<script lang="ts">
    import { LoaderCircle, MessageSquare, Moon, Sun } from "lucide-svelte";
    import { onDestroy, onMount } from "svelte";
    import Chat from "./lib/Chat.svelte";
    import { displayedChats, registrationStatus } from "./stores/store";
    import { initialize } from "./utils/init";
    import { attemptReconnect, connectionStatus } from "./utils/websocket/main";

    let loading = $state(true);

    onMount(async () => {
        await initialize();
        setTimeout(() => {
            loading = false;
        }, 800);

        // Add event listener for page unload
        window.addEventListener("beforeunload", handleUnload);
    });

    onDestroy(() => {
        // Remove event listener for page unload
        window.removeEventListener("beforeunload", handleUnload);

        // Unregister clients on component destroy
        unregisterClients();
    });

    function handleUnload(event: Event) {
        unregisterClients();
    }

    function unregisterClients() {
        console.error("Unregistering clients...");
        $displayedChats.forEach((clientId) => {
            // Verifichiamo che il client sia registrato (serverId != undefined e >= 0)
            const serverId = $registrationStatus[clientId];
            if (serverId !== undefined && serverId >= 0) {
                fetch("/api/unregister", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        client_id: clientId,
                        server_id: serverId,
                    }),
                });
            }
        });
        console.warn("Clients unregistered.");
    }
</script>

<div class="container mx-auto p-4 lg:p-6">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div
            class="flex flex-col sm:flex-row justify-between items-center gap-4"
        >
            <div class="flex items-center gap-3">
                <div class="bg-blue-500 p-2 rounded-lg">
                    <MessageSquare class="size-5 text-white" />
                </div>
                <div>
                    <h1
                        class="text-2xl font-bold text-gray-800 dark:text-gray-100"
                    >
                        Clients - AP 24/25
                    </h1>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        Clients UI for Advanced Programming Project
                    </p>
                </div>
            </div>

            <!-- Controls and status -->
            <div class="flex items-center gap-6">
                <!-- Connection status indicator -->
                <div class="flex items-center gap-2">
                    <div class="relative">
                        <div
                            class="w-3 h-3 rounded-full transition-colors duration-200 {$connectionStatus
                                ? 'bg-green-500'
                                : 'bg-red-500'}"
                        ></div>
                        <div
                            class="w-3 h-3 absolute inset-0 rounded-full transition-colors duration-200 {$connectionStatus
                                ? 'bg-green-500 animate-ping'
                                : 'bg-red-500'}"
                        ></div>
                    </div>
                    <span class="text-sm text-gray-600 dark:text-gray-300"
                        >{$connectionStatus ? "Online" : "Offline"}</span
                    >
                    {#if !$connectionStatus}
                        <button
                            onclick={attemptReconnect}
                            class="ml-2 px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors duration-200"
                        >
                            Reconnect
                        </button>
                    {/if}
                </div>

                <!-- Divider -->
                <div class="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>

                <!-- Theme Toggle -->
                <div class="flex items-center gap-3">
                    <Sun class="size-5 dark:text-gray-200" />
                    <button
                        onclick={() => {
                            const isDark =
                                document.documentElement.classList.toggle(
                                    "dark"
                                );
                            localStorage.setItem(
                                "theme",
                                isDark ? "dark" : "light"
                            );
                        }}
                        id="theme-toggle"
                        aria-label="Change theme"
                        class="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                    >
                        <span
                            class="inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 translate-x-[2px] dark:translate-x-5"
                        ></span>
                    </button>
                    <Moon class="size-5 dark:text-gray-200" />
                </div>
            </div>
        </div>
    </div>

    <!-- Chat grid container (populated dynamically) -->
    <div id="chat-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {#each $displayedChats as chatId}
            <Chat clientId={chatId} />
        {/each}
    </div>
</div>

<!-- Loading overlay -->
{#if loading}
    <div
        class="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50 transition-opacity duration-500"
    >
        <div
            class="text-center flex flex-col gap-4 items-center justify-center"
        >
            <LoaderCircle class="w-16 h-16 text-blue-500 animate-spin mb-4" />
            <p class="text-gray-600 dark:text-gray-300">Loading chats...</p>
        </div>
    </div>
{/if}
