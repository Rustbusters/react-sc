import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: number;
  event_type: "PacketSent" | "PacketDropped" | "ControllerShortcut" | "HostMessageSent";
  node: number;
  node_type: "Host" | "Drone"; // Node Type (New Field)
  packet: string;
}

export const Logs = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastMessageId, setLastMessageId] = useState<number>(0);
  const [nodeFilter, setNodeFilter] = useState<string>("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all"); // Default: All event types
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>("all"); // Default: All nodes (Host/Drone)
  const [maxMessages, setMaxMessages] = useState<number>(parseInt(localStorage.getItem("maxMessages") || "1000", 10));
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const logsContainerRef = useRef<HTMLDivElement | null>(null);

  // Fetch messages from the backend
  const fetchAndDisplayMessages = async () => {
    try {
      const response = await invoke<Message[]>("get_new_messages", {
        lastId: lastMessageId,
        maxMessages: maxMessages,
      });

      if (!Array.isArray(response)) {
        toast.error("Invalid response format: expected an array");
        return;
      }

      if (response.length > 0) {
        setMessages((prev) => {
          const newMessages = [...prev, ...response];

          // Keep only the latest MAX_MESSAGES messages
          return newMessages.length > maxMessages
            ? newMessages.slice(newMessages.length - maxMessages)
            : newMessages;
        });

        // Update last received message ID
        setLastMessageId(response[response.length - 1].id);
      }
    } catch (error) {
      toast.error("Failed to fetch messages. Please check the backend.");
      setError("Failed to fetch messages. Please check the backend.");
    }
  };

  useEffect(() => {
    fetchAndDisplayMessages();
    const interval = setInterval(fetchAndDisplayMessages, 5000);
    return () => clearInterval(interval);
  }, [lastMessageId]);

  useEffect(() => {
    const handleStorageChange = () => {
      setMaxMessages(parseInt(localStorage.getItem("maxMessages") || "1000", 10));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);


  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (isAtBottom) {
      logsContainerRef.current?.scrollTo({ top: logsContainerRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  // Handle scrolling behavior
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    setIsAtBottom(target.scrollTop + target.clientHeight >= target.scrollHeight - 10);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    logsContainerRef.current?.scrollTo({ top: logsContainerRef.current.scrollHeight, behavior: "smooth" });
  };

  // Assign colors based on event types
  const getMessageColor = (type: string) => {
    switch (type) {
      case "PacketSent":
        return "text-green-600";
      case "PacketDropped":
        return "text-red-500";
      case "ControllerShortcut":
        return "text-blue-500";
      default:
        return "text-gray-700";
    }
  };

  // Parse the node filter (e.g., "1,2,3" -> Set {1,2,3})
  const parseNodeFilter = (filter: string): Set<number> => {
    return new Set(
      filter
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id !== "" && !isNaN(Number(id)))
        .map(Number)
    );
  };

  // Apply filters (Node ID, Event Type, Node Type)
  const filteredMessages = useMemo(() => {
    let result = messages;

    if (nodeFilter) {
      const nodeSet = parseNodeFilter(nodeFilter);
      result = result.filter((msg) => nodeSet.has(msg.node));
    }

    if (eventTypeFilter !== "all") {
      result = result.filter((msg) => msg.event_type === eventTypeFilter);
    }

    if (nodeTypeFilter !== "all") {
      result = result.filter((msg) => msg.node_type === nodeTypeFilter);
    }

    return result;
  }, [nodeFilter, eventTypeFilter, nodeTypeFilter, messages]);

  return (
    <div className="h-full overflow-hidden w-full flex flex-col p-4 pt-1 bg-background">
      {/* Header and Filters */ }
      <div className="flex items-center justify-between pb-2 border-b">
        <h2 className="text-2xl font-semibold">Logs</h2>

        {/* Filters */ }
        <div className="flex items-center gap-4">
          {/* Node Filter */ }
          <div className="flex items-center gap-2">
            <Label htmlFor="nodeFilter" className="text-muted-foreground text-sm">Filter by Node:</Label>
            <Input
              id="nodeFilter"
              type="text"
              placeholder="ID (e.g., 1, 2)"
              value={ nodeFilter }
              onChange={ (e) => setNodeFilter(e.target.value) }
              className="w-36 h-8 text-sm"
            />
          </div>

          {/* Event Type Filter */ }
          <div className="flex items-center gap-2">
            <Label htmlFor="eventTypeFilter" className="text-muted-foreground text-sm">Filter by Type:</Label>
            <Select value={ eventTypeFilter } onValueChange={ setEventTypeFilter }>
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue placeholder="Select event type"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="PacketSent">Packet Sent</SelectItem>
                <SelectItem value="PacketDropped">Packet Dropped</SelectItem>
                <SelectItem value="ControllerShortcut">Controller Shortcut</SelectItem>
                <SelectItem value="HostMessageSent">Host Message Sent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Node Type Filter */ }
          <div className="flex items-center gap-2">
            <Label htmlFor="nodeTypeFilter" className="text-muted-foreground text-sm">Filter by Node Type:</Label>
            <Select value={ nodeTypeFilter } onValueChange={ setNodeTypeFilter }>
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue placeholder="Select node type"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Drone">Drone</SelectItem>
                <SelectItem value="Host">Host</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Message List */ }
      <div ref={ logsContainerRef } onScroll={ handleScroll }
           className="flex-1 overflow-hidden overflow-y-auto font-mono text-sm p-3 bg-muted rounded-lg border mt-2">
        { error ? (
          <p className="text-red-500 text-center">{ error }</p>
        ) : filteredMessages.length === 0 ? (
          <p className="text-muted-foreground text-center">No messages received...</p>
        ) : (
          filteredMessages.map((message, index) => (
            <div key={ `${ message.id }-${ index }` }
                 className={ `py-1 text-xs ${ getMessageColor(message.event_type) }` }>
              <span className="text-blue-600">[{ message.node_type }: { message.node }]</span>
              <span className="ml-2 font-semibold">[{ message.event_type }]</span>
              <span className="ml-2 text-foreground">{ message.packet }</span>
            </div>
          ))
        ) }
      </div>

      {/* Scroll to Bottom Button */ }
      { !isAtBottom && (
        <Button onClick={ scrollToBottom } className="fixed bottom-10 right-10 shadow-lg" variant="outline">
          <ArrowDownToLine size={ 20 }/>
        </Button>
      ) }
    </div>
  );
};

export default Logs;
