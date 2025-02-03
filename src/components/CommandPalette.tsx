import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandGroup,
  CommandHeader,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { invoke } from "@tauri-apps/api/core";
import {
  FileText,
  HardDrive,
  Loader2,
  MessageSquareText,
  PlayCircle,
  Smile,
  StopCircle,
  User,
  Wifi
} from "lucide-react";

const commandSchemas = {
  start_network: null,
  stop_network: null,
  add_edge: z.object({
    drone_id: z.string().min(1, "Drone ID is required"),
    target_id: z.string().min(1, "Target ID is required"),
  }),
  remove_edge: z.object({
    drone_id: z.string().min(1, "Drone ID is required"),
    target_id: z.string().min(1, "Target ID is required"),
  }),
  set_pdr: z.object({
    drone_id: z.string().min(1, "Drone ID is required"),
    pdr: z
      .string()
      .refine((value) => !isNaN(Number(value)), "PDR must be a number")
      .refine((value) => Number(value) >= 0 && Number(value) <= 100, "PDR must be between 0 and 100"),
  }),
  crash_drone: z.object({
    drone_id: z.string().min(1, "Drone ID is required"),
  }),
  send_packet: z.object({
    sender_id: z
      .string()
      .default("1")
      .refine((val) => !isNaN(Number(val)), "Sender ID must be a number"),
    session_id: z
      .string()
      .default("1")
      .refine((val) => !isNaN(Number(val)), "Session ID must be a number"),
    hops: z
      .string()
      .default("2,3")
      .refine(
        (val) => val.split(",").every((hop) => !isNaN(Number(hop.trim()))),
        "Hops must be a comma-separated list of numbers"
      ),
    hop_index: z
      .string()
      .default("0")
      .refine((val) => !isNaN(Number(val)), "Hop Index must be a number"),
    fragment_index: z
      .string()
      .default("0")
      .refine((val) => !isNaN(Number(val)), "Fragment Index must be a number"),
    total_fragments: z
      .string()
      .default("1")
      .refine((val) => !isNaN(Number(val)), "Total Fragments must be a number"),
    data: z.string().default("Hello world!"),
  }),
  load_config: z.object({
    path: z.string().min(1, "Path is required"),
  }),
  get_config: null,
};

function getDefaultValues(command: keyof typeof commandSchemas | null) {
  if (!command) return {};

  const schema = commandSchemas[command];
  if (!schema) return {};

  // Se non è null, è uno schema Zod
  // Il ".shape" contiene i campi
  const shape = (schema as z.ZodObject<any>)?.shape || {};
  const defaultValues: Record<string, string> = {};

  // Per ogni campo dello schema
  for (const field of Object.keys(shape)) {
    const fieldSchema = shape[field];
    // safeParse(undefined) -> se lo schema ha default, Zod lo userà
    const parsed = fieldSchema.safeParse(undefined);
    if (parsed.success) {
      // Se è stringa o numero, lo convertiamo in stringa
      defaultValues[field] =
        typeof parsed.data === "string"
          ? parsed.data
          : String(parsed.data ?? "");
    } else {
      // Se non è success -> non c'è default -> stringa vuota
      defaultValues[field] = "";
    }
  }

  return defaultValues;
}

const commandGroups = [
  {
    heading: "Network",
    commands: [
      { key: "start_network", label: "Start Network", icon: <Wifi className="mr-2"/> },
      { key: "stop_network", label: "Stop Network", icon: <StopCircle className="mr-2"/> },
    ],
  },
  {
    heading: "Simulation",
    commands: [
      { key: "add_edge", label: "Add Edge", icon: <User className="mr-2"/> },
      { key: "remove_edge", label: "Remove Edge", icon: <User className="mr-2"/> },
      { key: "set_pdr", label: "Set PDR", icon: <Smile className="mr-2"/> },
      { key: "crash_drone", label: "Crash Drone", icon: <PlayCircle className="mr-2"/> },
      { key: "send_packet", label: "Send Packet", icon: <MessageSquareText className="mr-2"/> },
    ],
  },
  {
    heading: "Config",
    commands: [
      { key: "load_config", label: "Load Config", icon: <HardDrive className="mr-2"/> },
      { key: "get_config", label: "Get Config", icon: <FileText className="mr-2"/> },
    ],
  },
];

export function Raycast() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [activeScreen, setActiveScreen] = React.useState<"main" | "params">("main");
  const [selectedCommand, setSelectedCommand] = React.useState<keyof typeof commandSchemas | null>(null);

  const form = useForm({
    resolver: zodResolver(commandSchemas[selectedCommand ?? "add_edge"] ?? z.object({})),
    defaultValues: getDefaultValues(selectedCommand),
    mode: "onSubmit",
  });

  React.useEffect(() => {
    if (selectedCommand) {
      form.reset(getDefaultValues(selectedCommand));
    }
  }, [selectedCommand, form]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const executeCommand = async (data: any) => {
    try {
      setLoading(true);

      switch (selectedCommand) {
        case "start_network":
        case "stop_network":
        case "get_config":
          await invoke(selectedCommand);
          break;
        case "add_edge":
        case "remove_edge":
          await invoke(selectedCommand, {
            droneId: parseInt(data.drone_id, 10),
            target_id: parseInt(data.target_id, 10),
          });
          break;
        case "set_pdr":
          await invoke("send_set_pdr_command", { // FIXME: controllare tutto il file
            droneId: parseInt(data.drone_id, 10),
            pdr: Number(data.pdr), // Converte la stringa in numero
          });
          break;
        case "crash_drone":
          await invoke("send_crash_command", {
            droneId: parseInt(data.drone_id, 10),
          });
          break;
        case "send_packet": {
          await invoke("send_packet", {
            senderId: parseInt(data.sender_id, 10),
            sessionId: parseInt(data.session_id, 10),
            hops: data.hops.split(",").map((hop: string) => parseInt(hop.trim(), 10)),
            hopIndex: parseInt(data.hop_index, 10),
            fragmentIndex: parseInt(data.fragment_index, 10),
            totalFragments: parseInt(data.total_fragments, 10),
            data: data.data,
          });
          break;
        }
        case "load_config":
          await invoke("load_config", { path: data.path });
          break;
        default:
          throw new Error("Unknown command");
      }

      resetState();
    } catch (error) {
      console.error(`Failed to execute ${ selectedCommand }:`, error);
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setOpen(false);
    setActiveScreen("main");
    setSelectedCommand(null);
    form.reset(getDefaultValues(selectedCommand)); // Passa i defaultValues corretti
  };

  const renderParamsForm = () => {
    if (!selectedCommand || !commandSchemas[selectedCommand]) return null;
    // Otteniamo i campi dallo schema
    const shape = (commandSchemas[selectedCommand] as z.ZodObject<any>)?.shape || {};

    return (
      <Form { ...form }>
        <form onSubmit={ form.handleSubmit(executeCommand) } className="space-y-4">
          { Object.keys(shape).map((field) => (
            <FormField
              key={ field }
              control={ form.control }
              name={ field }
              render={ ({ field: formField }) => (
                <FormItem>
                  <FormLabel>
                    { field === "pdr" ? "PDR (%)" : field.replace("_", " ").toUpperCase() }
                  </FormLabel>
                  <FormControl>
                    <Input
                      { ...formField }
                      type={ field === "pdr" || field === "data" || field === "hops" ? "text" : "number" }
                      placeholder={ field === "pdr" ? "Enter PDR (0-100%)" : `Enter ${ field }` }
                    />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              ) }
            />
          )) }
          <Button type="submit" disabled={ loading } className="min-w-[100px]">
            { loading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Execute" }
          </Button>
        </form>
      </Form>
    );
  };

  return (
    <CommandDialog
      open={ open }
      onOpenChange={ (isOpen) => {
        if (!isOpen) resetState();
        setOpen(isOpen);
      } }
    >
      { activeScreen === "main" ? (
        <>
          <CommandInput placeholder="Type a command or search..."/>
          <CommandList>
            { commandGroups.map((group) => (
              <CommandGroup key={ group.heading } heading={ group.heading }>
                { group.commands.map(({ key, label, icon }) => (
                  <CommandItem
                    key={ key }
                    onSelect={ () => {
                      setSelectedCommand(key as keyof typeof commandSchemas);
                      setActiveScreen(
                        commandSchemas[key as keyof typeof commandSchemas] ? "params" : "main"
                      );
                      if (!commandSchemas[key as keyof typeof commandSchemas]) executeCommand({});
                    } }
                  >
                    { icon }
                    { label }
                  </CommandItem>
                )) }
              </CommandGroup>
            )) }
          </CommandList>
        </>
      ) : (
        <>
          <CommandHeader
            title={ selectedCommand?.replace("_", " ").toUpperCase() ?? "" }
            onBack={ () => setActiveScreen("main") }
            onClose={ () => setOpen(false) }
          />
          {/* NB: Mettere la CommandList sistema del tutto il problema delle dimensioni variabili, tuttavia potrebbe stare male */ }
          <CommandList>
            <div className="p-6 overflow-y-auto">{ renderParamsForm() }</div>
          </CommandList>
        </>
      ) }
    </CommandDialog>
  );
}
