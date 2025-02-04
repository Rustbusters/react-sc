
import React, { createContext, useState, ReactNode } from 'react';
import { ServerStats, ServerMessages, MessageType, StatsType, UserType, ServerActiveUsers } from './utils/types';

type GlobalStateType = {
    totalStats: ServerStats,
    setTotalStats: React.Dispatch<React.SetStateAction<ServerStats>>,
    selectedServer: number,
    setSelectedServer: React.Dispatch<React.SetStateAction<number>>,
    availableServers: number[],
    setAvailableServers: React.Dispatch<React.SetStateAction<number[]>>,
    serversMessages: ServerMessages,
    setServersMessages: React.Dispatch<React.SetStateAction<ServerMessages>>,
    serverActiveUsers: ServerActiveUsers,
    setActiveUsers: React.Dispatch<React.SetStateAction<ServerActiveUsers>>,
};

// Create the context with a default value
export const GlobalStateContext = createContext<GlobalStateType>({
    totalStats: new Map<number, StatsType>(),
    setTotalStats: () => { },
    selectedServer: 0,
    setSelectedServer: () => { },
    availableServers: [0],
    setAvailableServers: () => { },
    serversMessages: new Map<number, MessageType[]>(),
    setServersMessages: () => { },
    serverActiveUsers: new Map<number, UserType[]>(),
    setActiveUsers: () => { }
});