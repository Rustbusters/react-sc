import React, { useEffect, useState } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
} from 'chart.js';

import { ChartProps, ChartType } from "../utils/types"

const Chart: React.FC<ChartProps> = ({ stats, type }) => {
    let icon = <React.Fragment></React.Fragment>;
    switch (type) {
        case ChartType.Pie:
            ChartJS.register(ArcElement, Tooltip, Legend);
            icon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
            </svg>;
            break;
        case ChartType.Bar:
            ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
            icon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>;
            break;
        default:
            break;
    }

    let messagesData = {
        labels: ['Messages Sent', 'Messages Received'],
        datasets: [
            {
                label: 'Messages',
                data: [stats.messagesSent, stats.messagesReceived],
                backgroundColor: ['#474E93', '#7E5CAD'],
                hoverBackgroundColor: ['#6f79d5', '#a077d8'],
            },
        ],
    };

    let packetData = {
        labels: ['Msg Fragments Sent', 'Msg Fragments Received', 'Acks Sent', 'Acks Received', 'Nacks Received'],
        datasets: [
            {
                label: 'Packets',
                data: [stats.messageFragmentsSent, stats.messageFragmentsReceived, stats.acksSent, stats.acksReceived, stats.nacksReceived],
                backgroundColor: ['#72BAA9', '#D5E7B5', '#526cff', '#7BC9FF', '#D20062'],
                hoverBackgroundColor: ['#3fb598', '#b7d186', '#3950c2', '#4fa5de', '#ab1f62'],
                // hoverBackgroundColor: ['#89dfca', '#b5d57b', '#c06232'],
            },
        ],
    };

    let floodData = {
        labels: ['Flood Requests Sent', 'Flood Requests Received', 'Flood Responses Sent', 'Flood Responses Received'],
        datasets: [
            {
                label: 'Flood',
                data: [stats.floodRequestsSent, stats.floodRequestsReceived, stats.floodResponsesSent, stats.floodResponsesReceived],
                backgroundColor: ['#820263', '#d90368', '#ddfff7', '#93e1d8'],
                hoverBackgroundColor: ['#ab1187', '#bd1a97', '#a8d9cd', '#71d4c8'],
            },
        ],
    };

    type ChartViewType = {
        label: string,
        icon: React.ReactNode,
        data: any,
    };
    let [charts, setCharts] = useState<ChartViewType[]>([]);

    useEffect(() => {
        const messagesStats = [stats.messagesSent, stats.messagesReceived];
        const packetsStats = [stats.messageFragmentsSent, stats.messageFragmentsReceived, stats.acksSent, stats.acksReceived, stats.nacksReceived];
        const floodStats = [stats.floodRequestsSent, stats.floodRequestsReceived, stats.floodResponsesSent, stats.floodResponsesReceived];

        messagesData.datasets[0].data = messagesStats;
        packetData.datasets[0].data = packetsStats;
        floodData.datasets[0].data = floodStats;

        charts = [];
        charts.push({ label: `Messages Chart: ${messagesStats.reduce((acc, cur) => { return (acc + cur); }, 0)}`, icon, data: messagesData });
        charts.push({ label: `Packets Chart: ${packetsStats.reduce((acc, cur) => { return (acc + cur); }, 0)}`, icon, data: packetData });
        charts.push({ label: `Flood Chart: ${floodStats.reduce((acc, cur) => { return (acc + cur); }, 0)}`, icon, data: floodData });

        setCharts([...charts]);
    }, [stats]);

    return (
        <div className="flex  bg-white dark:bg-slate-900 shadow-xl rounded-lg p-6">
            {charts.length !== 0 ? charts.map(({ label, data }, index) => (
                <div key={index} className="flex flex-1 w-1/2 flex-col">
                    <h2 className="flex items-center space-x-2 text-lg font-semibold mb-4 text-slate-600 dark:text-slate-300">
                        {icon}
                        <span>{label}</span>
                    </h2>
                    <div className="w-full h-56 sm:h-72 md:h-96">
                        <ChartRenderer type={type} data={data} />
                    </div>
                </div>
            )) : <div className="w-full h-full text-slate-500">No data to display</div>}
        </div>
    );
};

type ChartRendererProps = {
    type: ChartType;
    data: any; // Replace with the actual data type
};

const ChartRenderer: React.FC<ChartRendererProps> = ({ type, data }) => {
    switch (type) {
        case ChartType.Pie:
            return <Pie data={data} />;
        case ChartType.Bar:
            return <Bar data={data} />;
        default:
            return <p>Invalid chart type</p>; // Handle unexpected types
    }
};

export default Chart;
