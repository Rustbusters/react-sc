import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowDownToLine } from "lucide-react";

interface Message {
  type: string;
  node: number;
  packet: string;
}

export const Logs = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [nodeFilter, setNodeFilter] = useState<string>("");
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);

  const logsContainerRef = useRef<HTMLDivElement | null>(null);

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
    }
  }, [messages]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    setIsAtBottom(target.scrollTop + target.clientHeight >= target.scrollHeight - 10);
  };

  const scrollToBottom = () => {
    logsContainerRef.current?.scrollTo({ top: logsContainerRef.current.scrollHeight, behavior: "smooth" });
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case "PacketSent":
        return "text-green-600 font-semibold";
      case "PacketDropped":
        return "text-red-500 font-semibold";
      case "ControllerShortcut":
        return "text-blue-500 font-semibold";
      default:
        return "text-gray-700";
    }
  };

  const parseNodeFilter = (filter: string): Set<number> => {
    return new Set(
      filter
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id !== "" && !isNaN(Number(id)))
        .map(Number)
    );
  };

  const filteredMessages = useMemo(() => {
    if (!nodeFilter) return messages;

    const nodeSet = parseNodeFilter(nodeFilter);
    return messages.filter((msg) => nodeSet.has(msg.node));
  }, [nodeFilter, messages]);

  return (
    <div className="h-full overflow-hidden w-full flex flex-col p-4 bg-background">
      {/* Header e Filtro */ }
      <div className="flex items-center justify-between pb-2 border-b">
        <h2 className="text-2xl font-semibold">Logs</h2>

        {/* Filtro per Drone */ }
        <div className="flex items-center gap-2">
          <Label htmlFor="nodeFilter" className="text-muted-foreground text-sm">
            Filtra per Drone:
          </Label>
          <Input
            id="nodeFilter"
            type="text"
            placeholder="ID (Es. 1, 2)"
            value={ nodeFilter }
            onChange={ (e) => setNodeFilter(e.target.value) }
            className="w-36 h-8 text-sm"
          />
        </div>
      </div>

      {/* Lista Messaggi */ }
      <div
        ref={ logsContainerRef }
        onScroll={ handleScroll }
        className="flex-1 overflow-hidden overflow-y-auto font-mono text-sm p-3 bg-muted rounded-lg border mt-2"
      >
        { filteredMessages.length === 0 ? (
          <p className="text-muted-foreground text-center">Nessun messaggio ricevuto...</p>
        ) : (
          filteredMessages.map((message, index) => (
            <div key={ index } className={ `py-1 text-xs ${ getMessageColor(message.type) }` }>
              <span className="text-blue-600">
                [{ message.type.startsWith("HostEvent") ? "Host" : "Drone" }: { message.node }]
              </span>
              <span className="ml-2 font-semibold">[{ message.type }]</span>
              <span className="ml-2 text-foreground">{ message.packet }</span>
            </div>
          ))
        ) }
      </div>

      {/* Bottone per Scroll in basso */ }
      { !isAtBottom && (
        <Button
          onClick={ scrollToBottom }
          className="fixed bottom-10 right-10 shadow-lg"
          variant="outline"
        >
          <ArrowDownToLine size={ 20 }/>
        </Button>
      ) }
    </div>
  );
};

export default Logs;
