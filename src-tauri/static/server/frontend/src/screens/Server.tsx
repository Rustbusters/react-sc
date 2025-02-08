import React, { useRef, useEffect, useState } from 'react';
import Chart from "../components/Chart"
import Title from '../components/common/Title';

import axios from 'axios';
import { HTTP_URL } from '../utils/constants';
import { ChartType, MessageType, StatsType, UserType } from '../utils/types';
import ExpandableSection from '../components/ExpandableSection';
import Table from '../components/Table';

type ServerProps = {
    id: number,
    stats: StatsType,
    messages: MessageType[],
    activeUsers: UserType[]
};

const Server: React.FC<ServerProps> = ({ id, stats, messages, activeUsers }) => {

    // Open state
    const [isChartOpen, setIsChartOpen] = useState(true);
    const [isMessagesOpen, setIsMessagesOpen] = useState(messages.length > 0);
    const [isActiveUsersOpen, setIsActiveUsersOpen] = useState(activeUsers.length > 0);

    const getMessages = () => {
        axios.get(`${HTTP_URL}/api/servers/messages/${id}`)
            .catch(err => {
                console.error("Error: ", err.message);
            });
    }

    const getStats = () => {
        axios.get(`${HTTP_URL}/api/servers/stats/${id}`)
            .catch(err => {
                console.error("Error: ", err.message);
            });
    }

    const getActiveUsers = () => {
        axios.get(`${HTTP_URL}/api/servers/users/${id}`)
            .catch(err => {
                console.error("Error: ", err.message);
            });
    }

    useEffect(() => {
        getMessages();
        getStats();
        getActiveUsers();
    }, [window.location.pathname]);

    return (
        <div className="p-8 flex flex-1 bg-gray-50 dark:bg-black overflow-y-scroll max-h-screen">
            <div className="flex flex-col flex-1">
                <main>
                    <Title title={`Server ${id}`} label={`This screen displays the server's ${id} statistics on messages/fragments sent/received and the exchanged messages on the network.`} />

                    <div className="w-full h-4"></div>
                    <div className="w-full flex flex-col space-y-4 pb-16">
                        <ExpandableSection title="Statistics" isOpen={isChartOpen} setIsOpen={setIsChartOpen}>
                            {stats ? <div className="flex flex-col space-y-8">
                                <Chart stats={stats} type={ChartType.Pie} />
                                <Chart stats={stats} type={ChartType.Bar} />
                            </div> : <div className="w-full h-full text-slate-500">
                                No data to display</div>}
                        </ExpandableSection>
                        <ExpandableSection title="Messages" isOpen={isMessagesOpen} setIsOpen={setIsMessagesOpen}>
                            <Table data={messages} columns={[
                                { key: "id", label: "ID" },
                                { key: "srcId", label: "Source ID", render: (value) => <span className="px-3 py-2 rounded-xl bg-indigo-500 text-white">{value}</span> },
                                { key: "destId", label: "Destination ID", render: (value) => <span className="px-3 py-2 rounded-xl bg-blue-500 text-white">{value}</span> },
                                { key: "message", label: "Message", render: (value) => <div>{value.startsWith("data:image") ? <img width="200px" src={value} /> : <span>{value}</span>}</div> },
                                { key: "timestamp", label: "Timestamp", render: (value: number) => <span className="px-3 py-2 rounded-lg bg-slate-500 dark:bg-slate-700 text-white">{(new Date(value * 1000)).toUTCString()}</span> },
                            ]} />
                        </ExpandableSection>
                        <ExpandableSection title="Active Users" isOpen={isActiveUsersOpen} setIsOpen={setIsActiveUsersOpen}>
                            <Table data={activeUsers} columns={[
                                { key: "id", label: "ID" },
                                { key: "name", label: "Name", render: (value) => <span className="px-3 py-2 rounded-xl bg-indigo-500 text-white">{value}</span> },
                            ]} rowsPerPage={3} />
                        </ExpandableSection>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Server;
