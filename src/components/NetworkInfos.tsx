import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { invoke } from "@tauri-apps/api/core";
import { LaptopIcon, ServerIcon } from "lucide-react";
import { PiDrone } from "react-icons/pi";
import { useSimulation } from "@/components/SimulationContext";

interface DroneMetrics {
  category: "Drone";
  pdr: number;
  current_pdr: number;
  packets_sent: number;
  packets_dropped: number;
  shortcuts_used: number;
  packet_type_counts: Record<string, number>;
}

interface HostMetrics {
  category: "Host";
  packets_sent: number;
  packets_acked: number;
  shortcuts_used: number;
  packet_type_counts: Record<string, number>;
  latencies: number[]; // in milliseconds
}

interface NoneMetrics {
  category: "None";
}

type NodeMetrics = DroneMetrics | HostMetrics | NoneMetrics;

export interface NodeInfo {
  node_id: number;
  node_type: "Drone" | "Client" | "Server";
  node_group?: string;
  connections: number[];
  metrics: NodeMetrics;
}

type SortKey = "node_id" | "node_type" | "pdr" | "packets_sent" | "shortcuts";

const NetworkInfos = () => {
  const [networkData, setNetworkData] = useState<NodeInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { pollingInterval } = useSimulation();

  const [sortKey, setSortKey] = useState<SortKey>("node_id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const fetchNetworkInfos = async () => {
    try {
      const response = await invoke<{ nodes: NodeInfo[] }>("get_network_infos");
      setNetworkData(response.nodes);
    } catch (err) {
      console.error(err);
      setError("Error fetching network information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkInfos();
    const interval = setInterval(fetchNetworkInfos, pollingInterval);
    return () => clearInterval(interval);
  }, [pollingInterval]);

  const getSortableValue = (node: NodeInfo, key: SortKey): number | string => {
    switch (key) {
      case "node_id":
        return node.node_id;
      case "node_type":
        return node.node_type;
      case "pdr":
        // Only drones have a PDR; for others, return -1 to push them to the bottom (or top)
        if (node.metrics.category === "Drone") {
          return (node.metrics as DroneMetrics).pdr;
        }
        return -1;
      case "packets_sent":
        if (node.metrics.category === "Drone" || node.metrics.category === "Host") {
          return (node.metrics as DroneMetrics | HostMetrics).packets_sent;
        }
        return 0;
      case "shortcuts":
        if (node.metrics.category === "Drone" || node.metrics.category === "Host") {
          return (node.metrics as DroneMetrics | HostMetrics).shortcuts_used;
        }
        return 0;
      default:
        return "";
    }
  };

  const sortedData = useMemo(() => {
    const dataCopy = [...networkData];
    dataCopy.sort((a, b) => {
      const aVal = getSortableValue(a, sortKey);
      const bVal = getSortableValue(b, sortKey);
      if (typeof aVal === "number" && typeof bVal === "number") {
        return aVal - bVal;
      }
      return String(aVal).localeCompare(String(bVal));
    });
    return sortDirection === "asc" ? dataCopy : dataCopy.reverse();
  }, [networkData, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  if (loading) return <p className="text-center">Loading...</p>;
  if (error) return <p className="text-center text-red-500">{ error }</p>;

  return (
    <div className="p-2">
      <h1 className="text-2xl font-semibold mb-4">Network Information</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={ () => handleSort("node_id") } className="cursor-pointer">
              ID { sortKey === "node_id" && (sortDirection === "asc" ? "↑" : "↓") }
            </TableHead>
            <TableHead onClick={ () => handleSort("node_type") } className="cursor-pointer">
              Type { sortKey === "node_type" && (sortDirection === "asc" ? "↑" : "↓") }
            </TableHead>
            <TableHead onClick={ () => handleSort("pdr") } className="cursor-pointer">
              PDR / Estimated { sortKey === "pdr" && (sortDirection === "asc" ? "↑" : "↓") }
            </TableHead>
            <TableHead onClick={ () => handleSort("packets_sent") } className="cursor-pointer">
              Packets Sent { sortKey === "packets_sent" && (sortDirection === "asc" ? "↑" : "↓") }
            </TableHead>
            <TableHead onClick={ () => handleSort("shortcuts") } className="cursor-pointer">
              Shortcuts { sortKey === "shortcuts" && (sortDirection === "asc" ? "↑" : "↓") }
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          { sortedData.length > 0 ? (
            sortedData.map((node) => {
              const pdrDisplay =
                node.metrics.category === "Drone"
                  ? `${ (node.metrics as DroneMetrics).pdr.toFixed(2) } / ${ (node.metrics as DroneMetrics).current_pdr.toFixed(2) }`
                  : "-";

              let packetsSent = "-";
              if (node.metrics.category === "Drone" || node.metrics.category === "Host") {
                packetsSent = String((node.metrics as DroneMetrics | HostMetrics).packets_sent);
              }

              let packetBreakdown: [string, number][] = [];
              if (
                node.metrics.category === "Drone" ||
                node.metrics.category === "Host"
              ) {
                packetBreakdown = Object.entries((node.metrics as DroneMetrics | HostMetrics).packet_type_counts);
              }

              return (
                <TableRow key={ node.node_id }>
                  <TableCell className="font-medium">{ node.node_id }</TableCell>
                  <TableCell className="flex items-center gap-2">
                    { node.node_type === "Drone" && (
                      <PiDrone className="w-5 h-5 text-[#9ACDC8]" strokeWidth={ 2.5 }/>
                    ) }
                    { node.node_type === "Server" && (
                      <ServerIcon className="w-5 h-5 text-[#EDCB95]" strokeWidth={ 2.5 }/>
                    ) }
                    { node.node_type === "Client" && (
                      <LaptopIcon className="w-5 h-5 text-[#C3D59D]" strokeWidth={ 2.5 }/>
                    ) }
                  </TableCell>
                  <TableCell>{ pdrDisplay }</TableCell>
                  <TableCell>
                    { packetBreakdown.length > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="underline cursor-default">{ packetsSent }</span>
                        </TooltipTrigger>
                        <TooltipContent className="p-2">
                          <div className="space-y-1">
                            { packetBreakdown.map(([type, count]) => (
                              <div key={ type } className="text-sm">
                                { type }: { count }
                              </div>
                            )) }
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      packetsSent
                    ) }
                  </TableCell>
                  <TableCell>
                    { node.metrics.category === "Drone" || node.metrics.category === "Host"
                      ? String((node.metrics as DroneMetrics | HostMetrics).shortcuts_used)
                      : "-" }
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={ 5 } className="text-center">
                No data available
              </TableCell>
            </TableRow>
          ) }
        </TableBody>
      </Table>
    </div>
  );
};

export default NetworkInfos;
