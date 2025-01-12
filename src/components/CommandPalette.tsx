import * as React from "react";
import { FileText, HardDrive, Loader2, PlayCircle, Smile, StopCircle, User, Wifi, } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandHeader,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Raycast() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [activeScreen, setActiveScreen] = React.useState<"main" | "params">(
    "main"
  );
  const [selectedCommand, setSelectedCommand] = React.useState<string | null>(
    null
  );
  const [params, setParams] = React.useState({
    drone_id: "",
    target_id: "",
    pdr: "",
    path: "",
  });

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const executeCommand = async (cmd?: string) => {
    try {
      setLoading(true);
      // Use the passed command or fall back to selectedCommand
      const commandToExecute = cmd ?? selectedCommand;
      
      if (!commandToExecute) {
        console.error("No command selected");
        return;
      }

      switch (commandToExecute) {
        case "start_network":
        case "stop_network":
        case "get_config":
          await invoke(commandToExecute);
          break;

        case "add_edge":
          await invoke("send_add_sender_command", {
            drone_id: parseInt(params.drone_id, 10),
            target_id: parseInt(params.target_id, 10),
          });
          break;

        case "remove_edge":
          await invoke("send_remove_sender_command", {
            drone_id: parseInt(params.drone_id, 10),
            target_id: parseInt(params.target_id, 10),
          });
          break;

        case "set_pdr":
          await invoke("send_set_pdr_command", {
            drone_id: parseInt(params.drone_id, 10),
            pdr: parseFloat(params.pdr),
          });
          break;

        case "crash_drone":
          await invoke("send_crash_command", {
            drone_id: parseInt(params.drone_id, 10),
          });
          break;

        case "load_config":
          await invoke("load_config", { path: params.path });
          break;

        default:
          throw new Error("Unknown command");
      }

      setOpen(false);
      setActiveScreen("main");
      setSelectedCommand(null);
    } catch (error) {
      console.error(`Failed to execute ${cmd ?? selectedCommand}:`, error);
    } finally {
      setLoading(false);
      setParams({
        drone_id: "",
        target_id: "",
        pdr: "",
        path: "",
      });
    }
  };

  const renderParamsForm = () => {
    switch (selectedCommand) {
      case "add_edge":
      case "remove_edge":
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="drone_id">Drone ID</Label>
              <Input
                id="drone_id"
                type="number"
                value={ params.drone_id }
                onChange={ (e) =>
                  setParams({ ...params, drone_id: e.target.value })
                }
                placeholder="Enter drone ID"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target_id">Target ID</Label>
              <Input
                id="target_id"
                type="number"
                value={ params.target_id }
                onChange={ (e) =>
                  setParams({ ...params, target_id: e.target.value })
                }
                placeholder="Enter target ID"
              />
            </div>
          </div>
        );

      case "set_pdr":
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="drone_id">Drone ID</Label>
              <Input
                id="drone_id"
                type="number"
                value={ params.drone_id }
                onChange={ (e) =>
                  setParams({ ...params, drone_id: e.target.value })
                }
                placeholder="Enter drone ID"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pdr">PDR</Label>
              <Input
                id="pdr"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={ params.pdr }
                onChange={ (e) => setParams({ ...params, pdr: e.target.value }) }
                placeholder="Enter PDR (0-1)"
              />
            </div>
          </div>
        );

      case "crash_drone":
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="drone_id">Drone ID</Label>
              <Input
                id="drone_id"
                type="number"
                value={ params.drone_id }
                onChange={ (e) =>
                  setParams({ ...params, drone_id: e.target.value })
                }
                placeholder="Enter drone ID"
              />
            </div>
          </div>
        );

      case "load_config":
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="path">Config Path</Label>
              <Input
                id="path"
                type="text"
                value={ params.path }
                onChange={ (e) => setParams({ ...params, path: e.target.value }) }
                placeholder="Enter config path"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <CommandDialog
      open={ open }
      onOpenChange={ (open) => {
        setOpen(open);
        if (!open) {
          setActiveScreen("main");
          setSelectedCommand(null);
          setParams({
            drone_id: "",
            target_id: "",
            pdr: "",
            path: "",
          });
        }
      } }
    >
      { activeScreen === "main" ? (
        <>
          <CommandInput placeholder="Type a command or search..."/>
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Network">
              <CommandItem
                onSelect={ () => {
                  setSelectedCommand("start_network");
                  executeCommand("start_network");
                } }
              >
                <Wifi className="mr-2"/>
                Start Network
              </CommandItem>
              <CommandItem
                onSelect={ () => {
                  setSelectedCommand("stop_network");
                  executeCommand("stop_network");
                } }
              >
                <StopCircle className="mr-2"/>
                Stop Network
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Simulation">
              <CommandItem
                onSelect={ () => {
                  setSelectedCommand("add_edge");
                  setActiveScreen("params");
                } }
              >
                <User className="mr-2"/>
                Add Edge
              </CommandItem>
              <CommandItem
                onSelect={ () => {
                  setSelectedCommand("remove_edge");
                  setActiveScreen("params");
                } }
              >
                <User/>
                Remove Edge
              </CommandItem>
              <CommandItem
                onSelect={ () => {
                  setSelectedCommand("set_pdr");
                  setActiveScreen("params");
                } }
              >
                <Smile/>
                Set PDR
              </CommandItem>
              <CommandItem
                onSelect={ () => {
                  setSelectedCommand("crash_drone");
                  setActiveScreen("params");
                } }
              >
                <PlayCircle/>
                Crash Drone
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Config">
              <CommandItem
                onSelect={ () => {
                  setSelectedCommand("load_config");
                  setActiveScreen("params");
                } }
              >
                <HardDrive/>
                Load Config
              </CommandItem>
              <CommandItem
                onSelect={ () => {
                  setSelectedCommand("get_config");
                  executeCommand("get_config");
                } }
              >
                <FileText/>
                Get Config
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </>
      ) : (
        <div className="flex flex-col h-full">
          <CommandHeader
            title={ (selectedCommand ?? "")
              .split("_")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ") }
            onBack={ () => setActiveScreen("main") }
            onClose={ () => setOpen(false) }
          />
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">{ renderParamsForm() }</div>
          </div>
          <div className="flex justify-end p-4 border-t">
            <Button
              onClick={() => executeCommand()}
              disabled={loading}
              className="min-w-[100px]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Execute"
              )}
            </Button>
          </div>
        </div>
      ) }
    </CommandDialog>
  );
}
