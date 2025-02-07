import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import OverviewTab from "@/components/stats/OverviewTab.tsx";
import NetworkTab from "@/components/stats/NetworkTab.tsx";
import DronesTab from "@/components/stats/DronesTab.tsx";
import HostsTab from "@/components/stats/HostsTab.tsx";

const NetworkStatsPage = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="p-6 pt-2 space-y-2">
      {/* Navbar con i Tabs */ }
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Simulation Dashboard</h1>
      </div>

      <Tabs defaultValue="overview" className="space-y-2" onValueChange={ setActiveTab }>
        {/* Tabs Trigger */ }
        <div className="flex flex-row justify-between items-center">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="drones">Drones</TabsTrigger>
            <TabsTrigger value="hosts">Hosts</TabsTrigger>
          </TabsList>

          {/* Dropdown selezione nodo, visibile solo per Drones o Hosts */ }
          { (activeTab === "drones" || activeTab === "hosts") && (
            <p>
              Drone/Host
            </p>
          ) }
        </div>

        {/* Tabs Content */ }
        <TabsContent value="overview">
          <OverviewTab/>
        </TabsContent>
        <TabsContent value="network">
          <NetworkTab/>
        </TabsContent>
        <TabsContent value="drones">
          <DronesTab/>
        </TabsContent>
        <TabsContent value="hosts">
          <HostsTab/>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NetworkStatsPage;
