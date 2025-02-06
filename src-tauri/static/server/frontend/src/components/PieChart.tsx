import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';

import { ChartDataType, ChartProps } from "../utils/types"

ChartJS.register(ArcElement, Tooltip, Legend);

const PieChart: React.FC<ChartProps> = ({ stats }) => {

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

    let packetsData = {
        labels: ['Msg Fragments Sent', 'Msg Fragments Received', 'Acks Sent', 'Acks Received', 'Nacks Received'],
        datasets: [
            {
                label: 'Packets',
                data: [stats.messageFragmentsSent, stats.messageFragmentsReceived, stats.acksSent, stats.acksReceived, stats.nacksReceived],
                backgroundColor: ['#72BAA9', '#D5E7B5', '#526cff', '#7BC9FF', '#D20062', '#B70182'],
                hoverBackgroundColor: ['#3fb598', '#b7d186', '#3950c2', '#4fa5de', '#ab1f62', "#c43078"],
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

    useEffect(() => {
        messagesData.datasets[0].data = [stats.messagesSent, stats.messagesReceived];
        packetsData.datasets[0].data = [stats.messageFragmentsReceived, stats.messageFragmentsReceived, stats.nacksReceived];
    }, [stats]);

    return (
        <div className="flex bg-white dark:bg-slate-900 shadow-xl rounded-lg p-6">
            <div className="flex flex-1 flex-col">
                <h2 className="flex items-center space-x-2 text-lg font-semibold mb-4 text-slate-600 dark:text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
                    </svg>

                    <span>Messages Chart</span>
                </h2>
                <div className="w-full h-56 sm:h-72 md:h-96">
                    <Pie data={messagesData} />
                </div>
            </div>
            <div className="flex flex-1 flex-col">
                <h2 className="flex items-center space-x-2 text-lg font-semibold mb-4 text-slate-600 dark:text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
                    </svg>

                    <span>Fragments Chart</span>
                </h2>
                <div className="w-full h-56 sm:h-72 md:h-96">
                    <Pie data={packetsData} />
                </div>
            </div>
            <div className="flex flex-1 flex-col">
                <h2 className="flex items-center space-x-2 text-lg font-semibold mb-4 text-slate-600 dark:text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
                    </svg>

                    <span>Flooding Chart</span>
                </h2>
                <div className="w-full h-56 sm:h-72 md:h-96">
                    <Pie data={floodData} />
                </div>
            </div>
        </div>
    );
};

export default PieChart;
