import {writable} from "svelte/store";
import type {WebSocketMessage,} from "../../types/websocket";
import {handleMessage} from "./message_handling";

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export const connectionStatus = writable(false);

// Gestione WebSocket
export function initializeWebSocket() {
    if (ws) {
        ws.close();
    }

    ws = new WebSocket("ws://localhost:7374");

    ws.onopen = function () {
        console.log("WebSocket connection opened");
        updateConnectionStatus(true);
    };

    ws.onclose = function () {
        console.log("WebSocket connection closed");
        updateConnectionStatus(false);
    };

    ws.onerror = function (error) {
        console.error("WebSocket error:", error);
        updateConnectionStatus(false);
    };

    ws.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data.toString()) as WebSocketMessage;
            console.info(`[WS] ${data.message.response}`, data);

            handleMessage(data);
        } catch (e) {
            console.warn("Error parsing WebSocket message:", e);
        }
    };

    return ws;
}

export function attemptReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log("Max reconnect attempts reached");
        return;
    }

    reconnectAttempts++;
    initializeWebSocket();
}

function updateConnectionStatus(status: boolean) {
    connectionStatus.set(status);
    reconnectAttempts = status ? 0 : reconnectAttempts;
}
