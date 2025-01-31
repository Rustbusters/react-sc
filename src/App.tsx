import "./App.css";
import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import Home from "@/pages/Home.tsx";
import Simulation from "@/pages/Simulation.tsx";
import Settings from "@/pages/Settings.tsx";
import NotFound from "@/pages/NotFound.tsx";
import GraphComponent from "@/components/GraphComponent.tsx";
import { Stats } from "@/components/Stats.tsx";

function App() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/simulation" element={
        <div className="flex flex-col w-full h-full">
          <div className="flex flex-1">
            <div className="flex-1">
              <div className="border border-amber-800 w-full h-full">
                <GraphComponent onNodeSelect={setSelectedNode} />
              </div>
            </div>
            <div className="w-3/5 border border-amber-800">
              <Stats selectedNode={selectedNode} />
            </div>
          </div>
          <div className="h-1/3 border border-amber-800">
            {/*<Console/>*/}
          </div>
        </div>
      } />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;