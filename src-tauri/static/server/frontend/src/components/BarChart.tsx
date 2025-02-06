import React, { useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { ChartProps } from '../utils/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const BarChart: React.FC<ChartProps> = ({ stats }) => {
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

    useEffect(() => {
        messagesData.datasets[0].data = [stats.messagesSent, stats.messagesReceived];
        packetData.datasets[0].data = [stats.messageFragmentsSent, stats.messageFragmentsReceived, stats.nacksReceived];
    }, [stats]);

    return (
        <div className="flex  bg-white dark:bg-slate-900 shadow-xl rounded-lg p-6">
            <div className="flex flex-1 w-1/2 flex-col">
                <h2 className="flex items-center space-x-2 text-lg font-semibold mb-4 text-slate-600 dark:text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                    </svg>


                    <span>Messages Chart</span>
                </h2>
                <div className="w-full h-56 sm:h-72 md:h-96">
                    <Bar data={messagesData} />
                </div>
            </div>
            <div className="flex flex-1 w-1/2 flex-col">
                <h2 className="flex items-center space-x-2 text-lg font-semibold mb-4 text-slate-600 dark:text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                    </svg>


                    <span>Fragments Chart</span>
                </h2>
                <div className="w-full h-56 sm:h-72 md:h-96">
                    <Bar data={packetData} />
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
                    <Bar data={floodData} />
                </div>
            </div>
        </div>
    );
};

export default BarChart;
