import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Message {
  type: string;
  packet: string;
}

export const Console = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Funzione per ottenere i messaggi dal backend
  const fetchAndDisplayMessages = async () => {
    try {
      const response = await invoke<{ messages: Message[] }>("get_received_messages");
      // Se il backend restituisce la lista completa dei messaggi,
      // possiamo aggiornare lo stato direttamente.
      setMessages(response.messages);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  // Effettua il primo fetch e imposta il polling ogni 5 secondi
  useEffect(() => {
    fetchAndDisplayMessages(); // fetch iniziale
    const interval = setInterval(fetchAndDisplayMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  // Scorrimento automatico all'ultimo messaggio
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  return (
    <div className="bg-gray-900 text-gray-200 p-4 w-full h-full rounded-lg shadow-lg flex flex-col">
      <div>
        <h2 className="text-sm font-semibold text-gray-100 mb-2">📡 Simulation Console</h2>
      </div>

      <div className="h-full overflow-y-auto bg-gray-800 rounded-md p-3 border border-gray-700 shadow-inner">
        { messages.length === 0 ? (
          <p className="text-gray-500 text-center">Nessun messaggio ricevuto...</p>
        ) : (
          messages.map((message, index) => (
            <div key={ index } className={ `message text-sm py-1 ${ getMessageColor(message.type) }` }>
              <span className="font-bold">[{ message.type }]</span> { message.packet }
            </div>
          ))
        ) }
        <div ref={ messagesEndRef }/>
      </div>
    </div>
  );
};
