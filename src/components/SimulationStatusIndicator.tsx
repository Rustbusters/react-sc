import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSimulation } from "@/components/SimulationContext.tsx";

const statusStyles = {
  Init: { color: "bg-gray-600", text: "Init" },
  Running: { color: "bg-green-600", text: "Running" },
  Stopped: { color: "bg-red-600", text: "Stopped" },
};

export const SimulationStatusIndicator = () => {
  const { status, isLoading, startNetwork, stopNetwork, restartNetwork } = useSimulation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="mx-2">
          { isLoading ? (
            <span className="text-gray-500">Caricamento...</span>
          ) : (
            <>
              <span className={ `${ statusStyles[status].color } rounded-full w-2 h-2 inline-block mr-2` }/>
              { statusStyles[status].text }
            </>
          ) }
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={ startNetwork }>Start</DropdownMenuItem>
        <DropdownMenuItem onSelect={ stopNetwork }>Stop</DropdownMenuItem>
        <DropdownMenuItem onSelect={ restartNetwork }>Restart</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
