import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface NetworkEditorProps {
  selectedNode: string | null;
  onClose: () => void;
  onUpdateGraph: () => void;
}

const NetworkEditor = ({ selectedNode, onClose, onUpdateGraph }: NetworkEditorProps) => {
  const [pdr, setPdr] = useState<number | null>(null);
  const [connections, setConnections] = useState<string[]>([]);
  const [isCrashed, setIsCrashed] = useState<boolean>(false);

  useEffect(() => {
    if (selectedNode) {
      fetchNodeData(selectedNode);
    }
  }, [selectedNode]);

  const fetchNodeData = async (nodeId: string) => {
    try {
      const response = await invoke<{ pdr?: number; connections: string[] }>(
        "get_node_info",
        { node_id: nodeId }
      );
      setPdr(response.pdr || null);
      setConnections(response.connections);
    } catch (error) {
      console.error("Errore nel recupero dati nodo:", error);
    }
  };

  const handleUpdatePDR = async () => {
    if (pdr !== null) {
      try {
        await invoke("set_packet_drop_rate", { node_id: selectedNode, pdr });
        onUpdateGraph();
      } catch (error) {
        console.error("Errore aggiornamento PDR:", error);
      }
    }
  };

  const handleCrashNode = async () => {
    try {
      await invoke("crash_node", { node_id: selectedNode });
      setIsCrashed(true);
      onUpdateGraph();
    } catch (error) {
      console.error("Errore nel crash del nodo:", error);
    }
  };

  const handleAddConnection = async (newNodeId: string) => {
    try {
      await invoke("add_connection", { node_id: selectedNode, target_id: newNodeId });
      setConnections([...connections, newNodeId]);
      onUpdateGraph();
    } catch (error) {
      console.error("Errore aggiunta connessione:", error);
    }
  };

  const handleRemoveConnection = async (targetId: string) => {
    try {
      await invoke("remove_connection", { nodeId: selectedNode, targetId });
      setConnections(connections.filter(id => id !== targetId));
      onUpdateGraph();
    } catch (error) {
      console.error("Errore rimozione connessione:", error);
    }
  };

  if (!selectedNode) return null;

  return (
    <div className="absolute right-0 top-0 w-80 h-full bg-white shadow-md p-4">
      <h2 className="text-xl font-bold">Modifica Nodo { selectedNode }</h2>

      <div className="mt-4">
        <label className="block font-medium">Packet Drop Rate (PDR)</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          max="1"
          value={ pdr !== null ? pdr.toString() : "" }
          onChange={ (e) => setPdr(parseFloat(e.target.value)) }
        />
        <Button onClick={ handleUpdatePDR } className="mt-2">Aggiorna PDR</Button>
      </div>

      <div className="mt-4">
        <label className="block font-medium">Connessioni</label>
        { connections.map((conn) => (
          <div key={ conn } className="flex justify-between items-center">
            <span>{ conn }</span>
            <Button onClick={ () => handleRemoveConnection(conn) } variant="outline">❌</Button>
          </div>
        )) }
        <Input
          type="text"
          placeholder="ID Nodo"
          onKeyDown={ (e) => {
            if (e.key === "Enter") handleAddConnection(e.currentTarget.value);
          } }
        />
      </div>

      <div className="mt-4">
        <label className="block font-medium">Crash Nodo</label>
        <Switch checked={ isCrashed } onCheckedChange={ handleCrashNode }/>
      </div>

      <Button onClick={ onClose } className="mt-4">Chiudi</Button>
    </div>
  );
};

export default NetworkEditor;
