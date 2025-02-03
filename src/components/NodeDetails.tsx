import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NodeDetailsProps {
  nodeId: string;
  onClose: () => void;
  refreshGraph: () => void;
}

const NodeDetails = ({ nodeId, onClose, refreshGraph }: NodeDetailsProps) => {
  const [nodeType, setNodeType] = useState<string | null>(null);
  const [neighbors, setNeighbors] = useState<string[]>([]);
  const [pdr, setPdr] = useState<number | null>(null);
  const [stats, setStats] = useState<{ packetsSent: number; packetsDropped: number } | null>(null);
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
        }
        setStats({
          packetsSent: response.packets_sent ?? 0,
          packetsDropped: response.packets_dropped ?? 0,
        });
      } catch (error) {
        console.error("Errore nel recupero dei dettagli:", error);
      }
    };

    fetchNodeDetails();
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
      <div>
        <h3 className="text-md font-medium">Statistiche</h3>
        <p>Pacchetti inviati: <strong>{ stats?.packetsSent ?? 0 }</strong></p>
        <p>Pacchetti persi: <strong>{ stats?.packetsDropped ?? 0 }</strong></p>
      </div>
    </div>
  );
};

export default NodeDetails;
