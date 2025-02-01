import type { MessageContent } from "./websocket";

export interface Message {
    sender_id: number;
    receiver_id: number;
    server_id: number;
    content: MessageContent;
    timestamp: string;
    status?: 'sent' | 'failed';
}