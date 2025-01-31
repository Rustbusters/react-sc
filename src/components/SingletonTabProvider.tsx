// SingletonTabProvider.tsx
import {
  ControlPanelTeleporter,
  GraphTeleporter,
  Tab1Teleporter,
  Tab2Teleporter,
  Tab3Teleporter,
} from '@/lib/teleporters';

import { CustomComponent } from '@/components/tab-manager/CustomComponent';
import ControlPanel from "@/components/control-panel";
import { DebugTab } from "@/components/DebugTab.tsx";

const Tab1Content = () => <div>Contenuto della Tab 1</div>;

// const Tab2Content = () => <div>Contenuto della Tab 2</div>;

export function SingletonTabProvider() {

  return (
    <>
      {/* Tab1: */ }
      <Tab1Teleporter.Source>
        <Tab1Content/>
      </Tab1Teleporter.Source>

      {/* Tab2: */ }
      <Tab2Teleporter.Source>
        <DebugTab/>
      </Tab2Teleporter.Source>

      {/* Tab3: */ }
      <Tab3Teleporter.Source>
        <CustomComponent/>
      </Tab3Teleporter.Source>

      {/* Graph: */ }
      <GraphTeleporter.Source>
        <div>
          GraphComponent
        </div>
      </GraphTeleporter.Source>

      {/* ControlPanel: */ }
      <ControlPanelTeleporter.Source>
        <ControlPanel/>
      </ControlPanelTeleporter.Source>
    </>
  );
}
