import "./App.css";
import DynamicTabLayout from "@/components/tab-manager/DynamicTabLayout.tsx";

function App() {

  return (
    <main className="flex flex-col items-center justify-start w-screen h-screen p-2">
      <DynamicTabLayout/>
    </main>
  );
}

export default App;
