// components/SplittedTabs.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SplittedTabsType } from '@/types';
import NodeTreeTabs from '@/components/tab-manager/NodeTreeTabs';

interface SplittedTabsProps {
  splittedTabs: SplittedTabsType;
  onTabSelect: (stackId: string, tabId: string) => void;
  onTabClose: (stackId: string, tabId: string) => void;
  updateSplitPercentages: (splitId: string, newPercentages: number[]) => void;
}

const SplittedTabsComponent: React.FC<SplittedTabsProps> = ({
                                                              splittedTabs,
                                                              onTabSelect,
                                                              onTabClose,
                                                              updateSplitPercentages,
                                                            }) => {
  const { setNodeRef } = useDroppable({
    id: splittedTabs.id,
    data: { type: 'splittedTabs', splittedTabs },
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [activeDividerIndex, setActiveDividerIndex] = useState<number | null>(null);
  const [initialClientPos, setInitialClientPos] = useState<number>(0);
  const [initialPercentages, setInitialPercentages] = useState<number[]>([]);

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setActiveDividerIndex(index);
    setInitialClientPos(
      splittedTabs.direction === 'horizontal' ? e.clientX : e.clientY
    );
    setInitialPercentages([...splittedTabs.splitPercentages]);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || activeDividerIndex === null || !containerRef.current) return;

      const currentClientPos =
        splittedTabs.direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentClientPos - initialClientPos;

      const containerSize =
        splittedTabs.direction === 'horizontal'
          ? containerRef.current.offsetWidth
          : containerRef.current.offsetHeight;

      const deltaPercentage = (delta / containerSize) * 100;

      const newPercentages = [...initialPercentages];

      newPercentages[activeDividerIndex] =
        initialPercentages[activeDividerIndex] + deltaPercentage;
      newPercentages[activeDividerIndex + 1] =
        initialPercentages[activeDividerIndex + 1] - deltaPercentage;

      // Limits to prevent areas from becoming too small
      if (
        newPercentages[activeDividerIndex] >= 5 &&
        newPercentages[activeDividerIndex + 1] >= 5
      ) {
        // Use the update function to update the percentages in the parent state
        updateSplitPercentages(splittedTabs.id, newPercentages);
      }
    },
    [
      isResizing,
      activeDividerIndex,
      initialClientPos,
      initialPercentages,
      splittedTabs.direction,
      splittedTabs.id,
      updateSplitPercentages,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    setActiveDividerIndex(null);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={ (node) => {
        setNodeRef(node);
        containerRef.current = node ?? null;
      } }
      className={ `flex ${
        splittedTabs.direction === 'horizontal' ? 'flex-row' : 'flex-col'
      } h-full w-full rounded-lg` }
    >
      { splittedTabs.nodeTreeTabs.map((child, index) => {
        const flexBasis = `${ splittedTabs.splitPercentages[index] }%`;

        return (
          <React.Fragment key={ child.id }>
            <div style={ { flexBasis } } className="h-full">
              <NodeTreeTabs
                nodeTreeTabs={ child }
                onTabSelect={ onTabSelect }
                onTabClose={ onTabClose }
                updateSplitPercentages={ updateSplitPercentages }
              />
            </div>
            { index < splittedTabs.nodeTreeTabs.length - 1 && (
              <div
                className={ `${
                  splittedTabs.direction === 'horizontal'
                    ? 'w-1 cursor-col-resize mx-[0.10rem]'
                    : 'h-1 cursor-row-resize my-[0.10rem]'
                } ${ isResizing && activeDividerIndex === index
                  ? 'bg-blue-300'
                  : 'bg-transparent' } rounded-full` } // TODO: aggiungere bg-gray-700/70 h-6 o w-6 per UX
                onMouseDown={ (e) => handleMouseDown(index, e) }
              />
            ) }
          </React.Fragment>
        );
      }) }
    </div>
  );
};

export default SplittedTabsComponent;
