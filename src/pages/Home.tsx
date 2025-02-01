import BarChart from "@/components/graphs/BarChart.tsx";
import LineChart from "@/components/graphs/LineChart.tsx";

const Home = () => {
  return (
    <div className="w-full h-full p-6">
      <h1 className="text-3xl font-bold">🏠 Home</h1>
      <p>Benvenuto nel sistema di simulazione!</p>
      <BarChart/>
      <LineChart/>
      {/*<PieChart/>*/ }
    </div>
  );
};

export default Home;

/*

<Router>
      <div className="flex w-full h-full">
        {/!* Contenuto Principale *!/ }
        <main className="flex flex-col w-full">
          <Routes>
            <Route path="/" element={ <Home/> }/>
            <Route path="/simulation" element={ <Simulation/> }/>
            <Route path="/settings" element={ <Settings/> }/>
            <Route path="*" element={ <NotFound/> }/>
          </Routes>
        </main>
      </div>
    </Router>
<Home/>

* */