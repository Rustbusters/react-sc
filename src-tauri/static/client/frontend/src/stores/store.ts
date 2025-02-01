import { writable } from 'svelte/store';
import type { Message } from '../types/message';

// Variable to store the pair (user that is displaying the chat, the user that is being displayed)
// key: viewer_id|other_client_id (other_client_id is the user that the current client is chatting with)
export const messages = writable<Record<string, Message[]>>({});

export function serializeKey(displayer: number, other: number) {
	return `${displayer}|${other}`;
}

export function deserializeKey(key: string) {
	const [displayer, other] = key.split('|').map(Number);
	return { displayer, other };
}

// Variable to store all the client nodes that are active (active intended as running in the simulation)
export const displayedChats = writable<Set<number>>(new Set());

// Variable to store the registration status of the user
// key: user_id, value: server_id (-1 if not registered)
export const registrationStatus = writable<Record<number, number>>({});

// Variable to store pending registrations
export const pendingRegistrations = writable<Set<number>>(new Set());

// Variable to store the disconnection status
export const isDisconnecting = writable<Record<number, boolean>>({});

// Variable to store pending unregistrations
export const pendingUnregistrations = writable<Set<number>>(new Set());

// Variable to store client usernames (each client when registering will send a username)
export const clientUsernames = writable<Record<number, string>>({});

// Variable to store unread messages count per chat
// First key: viewer_id, Second key: sender_id, Value: count
export const unreadMessages = writable<Record<number, Record<number, number>>>({});

// Variable to store which chat each client is currently viewing in his window
// key: viewer_id, value: destination_id
export const currentChats = writable<Record<number, number>>({});

// Function to increment unread messages
export function incrementUnread(viewerId: number, senderId: number) {
    unreadMessages.update(state => {
        const userUnread = state[viewerId] || {};
        return {
            ...state,
            [viewerId]: {
                ...userUnread,
                [senderId]: (userUnread[senderId] || 0) + 1
            }
        };
    });
}

// Function to clear unread messages
export function clearUnread(viewerId: number, senderId: number) {
    unreadMessages.update(state => {
        const userUnread = state[viewerId] || {};
        const { [senderId]: _, ...rest } = userUnread;
        return {
            ...state,
            [viewerId]: rest
        };
    });
}