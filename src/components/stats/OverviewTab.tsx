import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { toast } from "sonner";
import PacketTypeBarChart from "@/components/graphs/PacketTypeBarChart.tsx";
import HeatmapGraph from "@/components/graphs/Heatmap.tsx";
import { useSimulation } from "@/components/SimulationContext.tsx";

interface NetworkNode {
  id: string;
  type: "Drone" | "Client" | "Server";
}


const OverviewTab = () => {
  const [data, setData] = useState<OverviewMetrics | null>(null);
  const [nodeTypes, setNodeTypes] = useState<Record<string, "Drone" | "Client" | "Server">>({});
  const [loading, setLoading] = useState(true);
  const { pollingInterval } = useSimulation();

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response: OverviewMetrics = await invoke("get_overview_metrics");
        setData(response);
      } catch (error) {
        console.error("Error fetching metrics:", error);
        toast.error("Error fetching metrics.");
      } finally {
        setLoading(false);
      }
    };

    const fetchNodeTypes = async () => {
      try {
        const response: NetworkNode[] = await invoke("get_network_nodes");
        const typesMap: Record<string, "Drone" | "Client" | "Server"> = {};
        response.forEach((node) => {
          typesMap[node.id] = node.type;
        });
        setNodeTypes(typesMap);
      } catch (error) {
        console.error("Error fetching network nodes:", error);
        toast.error("Error fetching network nodes.");
      }
    };

    fetchMetrics();
    fetchNodeTypes();

    const interval = setInterval(fetchMetrics, pollingInterval);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <p className="text-center">Loading...</p>;
  }

  if (!data) {
    return <p className="text-center">Data not available</p>;
  }

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) {
      return `${ bytes.toLocaleString() } B`;
    } else if (bytes < 1024 * 1024) {
      return `${ (bytes / 1024).toFixed(1) } KB`;
    } else {
      return `${ (bytes / (1024 * 1024)).toFixed(1) } MB`;
    }
  };

  const msgFragmentsSent = data.packets_by_type.MsgFragment || 0;
  const totalBytesTransferred = msgFragmentsSent * 128;

  return (
    <div className="py-6 space-y-6">
      {/* Main Statistics */ }
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Packets Sent" value={ data.total_packets_sent.toLocaleString() }/>
        <StatCard title="NACKs" value={ data.packets_by_type.Nack?.toLocaleString() || "0" }/>
        <StatCard title="Messages" value={ data.total_messages_sent.toLocaleString() }/>
        <StatCard title="Byte Transfer" value={ formatBytes(totalBytesTransferred) }/>
      </div>

      {/* Heatmap and Breakdown by Type */ }
      <div className="flex items-start gap-6">
        <Card className="w-3/5 p-2">
          <CardHeader>
            <CardTitle className="font-semibold">Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <HeatmapGraph heatmap={ data.heatmap } nodeTypes={ nodeTypes }/>
          </CardContent>
        </Card>

        {/* Using the new reusable component */ }
        <PacketTypeBarChart packetData={ data.packets_by_type } className="w-2/5"/>
      </div>
    </div>
  );
};

const StatCard = ({ title, value }: { title: string; value: string }) => (
  <Card className="">
    <CardHeader className="pb-2">
      <CardTitle className="text-xs font-medium">{ title }</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-xl font-semibold">{ value }</p>
    </CardContent>
  </Card>
);

export default OverviewTab;

// Data typing for backend response
interface OverviewMetrics {
  total_messages_sent: number;
  total_packets_sent: number;
  packets_by_type: Record<string, number>;
  heatmap: Record<string, number>;
}
