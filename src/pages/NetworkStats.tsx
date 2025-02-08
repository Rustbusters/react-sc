import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import OverviewTab from "@/components/stats/OverviewTab.tsx";
import DronesTab from "@/components/stats/DronesTab.tsx";
import HostsTab from "@/components/stats/HostsTab.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

export interface NetworkNode {
  id: number;
  type: string;
  pdr: number;
  crashed: boolean;
}

const NetworkStatsPage = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [filteredNodes, setFilteredNodes] = useState<NetworkNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const response: NetworkNode[] = await invoke("get_network_nodes");
        setNodes(response);
      } catch (error) {
        console.error("Error fetching network nodes:", error);
        toast.error("Error fetching network nodes.");
      }
    };

    fetchNodes().then(r => r);
  }, []);

  useEffect(() => {
    let filtered: NetworkNode[] = [];
    if (activeTab === "drones") {
      filtered = nodes.filter(node => node.type === "Drone");
    } else if (activeTab === "hosts") {
      filtered = nodes.filter(node => node.type === "Client" || node.type === "Server");
    }
    setFilteredNodes(filtered);

    if (filtered.length > 0) {
      setSelectedNode(filtered[0]);
    } else {
      setSelectedNode(null);
    }
  }, [activeTab, nodes]);

  return (
    <div className="p-6 pt-2 space-y-2 overflow-y-scroll">
      {/* Navbar con i Tabs */ }
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Simulation Metrics</h1>
      </div>

      <Tabs defaultValue="overview" className="space-y-2" onValueChange={ setActiveTab }>
        {/* Tabs Trigger */ }
        <div className="flex flex-row justify-between items-center">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {/*<TabsTrigger value="network">Network</TabsTrigger>*/ }
            <TabsTrigger value="drones">Drones</TabsTrigger>
            <TabsTrigger value="hosts">Hosts</TabsTrigger>
          </TabsList>

          { (activeTab === "drones" || activeTab === "hosts") && filteredNodes.length > 0 && (
            <Select value={ selectedNode?.id.toString() || "" }
                    onValueChange={ (value) => setSelectedNode(filteredNodes.find(node => node.id.toString() === value) || null) }>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a node"/>
              </SelectTrigger>
              <SelectContent>
                { filteredNodes.map(node => (
                  <SelectItem key={ node.id } value={ node.id.toString() }>
                    { node.type } #{ node.id }
                  </SelectItem>
                )) }
              </SelectContent>
            </Select>
          ) }
        </div>

        {/* Tabs Content */ }
        <TabsContent value="overview">
          <OverviewTab/>
        </TabsContent>
        {/*<TabsContent value="network">
          <NetworkTab/>
        </TabsContent>*/ }
        <TabsContent value="drones">
          <DronesTab selectedDroneId={ selectedNode }/>
        </TabsContent>
        <TabsContent value="hosts">
          <HostsTab selectedHostId={ selectedNode }/>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NetworkStatsPage;
