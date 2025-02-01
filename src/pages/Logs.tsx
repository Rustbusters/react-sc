import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  type: string;
  packet: string;
}

export const Logs = () => {
  // Stato per tutti i messaggi ricevuti
  const [messages, setMessages] = useState<Message[]>([]);
  // Stato per il filtro per nodo (stringa inserita dall'utente, ad es. "1")
  const [nodeFilter, setNodeFilter] = useState<string>("");
  // Stato per attivare/disattivare la modalità split
  const [isSplit, setIsSplit] = useState<boolean>(false);

  // Refs per lo scroll automatico delle console
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const filteredLogsEndRef = useRef<HTMLDivElement | null>(null);

  // Funzione per ottenere i messaggi dal backend Tauri
  const fetchAndDisplayMessages = async () => {
    try {
      const response = await invoke<{ messages: Message[] }>("get_received_messages");
      setMessages(response.messages);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  // Effettua il fetch iniziale e poi ogni 5 secondi
  useEffect(() => {
    fetchAndDisplayMessages();
    const interval = setInterval(fetchAndDisplayMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  // Effettua lo scroll automatico all'ultimo messaggio (in base alla modalità)
  useEffect(() => {
    if (!isSplit) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      filteredLogsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSplit]);

  // Funzione per assegnare il colore in base al tipo di messaggio
  const getMessageColor = (type: string) => {
    switch (type) {
      case "PacketSent":
        return "text-green-400";
      case "PacketDropped":
        return "text-red-400";
      case "ControllerShortcut":
        return "text-blue-400";
      default:
        return "text-gray-300";
    }
  };

  // Se è stato impostato un filtro, otteniamo i messaggi che lo rispettano
  const filteredMessages = nodeFilter
    ? messages.filter((msg) =>
      msg.packet.toLowerCase().includes(nodeFilter.toLowerCase())
    )
    : [];

  // In modalità "unsplit", se è stato inserito un filtro mostriamo solo i messaggi filtrati;
  // altrimenti mostriamo tutti i messaggi.
  const displayedMessages = !isSplit && nodeFilter ? filteredMessages : messages;

  return (
    <div className="p-6 w-full h-full">
      {/* Header */}
      <h2 className="text-2xl font-bold mb-4">Logs</h2>

      {/* Toolbar di controllo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="nodeFilter" className="text-sm font-medium text-gray-300">
            Filtra per Node:
          </label>
          <Input
            id="nodeFilter"
            type="text"
            placeholder="Es. 1"
            value={nodeFilter}
            onChange={(e) => setNodeFilter(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <Button onClick={() => setIsSplit(!isSplit)}>
          {isSplit ? "Unsplit Console" : "Split Console"}
        </Button>
      </div>

      {/* Visualizzazione console */}
      { !isSplit ? (
        // Modalità unsplit: singolo pannello (se il filtro è impostato, vengono mostrati solo i messaggi filtrati)
        <div className="bg-gray-800 rounded-md p-3 border border-gray-700 shadow-inner h-[400px] overflow-y-auto">
          {displayedMessages.length === 0 ? (
            <p className="text-gray-500 text-center">Nessun messaggio ricevuto...</p>
          ) : (
            displayedMessages.map((message, index) => (
              <div key={index} className={`message text-sm py-1 ${getMessageColor(message.type)}`}>
                <span className="font-bold">[{message.type}]</span> {message.packet}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      ) : (
        // Modalità split: due pannelli, uno per "All Logs" e uno per "Filtered Logs"
        <div className="flex flex-col gap-4">
          {/* Pannello "All Logs" */}
          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">All Logs</h3>
            <div className="bg-gray-800 rounded-md p-3 border border-gray-700 shadow-inner h-[200px] overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center">Nessun messaggio ricevuto...</p>
              ) : (
                messages.map((message, index) => (
                  <div key={index} className={`message text-sm py-1 ${getMessageColor(message.type)}`}>
                    <span className="font-bold">[{message.type}]</span> {message.packet}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
          {/* Pannello "Filtered Logs" */}
          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">
              Filtered Logs {nodeFilter && `(Node: ${nodeFilter})`}
            </h3>
            <div className="bg-gray-800 rounded-md p-3 border border-gray-700 shadow-inner h-[200px] overflow-y-auto">
              {filteredMessages.length === 0 ? (
                <p className="text-gray-500 text-center">
                  {nodeFilter
                    ? "Nessun messaggio per il nodo selezionato."
                    : "Imposta un filtro per visualizzare log specifici."}
                </p>
              ) : (
                filteredMessages.map((message, index) => (
                  <div key={index} className={`message text-sm py-1 ${getMessageColor(message.type)}`}>
                    <span className="font-bold">[{message.type}]</span> {message.packet}
                  </div>
                ))
              )}
              <div ref={filteredLogsEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logs;