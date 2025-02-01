import { get } from 'svelte/store';
import { registrationStatus } from '../stores/store';

export async function requestRegisteredUsers(clientId: number) {
    try {
        const serverId = get(registrationStatus)[clientId];
        const response = await fetch(`/api/registered-users?client_id=${clientId}&server_id=${serverId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to request registered users');
        }
    } catch (error) {
        console.error('Error requesting registered users:', error);
    }
}
