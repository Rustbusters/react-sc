import React from 'react';
import { NodeTreeTabsType } from '@/types';
import SplittedTabs from '@/components/tab-manager/SplittedTabs';
import TabStack from '@/components/tab-manager/TabStack';
import DropZone from '@/components/tab-manager/DropZone';
import { useDndContext } from '@dnd-kit/core';

interface NodeTreeTabsProps {
  nodeTreeTabs: NodeTreeTabsType;
  onTabSelect: (stackId: string, tabId: string) => void;
  onTabClose: (stackId: string, tabId: string) => void;
  updateSplitPercentages: (splitId: string, newPercentages: number[]) => void;
}

const NodeTreeTabsComponent: React.FC<NodeTreeTabsProps> = ({
                                                              nodeTreeTabs,
                                                              onTabSelect,
                                                              onTabClose,
                                                              updateSplitPercentages,
                                                            }) => {
  const { active } = useDndContext();

  /**
   * Renders the content based on the type of the nodeTreeTabs
   */
  const renderContent = () => {
    if (nodeTreeTabs.type === 'splittedTabs') {
      return (
        <SplittedTabs
          splittedTabs={ nodeTreeTabs }
          onTabSelect={ onTabSelect }
          onTabClose={ onTabClose }
          updateSplitPercentages={ updateSplitPercentages }
        />
      );
    }
    if (nodeTreeTabs.type === 'tabStack') {
      return (
        <TabStack
          tabStack={ nodeTreeTabs }
          onTabSelect={ onTabSelect }
          onTabClose={ onTabClose }
        />
      );
    }
    return null; // Handle undefined or invalid type gracefully
  };

  /**
   * Renders the drop zones for drag and drop
   */
  const renderDropZones = () => {
    if (!active) return null;

    const baseDropZones = (
      <>
        <DropZone id={ `${ nodeTreeTabs.id }-top` } position="top"/>
        <DropZone id={ `${ nodeTreeTabs.id }-bottom` } position="bottom"/>
        <DropZone id={ `${ nodeTreeTabs.id }-left` } position="left"/>
        <DropZone id={ `${ nodeTreeTabs.id }-right` } position="right"/>
      </>
    );

    if (nodeTreeTabs.type === 'tabStack') {
      return (
        <>
          <DropZone id={ `${ nodeTreeTabs.id }-center` } position="center"/>
          { baseDropZones }
        </>
      );
    }

    return baseDropZones;
  };

  return (
    <div className="relative h-full w-full">
      { renderContent() }
      { renderDropZones() }
    </div>
  );
};

NodeTreeTabsComponent.displayName = 'NodeTreeTabs';
export default React.memo(NodeTreeTabsComponent);
