<script lang="ts">
    import {LoaderCircle} from "lucide-svelte";
    import {onMount} from "svelte";
    import {clientUsernames, pendingRegistrations} from "../stores/store";

    interface Props {
        clientId: number;
        showToast: (message: string, type: "error" | "success") => void;
    }

    let {clientId, showToast}: Props = $props();

    let availableServers: number[] = $state([]);
    let showModal = $state(false);
    let selectedServer = $state(-1);
    let username = $state("");
    let isRefreshing = $state(false);

    // svelte-ignore non_reactive_update
    let usernameInput: HTMLInputElement;

    // Fetch available servers from API
    async function fetchServers() {
        isRefreshing = true;
        try {
            let response = await fetch(`/api/servers?id=${clientId}`);
            availableServers = ((await response.json()) as number[]).sort((a, b) => a - b);
        } catch (e) {
            console.error(e);
            availableServers = [];
        } finally {
            // Ensure minimum animation duration
            setTimeout(() => {
                isRefreshing = false;
            }, 600); // Minimo tempo di animazione
        }
    }

    onMount(async () => {
        await fetchServers();
    });

    $effect(() => {
        if (showModal && usernameInput) {
            usernameInput.focus();
        }
    });

    // Handle server registration process
    async function handleRegistration() {
        try {
            pendingRegistrations.update((set) => {
                set.add(clientId);
                return set;
            });
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    client_id: clientId,
                    server_id: selectedServer,
                    username: username,
                }),
            });

            if (response.ok) {
                showModal = false;
                clientUsernames.update((usernames) => ({
                    ...usernames,
                    [clientId]: username,
                }));
                username = "";
            } else {
                // remove client from pending registrations
                pendingRegistrations.update((set) => {
                    set.delete(clientId);
                    return set;
                });
                showToast(
                    `Registration failed for Server ${selectedServer}. Please try again.`,
                    "error"
                );
            }
        } catch (error) {
            console.error(error);
            showToast(
                `Registration failed for Server ${selectedServer}. Please try again.`,
                "error"
            );
        }
    }

    async function cancelRegistration() {
        try {
            const response = await fetch("/api/unregister", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    client_id: clientId,
                    server_id: selectedServer,
                }),
            });

            if (response.ok) {
                pendingRegistrations.update((set) => {
                    set.delete(clientId);
                    return set;
                });
            } else {
                showToast(
                    `Failed to cancel registration. Please try again.`,
                    "error"
                );
            }
        } catch (error) {
            console.error(error);
            showToast(
                `Failed to cancel registration. Please try again.`,
                "error"
            );
        }
    }

    function closeModal() {
        showModal = false;
        username = "";
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" && username.trim()) {
            event.preventDefault();
            handleRegistration();
        } else if (event.key === "Escape") {
            event.preventDefault();
            closeModal();
        }
    }

    function selectRandomServer() {
        if (availableServers.length > 0) {
            const randomIndex = Math.floor(
                Math.random() * availableServers.length
            );
            selectedServer = availableServers[randomIndex];
            showModal = true;
        }
    }
</script>

<div class="flex w-full relative">
    {#if $pendingRegistrations.has(clientId)}
        <div class="flex items-center justify-center w-full h-[450px]">
            <div class="text-center">
                <LoaderCircle
                        class="size-8 animate-spin mx-auto mb-4 text-blue-500"
                />
                <p class="text-gray-600 dark:text-gray-300 mb-4">
                    Registering to server...
                </p>
                <button
                        class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        onclick={cancelRegistration}
                >
                    Cancel
                </button>
            </div>
        </div>
    {:else}
        <div
                class="flex items-center justify-center flex-col w-full h-[450px] p-6"
        >
            <div class="w-full max-w-md space-y-6">
                <!-- Header with refresh -->
                <div class="flex items-center justify-between">
                    <h2
                            class="text-xl font-semibold text-gray-700 dark:text-gray-300"
                    >
                        Available Servers
                    </h2>
                    <button
                            class="inline-flex items-center justify-center px-3 py-2 rounded-lg
                               bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600
                               transition-colors gap-2 text-gray-700 dark:text-gray-300"
                            onclick={fetchServers}
                            disabled={isRefreshing}
                    >
                        <span class="text-sm font-medium">Refresh</span>
                        <LoaderCircle
                                class="size-5 {isRefreshing
                                ? 'animate-spin'
                                : 'hidden'}"
                        />
                    </button>
                </div>

                <!-- Server list -->
                <div
                        class="grid gap-3 {availableServers.length === 1
                        ? ''
                        : 'sm:grid-cols-2'}"
                >
                    {#each availableServers as srv}
                        <button
                                class="flex items-center justify-center px-6 py-3
                                   bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                                   text-gray-800 dark:text-gray-200 rounded-lg transition-all
                                   hover:shadow-md border border-gray-300 dark:border-gray-600
                                   {availableServers.length === 1
                                ? 'text-lg'
                                : ''}"
                                onclick={() => {
                                selectedServer = srv;
                                showModal = true;
                            }}
                        >
                            Server {srv}
                        </button>
                    {/each}
                </div>

                <!-- Random server button -->
                {#if availableServers.length > 1}
                    <div class="flex justify-center pt-4">
                        <button
                                class="px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg
                                   transition-all hover:bg-blue-700 dark:hover:bg-blue-600
                                   hover:shadow-md w-full sm:w-auto"
                                onclick={selectRandomServer}
                        >
                            Connect to Random Server
                        </button>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Modal -->
        {#if showModal}
            <div
                    class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 p-4"
            >
                <div
                        class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full"
                >
                    <h2
                            class="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200"
                    >
                        Connect to Server {selectedServer}
                    </h2>
                    <input
                            type="text"
                            bind:value={username}
                            bind:this={usernameInput}
                            placeholder="Enter your username"
                            class="w-full p-3 mb-4 border rounded-lg dark:bg-gray-700 dark:text-gray-200
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onkeydown={handleKeydown}
                    />
                    <div class="flex justify-end gap-3">
                        <button
                                class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                onclick={closeModal}
                        >
                            Cancel
                        </button>
                        <button
                                class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                                onclick={handleRegistration}
                                disabled={!username}
                        >
                            Join Server
                        </button>
                    </div>
                </div>
            </div>
        {/if}
    {/if}
</div>
