import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';

import Logo from './common/Logo';
import { GlobalStateContext } from '../GlobalState';

const Sidebar = () => {

    const getCurrentPathName = () => window.location.pathname.split('/').slice(1).join('/');

    const [isServersOpen, setIsServersOpen] = useState(false);

    const { availableServers } = useContext(GlobalStateContext);
    const [curPage, setCurPage] = useState<string>(getCurrentPathName());

    const getStyles = (page: string) => page === curPage ? "flex space-x-2 text-white bg-indigo-600 flex items-center px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg group" : "space-x-2 text-slate-900 flex items-center px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg group";

    return (
        <div className="hidden md:flex md:w-64 md:flex-col max-h-screen">
            <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white">
                <div className="relative text-white w-64 min-h-screen p-4">
                    <Logo />
                    <div className="flex items-center flex-shrink-0 px-4">
                        <span className="text-md text-slate-500 dark:text-white">Ilya's Rustbusters Server</span>
                    </div>

                    <div className="px-4 mt-6">
                        <hr className="border-gray-200" />
                    </div>

                    <div className="flex flex-col flex-1 px-3 mt-6">
                        <div className="space-y-4">
                            <nav className="flex-1 space-y-2 hover:bg-gray-100 rounded-lg">
                                <Link to="/dashboard" onClick={() => setCurPage("dashboard")} className={getStyles("dashboard")}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                                    </svg>

                                    <span>Dashboard</span>
                                </Link>
                            </nav>

                            <hr className="border-gray-200" />

                            <nav className="flex-1 space-y-2">
                                <button onClick={() => { setIsServersOpen(!isServersOpen); setCurPage("servers"); }} className="w-full text-start flex items-center px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg group text-slate-900 dark:text-white hover:bg-gray-100 dark:hover:bg-neutral-700">
                                    <div className="flex space-x-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z" />
                                        </svg>
                                        <span>Servers</span>

                                    </div>
                                    <div className="flex flex-grow justify-end">
                                        {isServersOpen ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-5">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                                        </svg>
                                            : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-5">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                            </svg>
                                        }

                                    </div>
                                </button>
                                {isServersOpen && (
                                    <div className="pl-5 space-y-1">
                                        {availableServers.map((id, index) => (
                                            <Link key={index} to={`/servers/${id}`} onClick={() => setCurPage(`servers/${id}`)} className={getStyles(`servers/${id}`)}>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-5">
                                                    <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={1.5} d="M21.75 17.25v-.228a4.5 4.5 0 0 0-.12-1.03l-2.268-9.64a3.375 3.375 0 0 0-3.285-2.602H7.923a3.375 3.375 0 0 0-3.285 2.602l-2.268 9.64a4.5 4.5 0 0 0-.12 1.03v.228m19.5 0a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3m19.5 0a3 3 0 0 0-3-3H5.25a3 3 0 0 0-3 3m16.5 0h.008v.008h-.008v-.008Zm-3 0h.008v.008h-.008v-.008Z" />
                                                </svg>
                                                <span>Server {id}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </nav>

                            <hr className="border-gray-200" />

                            <nav className="flex-1 space-y-2 hover:bg-gray-100 rounded-lg">
                                <Link to="/documentation" onClick={() => setCurPage("documentation")} className={getStyles("documentation")}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                                    </svg>
                                    <span>Documentation</span>
                                </Link>
                            </nav>
                        </div>
                    </div>

                    <div className="absolute bottom-0 flex items-center flex-shrink-0 px-4 py-8">
                        <p className="text-slate-500 bold text-sm">Advanced Programming Course 2024-2025 UNITN</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Sidebar;
