import { get, writable } from 'svelte/store';
import type { User } from '../types/websocket';

interface UserListState {
    users: User[];
    isLoading: boolean;
    isRefreshing: boolean;
}

// Variable to store the list of users seen by each client
// (each client will see all the users that are registered except himself)
const clientUsers = writable<Record<number, UserListState>>({});

export function initializeClientUsers(clientId: number) {
    clientUsers.update(state => ({
        ...state,
        [clientId]: { users: [], isLoading: true, isRefreshing: false }
    }));
}

export function setUsers(clientId: number, users: User[]) {
    clientUsers.update(state => ({
        ...state,
        [clientId]: { ...state[clientId], users, isLoading: false, isRefreshing: false }
    }));
}

export function setRefreshing(clientId: number, isRefreshing: boolean) {
    clientUsers.update(state => ({
        ...state,
        [clientId]: { ...state[clientId], isRefreshing }
    }));
}

export function addUser(clientId: number, user: User) {
    clientUsers.update(state => {
        const users = state[clientId].users;
        return {
            ...state,
            [clientId]: { ...state[clientId], users: [...users, user] }
        };
    });
}

export function removeUser(clientId: number, userId: number) {
    clientUsers.update(state => {
        const users = state[clientId].users.filter(user => user.id !== userId);
        return {
            ...state,
            [clientId]: { ...state[clientId], users }
        };
    });
}

export function isUserPresent(clientId: number, userId: number) {
    const users = get(clientUsers)[clientId].users;
    return users.some(user => user.id === userId);
}

export { clientUsers };
