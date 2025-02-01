import {writable} from 'svelte/store';

interface UserEvent {
    message: string;
    type: 'error' | 'success';
}

export const userEvents = writable<Record<number, UserEvent>>({});

export function clearUserEvent(clientId: number) {
    userEvents.update(events => {
        const {[clientId]: _, ...rest} = events;
        return rest;
    });
}
