import { get } from "svelte/store";
import { displayedChats } from "../stores/store";
import { initializeWebSocket } from "./websocket/main";

// Inizializzazione tema
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

// Funzione di inizializzazione principale
export async function initialize() {
    initializeTheme();

    try {
        const response = await fetch('/api/clients');
        const active_clients = await response.json();
        active_clients.sort();

        active_clients.forEach((clientId: number) => {
			displayedChats.set(new Set([...get(displayedChats), clientId]));
        });
    } catch (error) {
        console.error('Error loading active_clients:', error);
    }

    // Inizializza WebSocket
    initializeWebSocket();
}
