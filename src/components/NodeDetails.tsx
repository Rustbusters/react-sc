import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
        setNeighbors(response.connections);

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
      setNeighbors((prev) => [...prev, newNeighbor]);
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
        pdr: newPdr,
      });
      setPdr(newPdr);
    } catch (error) {
      console.error("Errore nell'aggiornamento del PDR:", error);
    }
  };

  console.log("Stats:", stats);
  return (
    <div className="flex flex-col space-y-4">
      <h2 className="text-lg font-semibold">Dettagli Nodo { nodeId }</h2>
      <p>Tipo: <strong>{ nodeType }</strong></p>

      {/* Lista dei vicini */ }
      <div>
        <h3 className="text-md font-medium">Vicini</h3>
        <ul className="list-disc pl-5">
          { neighbors.map((neighbor) => (
            <li key={ neighbor } className="flex justify-between py-1">
              { neighbor }
              <Button variant="destructive" size="sm" onClick={ () => removeNeighbor(neighbor) }>
                Rimuovi
              </Button>
            </li>
          )) }
        </ul>
        <div className="flex space-x-2 mt-2">
          <Input
            type="text"
            placeholder="ID nuovo vicino"
            value={ newNeighbor }
            onChange={ (e) => setNewNeighbor(e.target.value) }
          />
          <Button onClick={ addNeighbor }>Aggiungi</Button>
        </div>
      </div>

      {/* Azioni specifiche per i droni */ }
      { nodeType === "Drone" && (
        <>
          <div>
            <h3 className="text-md font-medium">PDR (Packet Drop Rate)</h3>
            <div className="flex space-x-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={ pdr ?? "" }
                onChange={ (e) => setPdr(parseFloat(e.target.value)) }
              />
              <Button onClick={ () => updatePdr(pdr ?? 0) }>Aggiorna PDR</Button>
            </div>
          </div>

          <Button variant="destructive" onClick={ crashNode }>Crash Drone</Button>
        </>
      ) }

      {/* Statistiche del nodo */ }
      { stats && (
        <div>
          <h3 className="text-md font-medium">Statistiche</h3>
          { "packets_sent" in stats ? (
            <>
              <p>📩 Pacchetti Inviati: <strong>{ stats.packets_sent }</strong></p>
              <p>❌ Pacchetti Persi: <strong>{ stats.packets_dropped }</strong></p>
            </>
          ) : (
            <>
              <p>📩 Messaggi Inviati: <strong>{ stats.messages_sent }</strong></p>
              <p>📨 Messaggi Ricevuti: <strong>{ stats.messages_received }</strong></p>
              <p>📦 Frammenti Inviati: <strong>{ stats.fragments_sent }</strong></p>
              <p>📦 Frammenti Ricevuti: <strong>{ stats.fragments_received }</strong></p>
              <p>✅ ACKs Inviati: <strong>{ stats.acks_sent }</strong></p>
              <p>✅ ACKs Ricevuti: <strong>{ stats.acks_received }</strong></p>
              <p>❌ NACKs Ricevuti: <strong>{ stats.nacks_received }</strong></p>
            </>
          ) }
        </div>
      ) }
    </div>
  );
};

export default NodeDetails;
