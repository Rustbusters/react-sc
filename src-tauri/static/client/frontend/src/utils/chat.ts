import { messages, serializeKey, registrationStatus } from "../stores/store";
import { get } from "svelte/store";
import type { Message } from "../types/message";

export async function sendMessage(
    senderId: number,
    receiverId: number,
    content: string,
    messageType: 'Text' | 'Image'
) {
    if (!content) return;

    const serverId = get(registrationStatus)[senderId];
    const timestamp = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    
    const messageContent = {
        type: messageType,
        data: content
    };

    const message: Message = {
        content: messageContent,
        timestamp,
        sender_id: senderId,
        receiver_id: receiverId,
        server_id: serverId,
        status: 'sent'
    };

    try {
        const response = await fetch("/api/send-to", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        let key: string = serializeKey(senderId, receiverId);
        messages.update((messages) => {
            const newMessages = messages[key] || [];
            return {
                ...messages,
                [key]: [...newMessages, message],
            };
        });

        return true;
    } catch (error) {
        console.error("Error sending message:", error);

        return false;
    }
}
