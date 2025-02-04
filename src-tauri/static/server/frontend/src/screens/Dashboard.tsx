import React, { Fragment, useContext, useEffect, useState } from 'react';
import PieChart from "../components/PieChart"
import LineChart from "../components/LineChart"
import BarChart from "../components/BarChart"

import { GlobalStateContext } from '../GlobalState';
import { defaultStats, StatsType } from '../utils/types';
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
                fragmentsSent: acc.fragmentsSent + stats.fragmentsSent,
                messagesReceived: acc.messagesReceived + stats.messagesReceived,
                fragmentsReceived: acc.fragmentsReceived + stats.fragmentsReceived,
                acksSent: acc.acksSent + stats.acksSent,
                acksReceived: acc.acksReceived + stats.acksReceived,
                nacksReceived: acc.nacksReceived + stats.nacksReceived,
            }), defaultStats);
            setCombinedStats(combinedStats);
        }
    }, [totalStats]);

    return (
        <div className="p-8 flex flex-1 bg-gray-50">
            <div className="flex flex-col flex-1 overflow-y-scroll">
                <main>
                    <Title title="Dashboard" label="Here you can check the server's performance, messages/fragments sent/received." />

                    <div className="w-full h-4"></div>

                    <div className="py-6">
                        {combinedStats ? <div className="flex flex-col space-y-8">
                            <PieChart stats={combinedStats} />
                            <BarChart stats={combinedStats} />
                        </div> : <div className="w-full h-full text-slate-500">
                            No data to display</div>}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
