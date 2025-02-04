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

    let fragmentsData = {
        labels: ['Msg Fragments Sent', 'Msg Fragments Received', 'Acks Sent', 'Acks Received', 'Nacks Received'],
        datasets: [
            {
                label: 'Packets',
                data: [stats.fragmentsSent, stats.fragmentsReceived, stats.acksSent, stats.acksReceived, stats.nacksReceived],
                backgroundColor: ['#72BAA9', '#D5E7B5', '#526cff', '#7BC9FF', '#D20062'],
                hoverBackgroundColor: ['#3fb598', '#b7d186', '#3950c2', '#4fa5de', '#ab1f62'],
                // hoverBackgroundColor: ['#89dfca', '#b5d57b', '#c06232'],
            },
        ],
    };

    useEffect(() => {
        messagesData.datasets[0].data = [stats.messagesSent, stats.messagesReceived];
        fragmentsData.datasets[0].data = [stats.fragmentsSent, stats.fragmentsReceived, stats.nacksReceived];
    }, [stats]);

    return (
        <div className="flex  bg-white shadow-xl rounded-lg p-6">
            <div className="flex flex-1 w-1/2 flex-col">
                <h2 className="flex items-center space-x-2 text-lg font-semibold mb-4 text-slate-600">
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
                <h2 className="flex items-center space-x-2 text-lg font-semibold mb-4 text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                    </svg>


                    <span>Fragments Chart</span>
                </h2>
                <div className="w-full h-56 sm:h-72 md:h-96">
                    <Bar data={fragmentsData} />
                </div>
            </div>
        </div>
    );
};

export default BarChart;
