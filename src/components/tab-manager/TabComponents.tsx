// TabComponents (NEW)
import React, { useMemo } from 'react';
import {
  Tab1Teleporter,
  Tab2Teleporter,
  Tab3Teleporter,
  GraphTeleporter,
  ControlPanelTeleporter,
} from '@/lib/teleporters';


const createTabComponents = () => ({
  tab1Component: <Tab1Teleporter.Target key="tab1" />,
  tab2Component: <Tab2Teleporter.Target key="tab2" />,
  tab3Component: <Tab3Teleporter.Target key="tab3" />,
  graphComponent: <GraphTeleporter.Target key="graph" />,
  controlPanelComponent: <ControlPanelTeleporter.Target key="controlPanel" />,
});

export const useTabComponents = (): { [key: string]: React.ReactNode } => {
  return useMemo(() => createTabComponents(), []);
};
