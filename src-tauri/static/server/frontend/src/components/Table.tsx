import React, { useState, useEffect } from 'react'
import ExpandableCell from './ExpandableCell';
import Pagination from './Pagination';

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

export default Table;