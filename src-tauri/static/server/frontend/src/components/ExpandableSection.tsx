import React, { Children, ReactNode } from 'react'

type ExpandableSectionProps = {
    title: string,
    isOpen: boolean,
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>,
    children: ReactNode,
};

const ExpandableSection: React.FC<ExpandableSectionProps> = ({ title, isOpen, setIsOpen, children }) => {
    return (
        <div className="flex flex-1 flex-col space-y-4">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full text-start flex items-center px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg group text-slate-900 dark:text-white hover:bg-gray-100 dark:bg-slate-900 dark:hover:bg-slate-800">
                <h2 className="flex items-center space-x-2 text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
                <div className="flex flex-grow justify-end">
                    {isOpen ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 dark:text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>

                        : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 dark:text-white">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>

                    }
                </div>
            </button>
            {isOpen && children}
        </div>
    );
}

export default ExpandableSection;