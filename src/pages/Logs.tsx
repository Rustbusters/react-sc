import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowDownToLine, X } from "lucide-react";

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

  const filteredMessages = nodeFilter
    ? messages.filter((msg) => msg.node.toString().includes(nodeFilter))
    : messages;

  return (
    <div className="h-screen w-full flex flex-col p-6 bg-background space-y-4">
      {/* Sezione Filtri */ }
      <Card className="p-4 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Filtri</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Label htmlFor="nodeFilter" className="text-muted-foreground">
            Filtra per Drone:
          </Label>
          <Input
            id="nodeFilter"
            type="text"
            placeholder="ID Drone (Es. 1)"
            value={ nodeFilter }
            onChange={ (e) => setNodeFilter(e.target.value) }
            className="w-32"
          />
          { nodeFilter && (
            <Button variant="outline" size="icon" onClick={ () => setNodeFilter("") }>
              <X size={ 18 }/>
            </Button>
          ) }
        </CardContent>
      </Card>

      {/* Sezione Logs */ }
      <Card className="flex-1 overflow-hidden shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Messaggi</CardTitle>
        </CardHeader>
        <CardContent
          ref={ logsContainerRef }
          onScroll={ handleScroll }
          className="h-full overflow-y-auto font-mono text-sm p-3 border rounded-lg bg-muted"
        >
          { filteredMessages.length === 0 ? (
            <p className="text-muted-foreground text-center">Nessun messaggio ricevuto...</p>
          ) : (
            filteredMessages.map((message, index) => (
              <div key={ index } className={ `py-1 border-b border-gray-200 ${ getMessageColor(message.type) }` }>
                <span className="text-blue-600">
                  [{ message.type.startsWith("HostEvent") ? "Host" : "Drone" }: { message.node }]
                </span>
                <span className="ml-2 font-semibold">[{ message.type }]</span>
                <span className="ml-2 text-foreground">{ message.packet }</span>
              </div>
            ))
          ) }
        </CardContent>
      </Card>

      {/* Bottone per Scroll in basso */ }
      { !isAtBottom && (
        <Button
          onClick={ scrollToBottom }
          className="fixed bottom-10 right-10 shadow-lg animate-bounce"
          variant="outline"
        >
          <ArrowDownToLine size={ 20 }/>
        </Button>
      ) }
    </div>
  );
};

export default Logs;
