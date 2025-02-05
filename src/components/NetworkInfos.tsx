import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { invoke } from "@tauri-apps/api/core";
import { LaptopIcon, ServerIcon } from "lucide-react";
import { PiDrone } from "react-icons/pi"; // Icona per i droni

interface NodeInfo {
  node_id: number;
  type: string;
  pdr?: number;
  packets_sent?: number;
  packets_dropped?: number;
  shortcuts_used?: number;
  packet_type_counts?: Record<string, number>;
  connections: number[];
}

const NetworkInfos = () => {
  const [networkData, setNetworkData] = useState<NodeInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNetworkInfos = async () => {
    try {
      const response = await invoke<{ nodes: NodeInfo[] }>("get_network_infos");
      console.log(response);
      setNetworkData(response.nodes);
    } catch (err) {
      setError("Errore nel recupero delle informazioni di rete.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkInfos();
    const interval = setInterval(fetchNetworkInfos, 5000); // Aggiornamento ogni 5 secondi
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p className="text-center">Caricamento...</p>;
  if (error) return <p className="text-center text-red-500">{ error }</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Network Infos</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>PDR</TableHead>
            <TableHead>Connections</TableHead>
            <TableHead>Packets Sent</TableHead>
            <TableHead>Packets Dropped</TableHead>
            <TableHead>Shortcuts Used</TableHead>
            <TableHead>Packet Types</TableHead>
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
                <TableCell>{ node.pdr !== undefined ? node.pdr.toFixed(2) : "-" }</TableCell>
                <TableCell>{ node.connections.length > 0 ? node.connections.join(", ") : "-" }</TableCell>
                <TableCell>{ node.packets_sent ?? "-" }</TableCell>
                <TableCell>{ node.packets_dropped ?? "-" }</TableCell>
                <TableCell>{ node.shortcuts_used ?? "-" }</TableCell>
                <TableCell>
                  { node.packet_type_counts
                    ? Object.entries(node.packet_type_counts).map(([type, count]) => (
                      <div key={ type } className="text-xs">
                        { type }: <span className="font-semibold">{ count }</span>
                      </div>
                    ))
                    : "-" }
                </TableCell>
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
