import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { TabStackType } from '@/types';
import TabHeader from '@/components/tab-manager/Tab';
import InterstitialDropZone from "@/components/tab-manager/InterstitialDropZone";
import { useTabComponents } from "@/components/tab-manager/TabComponents";

interface TabStackProps {
  tabStack: TabStackType;
  onTabSelect: (stackId: string, tabId: string) => void;
  onTabClose: (stackId: string, tabId: string) => void;
}

const TabStackComponent: React.FC<TabStackProps> = ({
                                                      tabStack,
                                                      onTabSelect,
                                                      onTabClose,
                                                    }) => {
  // Configure droppable for the TabStack
  const { setNodeRef } = useDroppable({
    id: tabStack.id,
    data: { type: 'tabStack', tabStack },
  });

  const tabComponents = useTabComponents();

  // const { active } = useDndContext();

  return (
    <div
      ref={ setNodeRef }
      className="border h-full flex flex-col rounded-lg"
    >
      {/* Tab headers */ }
        <div className="flex items-center bg-gray-700 rounded-t-lg">
          { tabStack.tabs.map((tab, index) => (
            <React.Fragment key={ tab.id }>
              <InterstitialDropZone
                stackId={ tabStack.id }
                position={ index }
              />
              <TabHeader
                key={ tab.id }
                tab={ tab }
                isActive={ (tabStack.activeTabIndex ?? 0) === index }
                onSelect={ () => onTabSelect(tabStack.id, tab.id) }
                onClose={ () => onTabClose(tabStack.id, tab.id) }
              />
            </React.Fragment>
          )) }
          {/* DropZone alla fine dello stack */ }
          <InterstitialDropZone
            stackId={ tabStack.id }
            position={ tabStack.tabs.length }
          />
        </div>

        {/* Content area */ }
        <div className="flex-1 bg-white overflow-auto relative z-0">
          {tabStack.tabs.map((tab, index) => {
            const isActive = (tabStack.activeTabIndex ?? 0) === index;
            return (
              <div
                key={tab.id}
                style={{ display: isActive ? 'block' : 'none' }}
                className="h-full w-full"
              >
                {tabComponents[tab.componentId]}
              </div>
            );
          })}
        </div>

    </div>
  );
};

export default TabStackComponent;
