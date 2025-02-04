import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label.tsx";
import { AlertOctagon, Copy, PlusCircle, RefreshCw, Trash2, X } from "lucide-react";

interface HostStats {
  acks_received: number;
  acks_sent: number;
  fragments_received: number;
  fragments_sent: number;
  messages_received: number;
  messages_sent: number;
  nacks_received: number;
}

interface DroneStats {
  packets_sent: number;
  packets_dropped: number;
}

interface NodeDetailsProps {
  nodeId: string;
  onClose: () => void;
  refreshGraph: () => void;
}

const NodeDetails = ({ nodeId, onClose, refreshGraph }: NodeDetailsProps) => {
  const [nodeType, setNodeType] = useState<string | null>(null);
  const [neighbors, setNeighbors] = useState<string[]>([]);
  const [pdr, setPdr] = useState<number | null>(null);
  const [stats, setStats] = useState<HostStats | DroneStats | null>(null);
  const [newNeighbor, setNewNeighbor] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const fetchNodeDetails = async () => {
      try {
        const response = await invoke<{
          node_id: string;
          type: "Drone" | "Client" | "Server";
          connections: string[];
          pdr?: number;
          packets_sent?: number;
          packets_dropped?: number;
        }>("get_node_info", { nodeId: Number(nodeId) });

        setNodeType(response.type);
        setNeighbors(response.connections.sort((a, b) => Number(a) - Number(b)));

        if (response.type === "Drone") {
          setPdr(response.pdr !== undefined ? Number(response.pdr.toFixed(2)) : null);
          setStats({
            packets_sent: response.packets_sent ?? 0, // TODO: aggiungerlo anche per gli host, poiché è un parametro calcolato dal SC
            packets_dropped: response.packets_dropped ?? 0,
          });
        }

        if (response.type === "Client" || response.type === "Server") {
          await invoke("get_host_stats", { nodeId: Number(nodeId) });
        }
      } catch (error) {
        console.error("Errore nel recupero dei dettagli:", error);
      }
    };

    fetchNodeDetails();
  }, [nodeId]);

  useEffect(() => {
    const unlistenPromise = listen<[number, HostStats]>(
      "host_stats",
      (event) => {
        console.log("Statistiche aggiornate:", event.payload);
        const [receivedNodeId, hostStats] = event.payload;

        if (receivedNodeId === Number(nodeId)) {
          setStats((prev) => ({
            ...prev,
            ...hostStats,
          }));
        }
      }
    );

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [nodeId]);

  // Aggiunta di un vicino
  const addNeighbor = async () => {
    if (!newNeighbor) return;
    try {
      await invoke("add_neighbor", { nodeId: Number(nodeId), neighborId: Number(newNeighbor) });
      setNeighbors((prev) => [...prev, newNeighbor].sort((a, b) => Number(a) - Number(b)));
      setNewNeighbor("");
      refreshGraph();
    } catch (error) {
      console.error("Errore nell'aggiunta del vicino:", error);
    }
  };

  // Rimozione di un vicino
  const removeNeighbor = async (neighborId: string) => {
    try {
      await invoke("remove_neighbor", { nodeId: Number(nodeId), neighborId: Number(neighborId) });
      setNeighbors((prev) => prev.filter((n) => n !== neighborId));
      refreshGraph();
    } catch (error) {
      console.error("Errore nella rimozione del vicino:", error);
    }
  };

  const crashNode = async () => {
    try {
      await invoke("send_crash_command", {
        droneId: parseInt(nodeId, 10),
      });
      alert(`Il nodo ${ nodeId } è stato crashato!`);
      refreshGraph();
      onClose();
    } catch (error) {
      console.error("Errore nel crash del nodo:", error);
    }
  };

  // Modifica del PDR (solo per i Droni)
  const updatePdr = async (newPdr: number) => {
    try {
      await invoke("send_set_pdr_command", {
        droneId: parseInt(nodeId, 10),
        pdr: Math.round(newPdr * 100),
      });
      setPdr(newPdr);
    } catch (error) {
      console.error("Errore nell'aggiornamento del PDR:", error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Drone":
        return "bg-[#F5FAFA] text-[#9ACDC8]";
      case "Client":
        return "bg-[#F9FBF6] text-[#C3D59D]";
      case "Server":
        return "bg-[#FEFAF4] text-[#EDCB95]";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(stats, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Errore nella copia:", error);
    }
  };


  return (
    <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-xl flex flex-col border-l border-gray-200">
      {/* Header fisso */ }
      <div className="p-4 flex justify-between items-center border-b border-gray-200 bg-white sticky top-0">
        <h2 className="text-xl font-bold flex items-center">
          Dettagli Nodo #{ nodeId }
          { (nodeType && <span
              className={ `ml-3 px-2 py-1 text-sm rounded-md ${ getTypeColor(nodeType as string) }` }> { nodeType }</span>) }
        </h2>
        <Button variant="ghost" size="icon" onClick={ onClose }>
          <X size={ 20 }/>
        </Button>
      </div>

      {/* Contenuto scrollabile */ }
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Vicini */ }
        <div>
          <Label className="text-gray-600">Vicini</Label>
          <div className="mt-2 space-y-2">
            { neighbors.length > 0 ? (
              neighbors.map((neighbor) => (
                <div key={ neighbor } className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-md">
                  <span className="font-medium">{ neighbor }</span>
                  <Button variant="destructive" size="icon" onClick={ () => removeNeighbor(neighbor) }>
                    <Trash2 size={ 16 }/>
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-gray-500">Nessun vicino</p>
            ) }
          </div>
          <div className="flex items-center mt-3 space-x-2">
            <Input
              type="text"
              placeholder="ID nuovo vicino"
              value={ newNeighbor }
              onChange={ (e) => setNewNeighbor(e.target.value) }
            />
            <Button onClick={ addNeighbor } className="flex items-center">
              <PlusCircle size={ 16 } className="mr-1"/> Aggiungi
            </Button>
          </div>
        </div>

        {/* Azioni per i droni */ }
        { nodeType === "Drone" && (
          <>
            <div>
              <Label className="text-gray-600">PDR (Packet Drop Rate)</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={ pdr ?? "" }
                  onChange={ (e) => setPdr(parseFloat(e.target.value)) }
                />
                <Button onClick={ () => updatePdr(pdr ?? 0) } className="flex items-center">
                  <RefreshCw size={ 16 } className="mr-1"/> Aggiorna
                </Button>
              </div>
            </div>
            <Button variant="destructive" onClick={ crashNode } className="w-full flex items-center justify-center">
              <AlertOctagon size={ 16 } className="mr-1"/> Crash Drone
            </Button>
          </>
        ) }

        {/* Statistiche */ }
        { stats && (
          <div>
            <Label className="text-gray-600">Statistiche</Label>
            <pre className="relative bg-gray-100 p-3 rounded-md text-sm">
            <Button
              variant="outline"
              size="icon"
              className="absolute top-0 right-0 mt-1 mr-1"
              onClick={ copyToClipboard }
            >
              <Copy size={ 16 }/>
            </Button>
              { JSON.stringify(stats, null, 2) }
            </pre>
            {/* ✅ Messaggio di conferma visibile per 2 secondi */ }
            { copySuccess && <p className="text-gray-600 text-center text-xs mt-1">Copiato negli appunti!</p> }
          </div>
        ) }
      </div>
    </div>
  );
};

export default NodeDetails;
