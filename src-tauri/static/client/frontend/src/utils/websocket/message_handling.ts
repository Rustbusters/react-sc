import {get} from "svelte/store";
import {
    clientUsernames,
    currentChats,
    deserializeKey,
    incrementUnread,
    isDisconnecting,
    messages,
    pendingRegistrations,
    pendingUnregistrations,
    registrationStatus,
    serializeKey,
    unreadMessages,
} from "../../stores/store";
import {clientUsers, isUserPresent, setUsers} from "../../stores/users";
import {userEvents} from "../../stores/events";
import type {Message} from "../../types/message";
import type {MessageBody, ServerToClientMessage, User, WebSocketMessage,} from "../../types/websocket";

export async function handleMessage(wsMessage: WebSocketMessage) {
    const message = wsMessage.message as ServerToClientMessage;
    switch (message.response) {
        case "RegistrationSuccess":
            // Update registration status and clean up pending registration
            if (get(pendingRegistrations).has(wsMessage.client_id)) {
                registrationStatus.update((status) => ({
                    ...status,
                    [wsMessage.client_id]: wsMessage.server_id,
                }));
                pendingRegistrations.update((set) => {
                    set.delete(wsMessage.client_id);
                    return set;
                });
            }
            break;

        case "RegistrationFailure":
            pendingRegistrations.update((set) => {
                set.delete(wsMessage.client_id);
                return set;
            });
            clientUsernames.update((usernames) => {
                const {[wsMessage.client_id]: _, ...rest} = usernames;
                return rest;
            });

            // Add toast trigger for registration failure
            userEvents.update((events) => ({
                ...events,
                [wsMessage.client_id]: {
                    message: message.reason,
                    type: "error",
                },
            }));
            break;

        case "UnregisterSuccess":
            if (get(pendingUnregistrations).has(wsMessage.client_id)) {
                // Clear disconnection status
                isDisconnecting.update((state) => ({
                    ...state,
                    [wsMessage.client_id]: false,
                }));

                // Clear all data related to this client
                registrationStatus.update((status) => {
                    const {[wsMessage.client_id]: _, ...rest} = status;
                    return rest;
                });

                pendingUnregistrations.update((set) => {
                    set.delete(wsMessage.client_id);
                    return set;
                });

                clientUsernames.update((usernames) => {
                    const {[wsMessage.client_id]: _, ...rest} = usernames;
                    return rest;
                });

                // Clear messages
                messages.update((messages) => {
                    const newMessages: Record<string, Message[]> = {};
                    for (const key in messages) {
                        const {displayer} = deserializeKey(key);
                        if (displayer !== wsMessage.client_id) {
                            newMessages[key] = messages[key];
                        }
                    }
                    return newMessages;
                });

                // Clear unread messages
                unreadMessages.update((state) => {
                    const {[wsMessage.client_id]: _, ...rest} = state;
                    return rest;
                });

                // Clear current chat
                currentChats.update((state) => {
                    const {[wsMessage.client_id]: _, ...rest} = state;
                    return rest;
                });
            }
            break;

        case "UnregisterFailure":
            // Processiamo il fallimento solo se c'è una disconnessione pendente
            if (get(pendingUnregistrations).has(wsMessage.client_id)) {
                console.warn(
                    `Failed to unregister client ${wsMessage.client_id}`
                );
                isDisconnecting.update((state) => ({
                    ...state,
                    [wsMessage.client_id]: false,
                }));
                pendingUnregistrations.update((set) => {
                    set.delete(wsMessage.client_id);
                    return set;
                });
                
                // Emit event for unregister failure
                userEvents.update((events) => ({
                    ...events,
                    [wsMessage.client_id]: {
                        message: message.reason,
                        type: "error",
                    },
                }));
            }
            break;

        case "ActiveUsersList":
            // remove myself from the list of active users
            let users = message.users.filter(
                (user) => user.id !== wsMessage.client_id
            );

            // Update the list of active users
            setUsers(wsMessage.client_id, users);
            break;

        case "NewUserRegistered":
            // Create user object from id and name fields
            const newUser: User = {
                id: message.id,
                name: message.name
            };

            // Update the list of active users
            clientUsers.update((users) => {
                const newUsers = users[wsMessage.client_id]?.users ?? [];
                return {
                    ...users,
                    [wsMessage.client_id]: {
                        ...users[wsMessage.client_id],
                        users: [...newUsers, newUser],
                    },
                };
            });

            // Emit user joined event
            userEvents.update((events) => ({
                ...events,
                [wsMessage.client_id]: {
                    message: `${message.name} joined the server`,
                    type: "success",
                },
            }));
            break;

        case "UserUnregistered":
            // Update the list of active users
            clientUsers.update((users) => {
                const unregisteringUser = users[wsMessage.client_id].users.find(
                    (u) => u.id === message.id
                );
                const newUsers = users[wsMessage.client_id].users.filter(
                    (user) => user.id !== message.id
                );

                // Emit user left event if we found the user
                if (unregisteringUser) {
                    userEvents.update((events) => ({
                        ...events,
                        [wsMessage.client_id]: {
                            message: `${unregisteringUser.name} left the server`,
                            type: "error",
                        },
                    }));
                }

                return {
                    ...users,
                    [wsMessage.client_id]: {
                        ...users[wsMessage.client_id],
                        users: newUsers,
                    },
                };
            });

            // Clear current chat if the unregistered user is the current chat
            currentChats.update((state) => {
                if (state[wsMessage.client_id] === message.id) {
                    const {[wsMessage.client_id]: _, ...rest} = state;
                    return rest;
                }
                return state;
            });
            break;

        case "PrivateMessage":
            // Only process messages if the sender is in active users
            // Add message to the conversation history using a serialized key
            if (isUserPresent(wsMessage.client_id, message.sender_id)) {
                const key = serializeKey(
                    wsMessage.client_id,
                    message.sender_id
                );
                messages.update((messages) => {
                    const newMessages = messages[key] || [];
                    return {
                        ...messages,
                        [key]: [
                            ...newMessages,
                            {
                                content: message.message.content,
                                timestamp: message.message.timestamp,
                                sender_id: message.sender_id,
                                receiver_id: wsMessage.client_id,
                                server_id: wsMessage.server_id,
                            },
                        ],
                    };
                });

                // Increment unread messages counter if not currently viewing this chat
                const currentChat = get(currentChats)[wsMessage.client_id];
                if (currentChat !== message.sender_id) {
                    incrementUnread(wsMessage.client_id, message.sender_id);
                }
            }
            break;

        case "UserNotFound":
            console.warn(`User ${message.user_id} not found`);
            break;

        case "SendingError":
            if (message.message.request === "SendPrivateMessage") {
                const sendingError = message.message as {
                    request: "SendPrivateMessage";
                    recipient_id: number;
                    message: MessageBody;
                };

                const key = serializeKey(
                    sendingError.message.sender_id,
                    sendingError.recipient_id
                );

                // Cerchiamo il messaggio confrontando più proprietà
                messages.update((messages) => {
                    const chatMessages = messages[key];
                    if (chatMessages) {
                        // Cerchiamo dall'ultimo messaggio
                        for (let i = chatMessages.length - 1; i >= 0; i--) {
                            const msg = chatMessages[i];

                            // Confrontiamo contenuto e timestamp
                            if (
                                msg.content.type ===
                                sendingError.message.content.type &&
                                msg.content.data ===
                                sendingError.message.content.data &&
                                msg.timestamp ===
                                sendingError.message.timestamp &&
                                msg.sender_id === sendingError.message.sender_id
                            ) {
                                msg.status = "failed";
                                break;
                            }
                        }
                    }
                    return messages;
                });
            }

            // Show error toast
            userEvents.update((events) => ({
                ...events,
                [wsMessage.client_id]: {
                    message: message.error,
                    type: "error",
                },
            }));
            break;
    }
}
