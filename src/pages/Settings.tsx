import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { invoke } from "@tauri-apps/api/core";
import { open } from '@tauri-apps/plugin-dialog';
import { toast } from "react-hot-toast";

const CONFIG_HISTORY_KEY = "configHistory";
const CONFIG_PATH_KEY = "lastConfigPath";

const Settings = () => {
  const [configPath, setConfigPath] = useState<string>("");
  const [configHistory, setConfigHistory] = useState<string[]>([]);

  // 📌 Carichiamo la cronologia delle configurazioni e l'ultima usata
  useEffect(() => {
    try {
      const savedConfigPath = localStorage.getItem(CONFIG_PATH_KEY);
      const savedHistory = JSON.parse(localStorage.getItem(CONFIG_HISTORY_KEY) || "[]");

      if (savedConfigPath) setConfigPath(savedConfigPath);
      if (Array.isArray(savedHistory)) setConfigHistory(savedHistory);
    } catch (error) {
      console.error("Errore nel caricamento delle configurazioni salvate:", error);
    }
  }, []);

  // 📤 Funzione per selezionare il file config.toml
  const handleSelectFile = async () => {
    try {
      const selectedPath = await open({
        title: "Seleziona un file di configurazione",
        multiple: false,
        filters: [{ name: "Config Files", extensions: ["toml"] }],
      });

      if (selectedPath && typeof selectedPath === "string") {
        saveConfigPath(selectedPath);
        setConfigPath(selectedPath);
        toast.success("File di configurazione selezionato!");
      } else {
        toast.error("Nessun file selezionato.");
      }
    } catch (error) {
      console.error("Errore nella selezione del file:", error);
      toast.error("Errore nella selezione del file.");
    }
  };

  // 📌 Salviamo il file selezionato nella cronologia
  const saveConfigPath = (path: string) => {
    let updatedHistory = [path, ...configHistory.filter((p) => p !== path)];
    if (updatedHistory.length > 5) updatedHistory = updatedHistory.slice(0, 5); // Max 5 configurazioni

    setConfigHistory(updatedHistory);
    localStorage.setItem(CONFIG_PATH_KEY, path);
    localStorage.setItem(CONFIG_HISTORY_KEY, JSON.stringify(updatedHistory));
  };

  // 📤 Funzione per caricare la configurazione selezionata
  const handleLoadConfig = async () => {
    if (!configPath) {
      toast.error("Seleziona un file di configurazione prima di continuare.");
      return;
    }

    try {
      await invoke("load_config", { path: configPath });
      toast.success("Configurazione caricata con successo!");
    } catch (error) {
      console.error("Errore nel caricamento della configurazione:", error);
      toast.error("Errore nel caricamento della configurazione.");
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-4">⚙️ Impostazioni</h1>
      <p className="mb-6 text-gray-600">Configura la simulazione qui.</p>

      {/* Selezione File Config */ }
      <div className="mb-4">
        <label className="text-sm font-medium block mb-1">Seleziona Config.toml</label>
        <div className="flex gap-2">
          <Input type="text" value={ configPath } readOnly className="flex-1"/>
          <Button onClick={ handleSelectFile }>📂 Scegli</Button>
        </div>
      </div>

      {/* Cronologia Configurazioni */ }
      { configHistory.length > 0 && (
        <div className="mb-4">
          <label className="text-sm font-medium block mb-1">Cronologia Configurazioni</label>
          <Select onValueChange={ setConfigPath } value={ configPath }>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona una configurazione"/>
            </SelectTrigger>
            <SelectContent>
              { configHistory.map((path, index) => (
                <SelectItem key={ index } value={ path }>
                  { path }
                </SelectItem>
              )) }
            </SelectContent>
          </Select>
        </div>
      ) }

      {/* Pulsante per Caricare Config */ }
      <Button onClick={ handleLoadConfig } className="w-full bg-blue-500 text-white mt-4">
        🚀 Carica Configurazione
      </Button>
    </div>
  );
};

export default Settings;