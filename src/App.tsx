import "./App.css";
import { Route, Routes } from "react-router-dom";
import Home from "@/pages/Home.tsx";
import Settings from "@/pages/Settings.tsx";
import NotFound from "@/pages/NotFound.tsx";
import Simulation from "@/pages/Simulation.tsx";
import SendPacketForm from "@/pages/SendPacketForm.tsx";
import Logs from "@/pages/Logs.tsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={ <Home/> }/>
      <Route path="/inbox" element={ <Logs/> }/>
      <Route path="/send" element={ <SendPacketForm/> }/>
      <Route path="/simulation" element={ <Simulation/> }/>
      <Route path="/settings" element={ <Settings/> }/>
      <Route path="*" element={ <NotFound/> }/>
    </Routes>
  );
}

export default App;