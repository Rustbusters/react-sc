import React from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { ChartProps } from '../utils/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const LineChart: React.FC<ChartProps> = ({ stats }) => {
    const totalMessages = stats.messagesSent + stats.messagesReceived;
    const messagesData = {
        labels: ['Sent', 'Received'],
        datasets: [
            {
                label: 'Messages Chart',
                data: [stats.messagesSent, stats.messagesReceived],
                backgroundColor: ['#9B4D96', '#4F6D7A', '#7B68EE'],
                hoverBackgroundColor: ['#9B4D96', '#4F6D7A', '#7B68EE'],
            },
        ],
    };

    const totalFragments = stats.fragmentsSent + stats.fragmentsReceived + stats.nacksReceived;
    const fragmentsData = {
        labels: ['Sent', 'Received', 'Nacks'],
        datasets: [
            {
                label: 'Fragments Chart',
                data: [stats.fragmentsSent, stats.fragmentsReceived, stats.nacksReceived],
                backgroundColor: ['#9B4D96', '#4F6D7A', '#7B68EE'],
                hoverBackgroundColor: ['#9B4D96', '#4F6D7A', '#7B68EE'],
            },
        ],
    };

    return (
        <div className="bg-white shadow-xl rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Messages Chart</h2>
            <div className="w-full h-56 sm:h-72 md:h-96">
                <Line data={messagesData} />
            </div>
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Fragments Chart</h2>
            <div className="w-full h-56 sm:h-72 md:h-96">
                <Line data={fragmentsData} />
            </div>
        </div>
    );
};

export default LineChart;
