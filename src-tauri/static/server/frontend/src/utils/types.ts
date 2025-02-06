
export type StatsType = {
    messagesSent: number;
    messagesReceived: number;

    messageFragmentsSent: number;
    messageFragmentsReceived: number;

    floodRequestsSent: number;
    floodRequestsReceived: number;

    floodResponsesSent: number;
    floodResponsesReceived: number;

    acksSent: number;
    acksReceived: number;

    nacksReceived: number;
};

export const defaultStats: StatsType = {
    messagesSent: 0,
    messagesReceived: 0,

    messageFragmentsSent: 0,
    messageFragmentsReceived: 0,

    floodRequestsSent: 0,
    floodRequestsReceived: 0,

    floodResponsesSent: 0,
    floodResponsesReceived: 0,

    acksSent: 0,
    acksReceived: 0,

    nacksReceived: 0,
};


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