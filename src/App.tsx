import "./App.css";
import GraphComponent from "@/components/GraphComponent.tsx";

function App() {
  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex flex-1">
        <div className="flex-1">
          {/* Grafo */ }
          <div className="border border-amber-800 w-full h-full">
            <GraphComponent/>
          </div>
        </div>
        <div className="w-3/5 border border-amber-800">
          {/* Colonna con dati */ }
          Dati
        </div>
      </div>
      <div className="h-1/3 border border-amber-800">
        {/*<Console/>*/ }
      </div>
    </div>
  );
}

export default App;