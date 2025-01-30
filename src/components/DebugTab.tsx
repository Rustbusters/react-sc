import React from "react";
import { Button } from "@/components/ui/button.tsx";
import { invoke } from "@tauri-apps/api/core";

export const DebugTab = () => {

  const [data, setData] = React.useState<any>(null);

  return (
    <div className="h-full w-full flex-col items-center">
      <div className="flex items-center gap-4">
        <Button onClick={ () => {
          invoke('get_config', {})
            .then((retrivedConfig: any) => setData(retrivedConfig))
            .catch(err => console.error('Error getting config:', err));
        } } variant="default">Show</Button>

        <Button
          onClick={ () => {
            invoke('load_config', { path: 'config.json' })
              .then(() => console.log('Config loaded successfully'))
              .catch(err => console.error('Error loading config:', err));
          } }
          variant="secondary"
        >
          Load
        </Button>
        <Button
          onClick={ () => {
            invoke('start_network')
              .then(() => console.log('Initialized drones successfully'))
              .catch(err => console.error('Error initializeting :', err));
          } }
          variant="default"
        >
          Init
        </Button>
        <Button
          onClick={ () => {
            invoke('get_network_stats', {})
              .then((stats: any) => setData(stats))
              .catch(err => console.error('Error getting stats:', err));
          } }
          variant="link"
        >
          Get Stats
        </Button>
      </div>
      <pre className="text-gray-400">
            { JSON.stringify(data, null, 2) }
        </pre>
    </div>
  )
}