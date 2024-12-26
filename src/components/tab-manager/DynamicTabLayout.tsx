import React, { useCallback } from 'react';
import { DndContext, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import NodeTreeTabsComponent from '@/components/tab-manager/NodeTreeTabs';


import { useLayoutStore } from '@/store/useLayoutStore';
import { NodeTreeTabsType } from '@/types';

const DynamicTabLayout: React.FC = React.memo(() => {

  const layout = useLayoutStore((state: { layout: any; }) => state.layout);
  const {
    setLayout,
    handleTabSelect,
    handleTabClose,
    handleMoveTabInNewSplittedTabs,
    handleMoveTabToNewStack,
    handleMoveTabToNewStackNew,
  } = useLayoutStore();

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  });
  const sensors = useSensors(mouseSensor);

  // DRAG & DROP
  const handleDragEnd = useCallback(
    (event: any) => {
      const { active, over } = event;
      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;
      if (!activeData || !overData) return;

      if (activeData.type === 'tab' && overData.type === 'interstitial-dropZone') {
        handleMoveTabToNewStackNew(
          activeData.tab.id,
          overData.stackId,
          overData.position
        );
      } else if (activeData.type === 'tab' && overData.type === 'dropZone') {
        const position = overData.position as
          | 'top'
          | 'bottom'
          | 'left'
          | 'right'
          | 'center';
        const targetNodeId = over.id.replace(/-(top|bottom|left|right|center)$/, '');

        if (position === 'center') {
          handleMoveTabToNewStack(activeData.tab.id, targetNodeId);
        } else {
          handleMoveTabInNewSplittedTabs(
            activeData.tab.id,
            targetNodeId,
            position
          );
        }
      }
    },
    [
      handleMoveTabInNewSplittedTabs,
      handleMoveTabToNewStack,
      handleMoveTabToNewStackNew,
    ]
  );

  // CALLBACKS
  const onTabSelect = useCallback(
    (stackId: string, tabId: string) => {
      handleTabSelect(stackId, tabId);
    },
    [handleTabSelect]
  );

  const onTabClose = useCallback(
    (stackId: string, tabId: string) => {
      handleTabClose(stackId, tabId);
    },
    [handleTabClose]
  );

  const updateSplitPercentages = useCallback(
    (splitId: string, newPercentages: number[]) => {
      // Usa setLayout direttamente
      setLayout((draft: NodeTreeTabsType) => {
        const updatePercentages = (node: NodeTreeTabsType): boolean => {
          if (node.type === 'splittedTabs' && node.id === splitId) {
            node.splitPercentages = newPercentages;
            return true;
          } else if (node.type === 'splittedTabs') {
            return node.nodeTreeTabs.some(updatePercentages);
          }
          return false;
        };
        updatePercentages(draft);
      });
    },
    [setLayout]
  );

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="h-full w-full">
        <NodeTreeTabsComponent
          nodeTreeTabs={layout}
          onTabSelect={onTabSelect}
          onTabClose={onTabClose}
          updateSplitPercentages={updateSplitPercentages}
        />
      </div>
    </DndContext>
  );
});

DynamicTabLayout.displayName = 'DynamicTabLayout';
export default DynamicTabLayout;
