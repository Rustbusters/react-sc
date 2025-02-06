import React, { Fragment, useContext, useEffect, useState } from 'react';
import Chart from "../components/Chart"

import { GlobalStateContext } from '../GlobalState';
import { ChartType, defaultStats, StatsType } from '../utils/types';
import Title from '../components/common/Title';


interface DashboardProps { };

const Dashboard: React.FC<DashboardProps> = () => {

    const { totalStats } = useContext(GlobalStateContext);

    // Local state
    const [combinedStats, setCombinedStats] = useState<StatsType>(defaultStats);

    useEffect(() => {
        if (totalStats) {
            // Initialize the combinedStats by reducing totalStats
            const combinedStats = Array.from(totalStats.values()).reduce((acc, stats) => ({
                messagesSent: acc.messagesSent + stats.messagesSent,
                messagesReceived: acc.messagesReceived + stats.messagesReceived,

                messageFragmentsSent: acc.messageFragmentsSent + stats.messageFragmentsSent,
                messageFragmentsReceived: acc.messageFragmentsReceived + stats.messageFragmentsReceived,

                floodRequestsSent: acc.floodRequestsSent + stats.floodRequestsSent,
                floodRequestsReceived: acc.floodRequestsReceived + stats.floodRequestsReceived,

                floodResponsesSent: acc.floodResponsesSent + stats.floodResponsesSent,
                floodResponsesReceived: acc.floodResponsesReceived + stats.floodResponsesReceived,

                acksSent: acc.acksSent + stats.acksSent,
                acksReceived: acc.acksReceived + stats.acksReceived,

                nacksReceived: acc.nacksReceived + stats.nacksReceived,
            }), defaultStats);
            setCombinedStats(combinedStats);
        }
    }, [totalStats]);

    return (
        <div className="p-8 flex flex-1 bg-gray-50 dark:bg-black">
            <div className="flex flex-col flex-1 overflow-y-scroll">
                <main>
                    <Title title="Dashboard" label="Here you can check the server's performance, messages/fragments sent/received." />

                    <div className="w-full h-4"></div>

                    <div className="py-6">
                        {combinedStats ? <div className="flex flex-col space-y-8">
                            <Chart stats={combinedStats} type={ChartType.Pie} />
                            <Chart stats={combinedStats} type={ChartType.Bar} />
                        </div> : <div className="w-full h-full text-slate-500">
                            No data to display</div>}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
