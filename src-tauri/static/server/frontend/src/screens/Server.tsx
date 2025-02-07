import React, { useRef, useEffect, useState } from 'react';
import Chart from "../components/Chart"
import Title from '../components/common/Title';

import { GlobalStateContext } from '../GlobalState';
import axios from 'axios';
import { HTTP_URL } from '../utils/constants';
import { ChartType, defaultStats, MessageType, ServerActiveUsers, StatsType, UserType } from '../utils/types';
import ExpandableSection from '../components/ExpandableSection';

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

type Comparable = string | number | boolean | Date;

// Generic type for table props
type TableProps<T extends Record<string, Comparable>> = {
    data: T[];
    columns: { key: string; label: string; render?: (value: any, row: T) => React.ReactNode }[];
    rowsPerPage?: number;
};

const Table = <T extends Record<string, Comparable>>({ data, columns, rowsPerPage = 5 }: TableProps<T>) => {
    // State for pagination
    const [paginatedData, setPaginatedData] = useState<T[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    let [ascending, setAscending] = useState(true);

    const sortableColumns = new Set<string>(["timestamp"]);

    const calculatePagination = () => {
        const total = Math.ceil(data.length / rowsPerPage);
        setTotalPages(total);
        setPaginatedData(data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage));
    }

    useEffect(() => {
        calculatePagination();
    }, [data, currentPage, rowsPerPage]);

    return (
        <React.Fragment>
            {data && data.length !== 0 ? <div className="flex flex-col">
                <div className="-m-1.5 overflow-x-auto mx-0 bg-white dark:bg-slate-900 rounded-lg">
                    <div className="p-1.5 min-w-full inline-block align-middle">
                        <div className="overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                <thead>
                                    <tr>
                                        {columns.map((col) => (
                                            <th key={String(col.key)}
                                                className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase
                                            ">
                                                <div className="relative group">
                                                    <div onClick={() => {
                                                        if (sortableColumns.has(col.key)) {
                                                            ascending = !ascending;
                                                            data.sort((a, b) => {
                                                                const valueA = a[col.key];
                                                                const valueB = b[col.key];

                                                                if (valueA < valueB) return ascending ? -1 : 1;
                                                                if (valueA > valueB) return ascending ? 1 : -1;
                                                                return 0;
                                                            }); calculatePagination(); setAscending(ascending);
                                                        }
                                                    }} className="flex items-center justify-between space-x-4 p-1 rounded-lg hover:text-indigo-400 hover:bg-slate-100 dark:hover:text-indigo-400 dark:hover:bg-slate-800 hover:cursor-pointer">
                                                        <span className="">{col.label}</span>
                                                        {
                                                            sortableColumns.has(col.key) ? (ascending ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-slate-400">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
                                                            </svg> : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-slate-400">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                                                            </svg>
                                                            ) : null
                                                        }

                                                    </div>
                                                    {sortableColumns.has(col.key) ? <span className="absolute top-[2rem] left-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300 bg-indigo-500 dark:bg-indigo-800 text-white text-sm rounded-lg px-2 py-2">Sort {ascending ? "ascending" : "discending"}</span> : null}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="w-full h-[420px] divide-y divide-gray-200 dark:divide-slate-700">
                                    {paginatedData.map((item, index) => (
                                        <tr key={index} className="h-[80px]">
                                            {columns.map((col) => (
                                                <td key={String(col.key)} className="px-6 py-4 w-[25vw] h-[80px] max-h-[80px] overflow-y-scroll text-sm text-gray-800 dark:text-slate-300">
                                                    {col.key != "message" ? (col.render ? col.render(item[col.key], item) : String(item[col.key])) :
                                                        <ExpandableCell content={col.render ? col.render(item[col.key], item) : String(item[col.key])} />
                                                    }
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    <tr className='h-full'></tr>
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        <div className="mt-4">
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </div>
                    </div>
                </div>
            </div> : <div className="w-full h-full text-slate-500">No data to display</div>
            }
        </React.Fragment >
    );
};

const ExpandableCell = ({ content }: { content: any }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current) {
            setIsOverflowing(contentRef.current.scrollHeight > contentRef.current.clientHeight);
        }
    }, [content]);

    return (
        <div className="relative">
            {/* Content Container */}
            <div
                ref={contentRef}
                className={`overflow-hidden transition-all ${isExpanded ? "max-h-full" : "max-h-[4.5rem]"
                    }`}
                style={{ lineHeight: "1.5rem" }} // 3 lines max initially
            >
                {content}
            </div>

            {/* Show More / Show Less Button */}
            {isOverflowing && (
                <button
                    className="text-blue-500 text-xs mt-1 underline"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? "Show Less" : "Show More"}
                </button>
            )}
        </div>
    );
};

// Pagination component for rendering everything on multiple pages
type PaginationProps = {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div className="flex items-center justify-center space-x-2">
            <button
                className="px-3 py-2 bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-slate-500 disabled:opacity-50"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
            >
                Prev
            </button>

            {pages.map((page) => (
                <button
                    key={page}
                    className={`px-3 py-2 rounded-md ${currentPage === page ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-900 dark:text-white dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-500"
                        }`}
                    onClick={() => onPageChange(page)}
                >
                    {page}
                </button>
            ))}

            <button
                className="px-3 py-2 bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-slate-500 disabled:opacity-50"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
            >
                Next
            </button>
        </div>
    );
};
export default Server;
