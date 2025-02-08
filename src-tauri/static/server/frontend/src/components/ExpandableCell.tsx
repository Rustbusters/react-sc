import { useState, useEffect, useRef } from 'react'

const ExpandableCell = ({ content }: { content: any }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current) {
            setIsOverflowing(contentRef.current.scrollHeight > contentRef.current.clientHeight);
        }
    }, []);

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

export default ExpandableCell;