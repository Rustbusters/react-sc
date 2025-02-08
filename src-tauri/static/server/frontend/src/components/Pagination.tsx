import React from 'react'

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

export default Pagination;