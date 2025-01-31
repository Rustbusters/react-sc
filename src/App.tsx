import "./App.css";
import { Route, Routes } from "react-router-dom";
import Home from "@/pages/Home.tsx";
import Settings from "@/pages/Settings.tsx";
import NotFound from "@/pages/NotFound.tsx";
import Simulation from "@/pages/Simulation.tsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={ <Home/> }/>
      <Route path="/simulation" element={ <Simulation/> }/>
      <Route path="/settings" element={ <Settings/> }/>
      <Route path="*" element={ <NotFound/> }/>
    </Routes>
  );
}

export default App;