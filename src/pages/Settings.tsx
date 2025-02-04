import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "react-hot-toast";
import { join, resolveResource } from "@tauri-apps/api/path";
import { exists, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { File, FolderOpen, Trash, Upload } from "lucide-react"; // Import delle icone

// 📌 Costanti delle cartelle
const DEFAULT_CONFIGS_DIR = "default_configs";
const LAST_CONFIG_FILE = "last_config.txt";

// 📌 Definizione del tipo ConfigFile
interface ConfigFile {
  id: string;
  name: string;
  path: string;
  timestamp: number;
}

const Settings = () => {
  const [configPath, setConfigPath] = useState<string>("");
  const [defaultConfigs, setDefaultConfigs] = useState<ConfigFile[]>([]);
  const [historyConfigs, setHistoryConfigs] = useState<ConfigFile[]>([]);

  // 📌 Ottiene il percorso del file `last_config.txt`
  const getLastConfigFilePath = async (): Promise<string> => {
    const historyDir = await invoke<string>("get_history_dir");
    return join(historyDir, LAST_CONFIG_FILE);
  };

  // 📌 Ottiene il percorso della directory (default_configs o history)
  const getAppPath = async (folder: string): Promise<string> => {
    return folder === DEFAULT_CONFIGS_DIR
      ? resolveResource(DEFAULT_CONFIGS_DIR)
      : invoke("get_history_dir");
  };

  // 📌 Carica le configurazioni predefinite e la cronologia
  const loadConfigs = async () => {
    try {
      const [defaultConfigs, historyData] = await Promise.all([
        invoke<ConfigFile[]>("get_default_configs"),
        invoke<ConfigFile[]>("get_history_configs")
      ]);

      // Rimuove il file `last_config.txt` dalla cronologia
      const filteredHistory = historyData.filter((config) => config.name !== LAST_CONFIG_FILE);

      setDefaultConfigs(defaultConfigs);
      setHistoryConfigs(filteredHistory);
    } catch (error) {
      console.error("Errore caricamento configs:", error);
    }
  };

  // 📌 Carica un file di configurazione **e lo salva nella cronologia solo se caricato con successo**
  const handleLoadConfig = async (path: string) => {
    if (!path) {
      toast.error("Seleziona una configurazione!");
      return;
    }

    try {
      // 🔹 Caricamento della configurazione
      await invoke("load_config", { path });

      // 🔹 Se il caricamento ha successo, il file viene salvato nella cronologia
      const newConfig = await invoke<ConfigFile>("save_config_to_history", { filePath: path });

      setHistoryConfigs(prev => [newConfig, ...prev.filter(c => c.path !== newConfig.path)]);
      toast.success("Configurazione caricata e salvata nella cronologia!");

      // 🔹 Salva l'ultima configurazione caricata
      await saveLastConfig(newConfig.path);
    } catch (error) {
      console.error("Errore durante il caricamento:", error);
      toast.error("Errore durante il caricamento.");
    }
  };

  // 📌 Carica l'ultima configurazione usata
  const loadLastConfig = async () => {
    try {
      const filePath = await getLastConfigFilePath();
      if (await exists(filePath)) {
        const savedPath = await readTextFile(filePath);
        setConfigPath(savedPath);
      }
    } catch (error) {
      console.warn("Nessuna configurazione precedente trovata.");
    }
  };

  // 📌 Salva l'ultima configurazione selezionata
  const saveLastConfig = async (path: string) => {
    try {
      const filePath = await getLastConfigFilePath();
      await writeTextFile(filePath, path);
    } catch (error) {
      console.error("Errore nel salvataggio della configurazione:", error);
    }
  };

  // 📌 Carica i dati all'avvio
  useEffect(() => {
    loadConfigs();
    loadLastConfig();
  }, []);

  // 📌 Selezione manuale di un file
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

  // 📌 Elimina una configurazione dalla cronologia
  const handleDeleteConfig = async (filePath: string) => {
    try {
      await invoke("delete_history_config", { filePath });
      setHistoryConfigs((prev) => prev.filter((config) => config.path !== filePath));
      toast.success("Configurazione eliminata!");
    } catch (error) {
      console.error("Errore nell'eliminazione della configurazione:", error);
      toast.error("Errore nell'eliminazione della configurazione.");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto grid grid-cols-3 gap-4">
      {/* Configurazioni Predefinite */ }
      <div className="col-span-1 border-r pr-4">
        <h2 className="text-lg font-semibold mb-2">Configurazioni Predefinite</h2>
        <div className="space-y-2">
          { defaultConfigs.map((config) => (
            <Button
              key={ config.id }
              variant="ghost"
              className="w-full flex justify-start"
              onClick={ () => setConfigPath(config.path) }
            >
              <File className="mr-2 w-4 h-4"/>
              { config.name }
            </Button>
          )) }
        </div>
      </div>

      {/* Input File + Azioni */ }
      <div className="col-span-2">
        <h2 className="text-lg font-semibold mb-2">Carica Configurazione</h2>
        <div className="flex space-x-2">
          <Input
            value={ configPath }
            onChange={ (e) => setConfigPath(e.target.value) }
            placeholder="Percorso file..."
            className="flex-1"
          />
          <Button onClick={ handleSelectFile }>
            <FolderOpen className="w-4 h-4"/>
          </Button>
          <Button onClick={ () => handleLoadConfig(configPath) }>
            <Upload className="w-4 h-4"/>
          </Button>
        </div>

        {/* Cronologia */ }
        <h2 className="text-lg font-semibold mt-6 mb-2">Cronologia</h2>
        <div className="space-y-2">
          { historyConfigs.map((config) => (
            <div key={ config.id }
                 className="flex justify-between items-center p-3 border rounded-lg shadow-sm bg-white">
              <div>
                <p className="font-medium">{ config.name }</p>
                <p className="text-xs text-gray-500">{ new Date(config.timestamp * 1000).toLocaleString() }</p>
              </div>
              <Button size="sm" variant="ghost" onClick={ () => handleLoadConfig(config.path) }>
                <Upload className="w-4 h-4"/>
              </Button>
              <Button size="sm" variant="destructive" onClick={ () => handleDeleteConfig(config.path) }>
                <Trash className="w-4 h-4"/>
              </Button>
            </div>
          )) }
        </div>
      </div>
    </div>
  );
};

export default Settings;
