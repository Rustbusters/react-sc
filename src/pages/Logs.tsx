import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownToLine } from "lucide-react";

interface Message {
  type: string;
  node: number;
  packet: string;
}

export const Logs = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [nodeFilter, setNodeFilter] = useState<string>("");
  const [isSplit, setIsSplit] = useState<boolean>(false);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);

  const logsContainerRef = useRef<HTMLDivElement | null>(null);
  const filteredLogsContainerRef = useRef<HTMLDivElement | null>(null);

  const fetchAndDisplayMessages = async () => {
    try {
      const response = await invoke<{ messages: Message[] }>("get_received_messages");
      setMessages(response.messages);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  useEffect(() => {
    fetchAndDisplayMessages();
    const interval = setInterval(fetchAndDisplayMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      logsContainerRef.current?.scrollTo({ top: logsContainerRef.current.scrollHeight, behavior: "smooth" });
      filteredLogsContainerRef.current?.scrollTo({
        top: filteredLogsContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isSplit]);

  // Funzione per monitorare lo scroll e aggiornare lo stato
  const handleScroll = (ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current) return;
    const { scrollTop, scrollHeight, clientHeight } = ref.current;
    setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
  };

  const scrollToBottom = () => {
    logsContainerRef.current?.scrollTo({ top: logsContainerRef.current.scrollHeight, behavior: "smooth" });
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case "PacketSent":
        return "text-black font-semibold";
      case "PacketDropped":
        return "text-red-500 font-semibold";
      case "ControllerShortcut":
        return "text-blue-500 font-semibold";
      default:
        return "text-gray-700";
    }
  };

  const filteredMessages = nodeFilter
    ? messages.filter((msg) => msg.node.toString().includes(nodeFilter))
    : [];

  const displayedMessages = !isSplit && nodeFilter ? filteredMessages : messages;

  return (
    <div className="p-6 w-full h-full">
      <h2 className="text-2xl font-bold">Logs</h2>

      <div className="py-2 flex flex-wrap items-center justify-between gap-3 border-b-2 border-gray-200 mb-2">
        <div className="flex items-center gap-2">
          <label htmlFor="nodeFilter" className="text-md font-medium text-black">
            Filtra per Drone:
          </label>
          <Input
            id="nodeFilter"
            type="text"
            placeholder="Inserisci ID Drone (Es. 1)"
            value={ nodeFilter }
            onChange={ (e) => setNodeFilter(e.target.value) }
            className="border border-gray-400 rounded-lg px-3 py-2 text-black w-40"
          />
          { nodeFilter && (
            <Button onClick={ () => setNodeFilter("") } className="ml-2">
              ❌ Reset
            </Button>
          ) }
        </div>
        <Button onClick={ () => setIsSplit(!isSplit) }>
          { isSplit ? "Unsplit Console" : "Split Console" }
        </Button>
      </div>

      { isSplit ? (
        <div className="flex flex-col gap-4 relative">
          {/* Sezione: Tutti i Log */ }
          <div>
            <h3 className="text-lg font-semibold text-black mb-2">Tutti i Log</h3>
            <div
              ref={ logsContainerRef }
              onScroll={ () => handleScroll(logsContainerRef) }
              className="h-[250px] p-4 overflow-y-auto font-mono text-sm border border-gray-300 rounded-md shadow-md"
            >
              { messages.length === 0 ? (
                <p className="text-gray-500 text-center">Nessun messaggio ricevuto...</p>
              ) : (
                messages.map((message, index) => (
                  <div key={ index } className={ `py-2 border-b border-gray-200 ${ getMessageColor(message.type) }` }>
                    <span
                      className="ml-2 text-blue-600">[{ message.type.startsWith("HostEvent") ? "Host" : "Drone" }: { message.node }]</span>
                    <span className="font-bold">[{ message.type }]</span>
                    <span className="ml-2">{ message.packet }</span>
                  </div>
                ))
              ) }
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-black mb-2">
              Log Filtrati { nodeFilter && `(Drone: ${ nodeFilter })` }
            </h3>
            <div
              ref={ filteredLogsContainerRef }
              onScroll={ () => handleScroll(filteredLogsContainerRef) }
              className="h-[250px] p-4 overflow-y-auto font-mono text-sm border border-gray-300 rounded-md shadow-md"
            >
              { filteredMessages.length === 0 ? (
                <p className="text-gray-500 text-center">
                  { nodeFilter
                    ? "Nessun messaggio per il drone selezionato."
                    : "Imposta un filtro per visualizzare log specifici." }
                </p>
              ) : (
                filteredMessages.map((message, index) => (
                  <div key={ index } className={ `py-2 border-b border-gray-200 ${ getMessageColor(message.type) }` }>
                    <span className="font-bold">[{ message.type }]</span>
                    <span className="ml-2 text-blue-600">[Drone: { message.node }]</span>
                    <span className="ml-2">{ message.packet }</span>
                  </div>
                ))
              ) }
            </div>
          </div>

          {/* Bottone per scrollare in basso in modalità split */ }
          { !isAtBottom && (
            <Button
              onClick={ scrollToBottom }
              className="fixed bottom-10 right-10"
              variant="outline"
            >
              <ArrowDownToLine/>
            </Button>
          ) }
        </div>
      ) : (
        <div
          ref={ logsContainerRef }
          onScroll={ () => handleScroll(logsContainerRef) }
          className="h-full py-4 overflow-y-auto font-mono text-sm"
        >
          { displayedMessages.length === 0 ? (
            <p className="text-gray-500 text-center">Nessun messaggio ricevuto...</p>
          ) : (
            displayedMessages.map((message, index) => (
              <div key={ index } className={ `py-1 ${ getMessageColor(message.type) }` }>
                <span
                  className="text-blue-600">[{ message.type.startsWith("HostEvent") ? "Host" : "Drone" }: { message.node }]</span>
                <span className="ml-2 font-semibold">[{ message.type }]</span>
                <span className="ml-2 text-slate-600">{ message.packet }</span>
              </div>
            ))
          ) }

          {/* Bottone per scrollare in basso */ }
          { !isAtBottom && (
            <Button
              onClick={ scrollToBottom }
              className="fixed bottom-10 right-10"
              variant="outline"
            >
              <ArrowDownToLine/>
            </Button>
          ) }
        </div>
      ) }
    </div>
  );
};

export default Logs;
