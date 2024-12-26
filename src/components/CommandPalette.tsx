import * as React from "react"
import { CloudLightning, CloudOff, HardDrive, PlayCircle, Smile, User, Wifi } from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { invoke } from "@tauri-apps/api/core";


export function CommandDialogDemo() {
  const [open, setOpen] = React.useState(false)
  const [activeScreen, setActiveScreen] = React.useState<'config' | 'network' | 'simulation'>('config')

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Funzione per invocare il comando corrispondente tramite Tauri
  const handleCommand = (command: string, params?: any) => {
    console.log(`Executing command: ${ command }`)
    switch (command) {
      case "load_config":
        invoke('load_config', { path: params.path })
          .then(() => console.log('Config loaded successfully'))
          .catch(err => console.error('Error loading config:', err));
        break;
      case "get_config":
        invoke('get_config', {})
          .then((config: any) => console.log('Config:', config))
          .catch(err => console.error('Error getting config:', err));
        break;
      case "start_network":
        invoke('start_network', {})
          .then(() => console.log('Network started successfully'))
          .catch(err => console.error('Error starting network:', err));
        break;
      case "stop_network":
        invoke('stop_network', {})
          .then(() => console.log('Network stopped successfully'))
          .catch(err => console.error('Error stopping network:', err));
        break;
      case "send_crash_command":
        invoke('send_crash_command', { drone_id: params.drone_id })
          .then(() => console.log('Crash command sent successfully'))
          .catch(err => console.error('Error sending crash command:', err));
        break;
      case "send_set_pdr_command":
        invoke('send_set_pdr_command', { drone_id: params.drone_id, pdr: params.pdr })
          .then(() => console.log('PDR set command sent successfully'))
          .catch(err => console.error('Error setting PDR:', err));
        break;
      case "send_add_sender_command":
        invoke('send_add_sender_command', { drone_id: params.drone_id, target_id: params.target_id })
          .then(() => console.log('Add sender command sent successfully'))
          .catch(err => console.error('Error adding sender:', err));
        break;
      case "send_remove_sender_command":
        invoke('send_remove_sender_command', { drone_id: params.drone_id, target_id: params.target_id })
          .then(() => console.log('Remove sender command sent successfully'))
          .catch(err => console.error('Error removing sender:', err));
        break;
      default:
        console.log("Unknown command.");
    }
  }

  return (
    <>
      {/*<p className="text-sm text-muted-foreground">
        Press{ " " }
        <kbd
          className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>J
        </kbd>
      </p>*/}
      <CommandDialog open={ open } onOpenChange={ setOpen }>
        <CommandInput placeholder="Type a command or search..."/>
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Condizione per la schermata corrente */ }
          { activeScreen === 'config' && (
            <CommandGroup heading="Config Commands">
              <CommandItem onSelect={ () => handleCommand("load_config", { path: "path/to/config.toml" }) }>
                <HardDrive/>
                <span>Load Config</span>
                <CommandShortcut>⌘L</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={ () => handleCommand("get_config", {}) }>
                <CloudLightning/>
                <span>Get Config</span>
                <CommandShortcut>⌘G</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          ) }

          { activeScreen === 'network' && (
            <CommandGroup heading="Network Commands">
              <CommandItem onSelect={ () => handleCommand("start_network", {}) }>
                <Wifi/>
                <span>Start Network</span>
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={ () => handleCommand("stop_network", {}) }>
                <CloudOff/>
                <span>Stop Network</span>
                <CommandShortcut>⌘S</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          ) }

          { activeScreen === 'simulation' && (
            <CommandGroup heading="Simulation Commands">
              <CommandItem onSelect={ () => handleCommand("send_crash_command", { drone_id: 1 }) }>
                <PlayCircle/>
                <span>Send Crash Command</span>
                <CommandShortcut>⌘C</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={ () => handleCommand("send_set_pdr_command", { drone_id: 1, pdr: 5 }) }>
                <Smile/>
                <span>Set PDR</span>
                <CommandShortcut>⌘P</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={ () => handleCommand("send_add_sender_command", { drone_id: 1, target_id: 2 }) }>
                <User/>
                <span>Add Sender</span>
                <CommandShortcut>⌘A</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={ () => handleCommand("send_remove_sender_command", { drone_id: 1, target_id: 2 }) }>
                <User/>
                <span>Remove Sender</span>
                <CommandShortcut>⌘R</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          ) }

          <CommandSeparator/>

          {/* Aggiungi un controllo per cambiare schermata */ }
          <CommandGroup heading="Switch Screens">
            <CommandItem onSelect={ () => setActiveScreen('config') }>
              <HardDrive/>
              <span>Config</span>
            </CommandItem>
            <CommandItem onSelect={ () => setActiveScreen('network') }>
              <Wifi/>
              <span>Network</span>
            </CommandItem>
            <CommandItem onSelect={ () => setActiveScreen('simulation') }>
              <Smile/>
              <span>Simulation</span>
            </CommandItem>
          </CommandGroup>

        </CommandList>
      </CommandDialog>
    </>
  )
}
