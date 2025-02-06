import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { invoke } from "@tauri-apps/api/core";
import { LaptopIcon, ServerIcon } from "lucide-react";
import { PiDrone } from "react-icons/pi";

interface NodeInfo {
  node_id: number;
  type: string;
  pdr?: number;
  current_pdr?: number;
  packets_sent: number;
  packets_dropped?: number;
  packets_acked?: number;
  shortcuts: number;
  connections: number[];
}

const NetworkInfos = () => {
  const [networkData, setNetworkData] = useState<NodeInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNetworkInfos = async () => {
    try {
      const response = await invoke<{ nodes: NodeInfo[] }>("get_network_infos");
      setNetworkData(response.nodes);
    } catch (err) {
      setError("Error fetching network infos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkInfos();
    const interval = setInterval(fetchNetworkInfos, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p className="text-center">Caricamento...</p>;
  if (error) return <p className="text-center text-red-500">{ error }</p>;

  return (
    <div className="p-2">
      <h1 className="text-2xl font-semibold mb-4">Network Infos</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>PDR/Estimated</TableHead>
            <TableHead>Connections</TableHead>
            <TableHead>Packets Sent</TableHead>
            <TableHead>Dropped/Acked</TableHead>
            <TableHead>Shortcuts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          { networkData.length > 0 ? (
            networkData.map((node) => (
              <TableRow key={ node.node_id } className="hover:bg-gray-100">
                <TableCell className="font-medium">{ node.node_id }</TableCell>
                <TableCell className="flex items-center gap-2">
                  { node.type === "Drone" && <PiDrone className="w-5 h-5 text-[#9ACDC8]" strokeWidth={ 2.5 }/> }
                  { node.type === "Server" && <ServerIcon className="w-5 h-5 text-[#EDCB95]" strokeWidth={ 2.5 }/> }
                  { node.type === "Client" && <LaptopIcon className="w-5 h-5 text-[#C3D59D]" strokeWidth={ 2.5 }/> }
                </TableCell>
                <TableCell>{ node.pdr !== undefined ? node.pdr.toFixed(2) : "-" }/{ node.current_pdr !== undefined ? node.current_pdr.toFixed(2) : "-" }</TableCell>
                <TableCell>{ node.connections.length > 0 ? node.connections.join(", ") : "-" }</TableCell>
                <TableCell>{ node.packets_sent ?? "-" }</TableCell>
                <TableCell>{ node.packets_dropped ?? node.packets_acked }</TableCell>
                <TableCell>{ node.shortcuts ?? "-" }</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={ 8 } className="text-center">
                Nessun dato disponibile
              </TableCell>
            </TableRow>
          ) }
        </TableBody>
      </Table>
    </div>
  );
};

export default NetworkInfos;
