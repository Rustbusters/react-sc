import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useSimulation } from "@/components/SimulationContext.tsx";

const Home = () => {
  const navigate = useNavigate();
  const { status, startNetwork, stopNetwork } = useSimulation();

  return (
    <div className="w-full h-full p-6 flex flex-col space-y-6 select-none">
      {/* Title */ }
      <h1 className="text-3xl font-bold">Simulation Controller</h1>
      <p className="text-muted-foreground">
        Welcome to the Simulation Controller! Follow these steps to set up your simulation.
      </p>

      {/* Steps Container */ }
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Step 1: Settings */ }
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>⚙️ Configure Your Simulation</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Load a configuration from the defaults, history, or a <b>.toml</b> file</p>
            <p>You can also set the <b>Discovery Interval</b> and the max log messages.</p>
            <Button onClick={ () => navigate("/settings") } className="mt-4 w-full">
              Go to Settings
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: Network Visualization */ }
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>🖥️ Review the Network</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Check the network topology and edit nodes or links if necessary.</p>
            <p>To remove a node or link, select it and press <b>Backspace</b>.</p>
            <Button onClick={ () => navigate("/simulation") } className="mt-4 w-full">
              Open Simulation
            </Button>
          </CardContent>
        </Card>

        {/* Step 3: Start Simulation */ }
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>🚀 Start the Simulation</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Once satisfied with the network, start the simulation from the top-right menu.</p>
            <p>The simulation status is always visible in the top-right corner.</p>
            <Button className="mt-4 w-full" variant="outline" onClick={ () => {
              if (status === "Running") {
                stopNetwork().then(r => r);
              } else {
                startNetwork().then(r => r);
              }
            } }>
              <span
                className={ `${ status != "Running" ? "bg-gray-600" : "bg-green-600" } rounded-full w-2 h-2 inline-block mr-2` }/>
              { status != "Running" ? "Init" : "Running" }
            </Button>
          </CardContent>
        </Card>

        {/* Step 4: Analyze Data */ }
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>📊 Analyze Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <p>View global statistics or click on a node for specific details.</p>
            <p>You can modify parameters such as <b>PDR</b> or crash a drone.</p>
            <Button onClick={ () => navigate("/stats") } className="mt-4 w-full">
              View Statistics
            </Button>
          </CardContent>
        </Card>

        {/* Step 5: Check Logs */ }
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>📜 Monitor Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <p>View and filter logs to analyze transmitted packets.</p>
            <p>The number of displayed logs can be adjusted in the settings.</p>
            <Button onClick={ () => navigate("/logs") } className="mt-4 w-full">
              Open Logs
            </Button>
          </CardContent>
        </Card>

        {/* Step 6: Send Messages */ }
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>📡 Packet Transmission</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Send custom packets across the network with custom paths.</p>
            <p>You can also schedule periodic sending on a separate thread.</p>
            <Button onClick={ () => navigate("/send") } className="mt-4 w-full">
              Go to Packet Sender
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Home;
