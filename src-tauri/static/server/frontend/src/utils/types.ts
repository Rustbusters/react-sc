
export type StatsType = {
    messagesSent: number,
    fragmentsSent: number,

    messagesReceived: number,
    fragmentsReceived: number,

    acksSent: number,
    acksReceived: number,

    nacksReceived: number,
}

export const defaultStats = {
    messagesSent: 0,
    fragmentsSent: 0,

    messagesReceived: 0,
    fragmentsReceived: 0,

    acksSent: 0,
    acksReceived: 0,

    nacksReceived: 0,
}

export type ServerStats = Map<number, StatsType>;

// Charts
export type ChartDataType = {
    labels: string[],
    datasets: { label: string, data: number[], backgroundColor: string[], hoverBackgroundColor: string[], }[];
}

export type ChartProps = {
    stats: StatsType
}

// Server messages
export type MessageType = {
    id: string;
    srcId: string;
    destId: string;
    message: string;
};

export type ServerMessages = Map<number, MessageType[]>;

// Active users
export type UserType = {
    id: string,
    name: string
};

export type ServerActiveUsers = Map<number, UserType[]>;