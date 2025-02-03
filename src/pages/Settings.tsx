import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "react-hot-toast";
import { appDataDir, join, resolveResource } from "@tauri-apps/api/path"; // Aggiunto resolveResource
import { BaseDirectory, copyFile, exists, readDir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

// 📌 Cartelle per default e history
const DEFAULT_CONFIGS_DIR = "default_configs"; // 🛠️ Ora viene letto dalle risorse
const HISTORY_CONFIGS_DIR = "history";
const LAST_CONFIG_FILE = "last_config.txt";

const Settings = () => {
  const [configPath, setConfigPath] = useState<string>("");
  const [defaultConfigs, setDefaultConfigs] = useState<string[]>([]);
  const [historyConfigs, setHistoryConfigs] = useState<string[]>([]);

  // ✅ Otteniamo il percorso corretto per default_configs (risorse) e history (AppData)
  const getAppPath = async (folder: string): Promise<string> => {
    if (folder === DEFAULT_CONFIGS_DIR) {
      return resolveResource(DEFAULT_CONFIGS_DIR); // Usa resolveResource per leggere dalla cartella delle risorse
    }
    return join(await appDataDir(), folder); // Usa AppData per history
  };

  // ✅ Carica le configurazioni predefinite dalle risorse e la cronologia da AppData
  const loadConfigs = async () => {
    try {
      console.log("Caricamento delle configurazioni...");
      const defaultPath = await getAppPath(DEFAULT_CONFIGS_DIR);
      const historyPath = await getAppPath(HISTORY_CONFIGS_DIR);

      // 📌 Legge le configurazioni predefinite dalle risorse
      const defaultFiles = await readDir(defaultPath);
      setDefaultConfigs(defaultFiles.map((file) => file.path));

      // 📜 Legge la cronologia da AppData
      const historyFiles = await readDir(historyPath, { baseDir: BaseDirectory.AppData });
      setHistoryConfigs(historyFiles.map((file) => file.path));
    } catch (error) {
      console.error("Errore nel caricamento delle configurazioni:", error);
    }
  };

  // ✅ Carica l'ultima configurazione salvata
  const loadLastConfig = async () => {
    try {
      const filePath = await getAppPath(LAST_CONFIG_FILE);
      if (await exists(filePath, { baseDir: BaseDirectory.AppData })) {
        const savedPath = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
        setConfigPath(savedPath);
      }
    } catch (error) {
      console.warn("Nessuna configurazione precedente trovata.");
    }
  };

  // ✅ Salva l'ultima configurazione selezionata
  const saveLastConfig = async (path: string) => {
    try {
      const filePath = await getAppPath(LAST_CONFIG_FILE);
      await writeTextFile(filePath, path, { baseDir: BaseDirectory.AppData });
    } catch (error) {
      console.error("Errore nel salvataggio del percorso della configurazione:", error);
    }
  };

  // ✅ Carica le configurazioni all'avvio
  useEffect(() => {
    loadConfigs();
    loadLastConfig();
  }, []);

  // ✅ Selezione manuale di un file
  const handleSelectFile = async () => {
    try {
      const selectedPath = await open({
        title: "Seleziona un file di configurazione",
        multiple: false,
        filters: [{ name: "Config Files", extensions: ["toml"] }],
      });

      if (selectedPath) {
        const pathStr = Array.isArray(selectedPath) ? selectedPath[0] : selectedPath;
        setConfigPath(pathStr);
        await saveLastConfig(pathStr);
        toast.success("File di configurazione selezionato!");
      } else {
        toast.error("Nessun file selezionato.");
      }
    } catch (error) {
      console.error("Errore nella selezione del file:", error);
      toast.error("Errore nella selezione del file.");
    }
  };

  // ✅ Caricamento della configurazione selezionata
  const handleLoadConfig = async () => {
    if (!configPath) {
      toast.error("Seleziona un file di configurazione prima di continuare.");
      return;
    }

    try {
      const historyPath = await getAppPath(HISTORY_CONFIGS_DIR);
      const timestamp = new Date().toISOString().replace(/:/g, "-").replace("T", "_").split(".")[0];
      const fileName = `config_${ timestamp }.toml`;
      const destPath = await join(historyPath, fileName);

      // Copia il file nella cartella di history (che si trova in AppData)
      await copyFile(configPath, destPath, {
        fromPathBaseDir: BaseDirectory.Resource, // 📌 Legge dalle risorse per i file di default
        toPathBaseDir: BaseDirectory.AppData,
      });

      // Esegue il parsing della configurazione nel backend
      await invoke("load_config", { path: destPath });

      // Aggiorna la cronologia
      setHistoryConfigs((prev) => [destPath, ...prev]);

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

      <div className="mb-4">
        <label className="text-sm font-medium block mb-1">Seleziona una Configurazione</label>
        <Select onValueChange={ setConfigPath } value={ configPath }>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona una configurazione"/>
          </SelectTrigger>
          <SelectContent>
            <div className="text-gray-500 px-2 py-1">📌 Configurazioni Predefinite</div>
            { defaultConfigs.map((path, index) => (
              <SelectItem key={ index } value={ path }>
                { path.split("/").pop() }
              </SelectItem>
            )) }
            <div className="text-gray-500 px-2 py-1">📜 Cronologia</div>
            { historyConfigs.map((path, index) => (
              <SelectItem key={ index } value={ path }>
                { path.split("/").pop() }
              </SelectItem>
            )) }
          </SelectContent>
        </Select>
      </div>

      <Button onClick={ handleSelectFile } className="w-full mt-2">
        📂 Seleziona File Manualmente
      </Button>

      <Button onClick={ handleLoadConfig } className="w-full mt-4">
        🚀 Carica Configurazione
      </Button>
    </div>
  );
};

export default Settings;
