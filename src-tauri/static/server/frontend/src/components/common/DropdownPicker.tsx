import React, { useState } from 'react'

interface DropdownPickerProps {
    label: string
    selected: number,
    setSelected: React.Dispatch<React.SetStateAction<number>>,
    options: [number]
}

const DropdownPicker: React.FC<DropdownPickerProps> = ({ label, selected, setSelected, options }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const toggleDropdown = () => setIsOpen(prev => !prev);

    return (
        <div className="hs-dropdown relative inline-flex">
            <button
                id="hs-dropdown-default"
                type="button"
                className="hs-dropdown-toggle py-3 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                aria-haspopup="menu"
                aria-expanded={isOpen ? 'true' : 'false'}
                aria-label="Dropdown"
                onClick={toggleDropdown}
            >
                Select {label.toLowerCase()}
                <svg
                    className={`hs-dropdown-open:rotate-180 size-4 ${isOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>

            {isOpen && (
                <div
                    className="dropdown-menu"
                    aria-orientation="vertical"

                >
                    {options.map((option, index) => (
                        <button
                            key={index}
                            className="dropdown-item flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-300 dark:focus:bg-neutral-700"
                        >
                            {label}: {option}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// const DropdownPicker: React.FC<DropdownPickerProps> = ({ label, selected, setSelected, options }) => {
//     const [isOpen, setIsOpen] = useState(false);

//     return (
//         <div className="hs-dropdown-default relative inline-flex">
//             <button
//                 id="hs-dropdown-example"
//                 type="button"
//                 className="hs-dropdown-toggle py-3 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
//                 aria-haspopup="menu"
//                 aria-expanded={isOpen ? "true" : "false"}
//                 aria-label="Dropdown"
//                 onClick={() => setIsOpen(!isOpen)}
//             >
//                 {label} {/* Default label */}
//                 <svg className={`hs-dropdown-open:rotate-180 size-4 text-gray-600 dark:text-neutral-600 ${isOpen ? 'rotate-180' : ''}`}
//                     xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                     <path d="m6 9 6 6 6-6" />
//                 </svg>
//             </button>

//             <div className={`hs-dropdown-menu transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}
//                 role="menu" aria-orientation="vertical" aria-labelledby="hs-dropdown-example">
//                 <div className="p-1 space-y-0.5">
//                     {options.map((option, index) => (
//                         <button
//                             key={index}
//                             className={`flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-300 dark:focus:bg-neutral-700 ${selected === option ? 'bg-gray-200' : ''}`}
//                             onClick={(e) => {
//                                 e.preventDefault();
//                                 setSelected(option); // Set the selected value
//                             }}
//                         >
//                             {`${label} ${option}`} {/* Display the option value */}
//                         </button>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// };


export default DropdownPicker;