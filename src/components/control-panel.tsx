'use client';

import { FileSliders, Pause, Play, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import { invoke } from '@tauri-apps/api/core'
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

const ControlPanel = React.memo(() => {
  const [networkInitialized, setNetworkInitialized] = React.useState(false);
  const [networkRunning, setNetworkRunning] = React.useState(false);
  const [droneId, setDroneId] = React.useState('');

  const loadConfig = async () => {
    try {
      const path = "/Users/riccardobenevelli/Desktop/UNITN/ADVANCED/Rustbusters/sc-tauri/input.toml";
      console.log("Loading config from:", path);
      await invoke('load_config', { path });

      alert("Config loaded successfully!");
      setNetworkInitialized(true);
    } catch (error) {
      console.error("Failed to load config:", error);
      toast.error("Failed to load config. Check the console for more details.");
      alert("Failed to load config. Check the console for more details.");
    }
  };

  const startNetwork = async () => {
    try {
      await invoke('start_network');

      alert("Network started successfully!");
      setNetworkRunning(true);
    } catch (error) {
      console.error("Failed to start network:", error);
      toast.error("Failed to start network. Check the console for more details.");
      alert("Failed to start network. Check the console for more details.");
    }
  };

  const stopNetwork = async () => {
    try {
      await invoke('stop_network');

      alert("Network stopped successfully!");
      setNetworkRunning(false);
    } catch (error) {
      console.error("Failed to stop network:", error);
      toast.error("Failed to stop network. Check the console for more details.");
      alert("Failed to stop network. Check the console for more details.");
    }
  };

  const sendCrashCommand = async () => {
    try {
      const id = parseInt(droneId);
      if (isNaN(id)) {
        alert("Please enter a valid drone ID");
        return;
      }
      await invoke('send_crash_command', { droneId: id });

      alert(`Crash command sent to drone ${ id }`);
    } catch (error) {
      console.error("Failed to send crash command:", error);
      toast.error("Failed to send crash command. Check the console for more details.");
      alert("Failed to send crash command. Check the console for more details.");
    }
  };

  return (
    <div className="flex items-center justify-center gap-4 border-dotted border-2 border-sky-500">
      {/* Load Config Button */ }
      <Button
        className="m-2 p-3 bg-green-600 shadow-sm hover:bg-green-600/90"
        onClick={ loadConfig }
        disabled={ networkInitialized }
      >
        <FileSliders/>
      </Button>

      {/* Start/Stop Network Button */ }
      <Button
        className="m-2 p-3 bg-green-600 shadow-sm hover:bg-green-600/90"
        onClick={ () => {
          if (networkRunning) {
            stopNetwork();
          } else {
            startNetwork();
          }
        } }
        disabled={ !networkInitialized }
      >
        { networkRunning ? <Pause/> : <Play/> }
      </Button>

      {/* Input for Drone ID */ }
      <Input
        type="number"
        placeholder="Drone ID"
        value={ droneId }
        onChange={ (e) => setDroneId(e.target.value) }
        disabled={ !networkRunning }
        className="w-20"
      />

      {/* Send Crash Command Button */ }
      <Button
        className="m-2 p-3 bg-red-600 shadow-sm hover:bg-red-600/90"
        onClick={ sendCrashCommand }
        disabled={ !networkRunning || droneId === '' }
      >
        <XCircle/>
      </Button>
    </div>
  );
});

ControlPanel.displayName = 'ControlPanel';

export default ControlPanel;