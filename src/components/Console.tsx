import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export const Console = () => {
  const [messages, setMessages] = useState<{ type: string; packet: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchAndDisplayMessages = async () => {
    try {
      const response = await invoke<{ messages: { type: string; packet: string }[] }>("get_received_messages");
      const newMessages = response.messages.filter(
        (message) => !messages.some((msg) => msg.packet === message.packet)
      );

      if (newMessages.length > 0) {
        setMessages((prevMessages) => [...prevMessages, ...newMessages]);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchAndDisplayMessages, 5000); // Fetch messages every 5 seconds
    return () => clearInterval(interval);
  }, [messages]);

  // Scroll automatico all'ultimo messaggio
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Funzione per colorare i tipi di messaggio
  const getMessageColor = (type: string) => {
    switch (type) {
      case "INFO":
        return "text-blue-400";
      case "WARN":
        return "text-yellow-400";
      case "ERROR":
        return "text-red-400";
      case "SUCCESS":
        return "text-green-400";
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
