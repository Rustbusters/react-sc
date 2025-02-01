export type UserId = number;

export interface User {
    id: number;
    name: string;
}

export type MessageContent =
    | { type: "Text"; data: string }
    | { type: "Image"; data: string };

export interface MessageBody {
    sender_id: UserId;
    content: MessageContent;
    timestamp: string;
}

export type ServerToClientMessage =
    | { response: "RegistrationSuccess" }
    | { response: "RegistrationFailure"; reason: string }
    | { response: "UnregisterSuccess" }
    | { response: "UnregisterFailure"; reason: string }
    | { response: "ActiveUsersList"; users: User[] }
    | { response: "NewUserRegistered"; id: UserId; name: string; }
    | { response: "UserUnregistered"; id: UserId }
    | { response: "PrivateMessage"; sender_id: UserId; message: MessageBody; }
    | { response: "UserNotFound"; user_id: UserId }
    | { response: "SendingError"; error: string; message: any };

export interface WebSocketMessage {
    client_id: number;
    server_id: number;
    message: ServerToClientMessage;
}
