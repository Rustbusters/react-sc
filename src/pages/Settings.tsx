import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner"
import { join } from "@tauri-apps/api/path";
import { exists, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { CircleCheck, File, FolderOpen, Trash, Upload } from "lucide-react";
import { useSimulation } from "@/components/SimulationContext";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { useTheme } from "@/components/theme-provider.tsx";

const LAST_CONFIG_FILE = "last_config.txt";

interface ConfigFile {
  id: string;
  name: string;
  path: string;
  timestamp: number;
}

const Settings = () => {
  const { status, clientUrl, setClientUrl, serverUrl, setServerUrl } = useSimulation();
  const [defaultConfigs, setDefaultConfigs] = useState<ConfigFile[]>([]);
  const [historyConfigs, setHistoryConfigs] = useState<ConfigFile[]>([]);
  const [configPath, setConfigPath] = useState<string>("");
  const [alreadyLoaded, setAlreadyLoaded] = useState<boolean>(false);

  const [maxMessages, setMaxMessages] = useState<number>(parseInt(localStorage.getItem("maxMessages") || "1000", 10));

  const [discoveryInterval, setDiscoveryInterval] = useState<number>(0);

  const [discoveryIntervalSent, setDiscoveryIntervalSent] = useState<boolean>(true);

  const [strict, setStrict] = useState<boolean>(false);

  const { richColors, setRichColors } = useTheme();

  const getLastConfigFilePath = async (): Promise<string> => {
    const historyDir = await invoke<string>("get_history_dir");
    return join(historyDir, LAST_CONFIG_FILE);
  };

  const loadConfigs = async () => {
    try {
      const [defaultConfigs, historyData] = await Promise.all([
        invoke<ConfigFile[]>("get_default_configs"),
        invoke<ConfigFile[]>("get_history_configs"),
      ]);

      const filteredHistory = historyData.filter((config) => config.name !== LAST_CONFIG_FILE);
      setDefaultConfigs(defaultConfigs);
      setHistoryConfigs(filteredHistory);
    } catch (error) {
      console.error("Error loading configurations:", error);
    }
  };

  const handleLoadConfig = async (path: string) => {
    if (!path) {
      toast.error("Please select a configuration!");
      return;
    }

    if (status === "Running") {
      toast.error("Simulation is running, please stop it before loading a new configuration.");
      return;
    }

    try {
      await invoke("load_config", { path });
      setConfigPath(path);
      toast.success("Configuration loaded successfully!");
      await saveLastConfig(path);
      setAlreadyLoaded(true);
    } catch (error) {
      console.error("Error loading configuration:", error);
      toast.error("Failed to load configuration.");
    }
  };

  const loadLastConfig = async () => {
    try {
      const filePath = await getLastConfigFilePath();
      if (await exists(filePath)) {
        const savedPath = await readTextFile(filePath);
        setConfigPath(savedPath);
      }
    } catch (error) {
      console.warn("No previous configuration found.");
    }
  };

  const saveLastConfig = async (path: string) => {
    try {
      const filePath = await getLastConfigFilePath();
      await writeTextFile(filePath, path);
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.warning("Failed to save configuration.");
    }
  };

  useEffect(() => {
    loadConfigs();
    loadLastConfig();
  }, []);

  useEffect(() => {
    if (status === "Running") {
      loadConfigs();
    }
  }, [status]);


  const handleSelectFile = async () => {
    try {
      const selectedPath = await open({
        title: "Select a configuration file",
        multiple: false,
        filters: [{ name: "Config Files", extensions: ["toml"] }],
      });

      if (selectedPath) {
        const pathStr = Array.isArray(selectedPath) ? selectedPath[0] : selectedPath;
        setConfigPath(pathStr);
        await saveLastConfig(pathStr);
        setAlreadyLoaded(false);
        toast.success("Configuration file selected!");
      } else {
        toast.error("No file selected.");
      }
    } catch (error) {
      console.error("Error selecting file:", error);
      toast.error("Failed to select file.");
    }
  };

  const handleDeleteConfig = async (filePath: string) => {
    try {
      await invoke("delete_history_config", { filePath });
      setHistoryConfigs((prev) => prev.filter((config) => config.path !== filePath));
      toast.success("Configuration deleted!");
    } catch (error) {
      console.error("Error deleting configuration:", error);
      toast.error("Failed to delete configuration.");
    }
  };

  // ─── Update Settings ────────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("maxMessages", maxMessages.toString());
    window.dispatchEvent(new Event("storage"));
  }, [maxMessages]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const interval = await invoke<number>("get_discovery_interval");
        setDiscoveryInterval(interval);
      } catch (error) {
        console.error("Failed to fetch discovery interval:", error);
        toast.error("Error fetching discovery interval.");
      }

      try {
        const strictMode = await invoke<boolean>("get_strict_mode");
        setStrict(strictMode);
      } catch (error) {
        console.error("Failed to fetch strict mode:", error);
        toast.error("Error fetching strict mode.");
      }
    };

    fetchSettings();
  }, []);


  const toggleStrictMode = async () => {
    try {
      await invoke("set_strict_mode", { strict: !strict });
      setStrict(!strict);
      toast.success(`Strict Mode ${ !strict ? "enabled" : "disabled" }!`);
    } catch (error) {
      console.error("Error updating Strict Mode:", error);
      toast.error("Failed to update Strict Mode.");
    }
  };


  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="w-full grid grid-cols-3 gap-4">
        <div className="col-span-1 border-r pr-4">
          <h2 className="text-lg font-semibold mb-2">Default Configurations</h2>
          <div className="space-y-2">
            { defaultConfigs.map((config) => (
              <Button
                key={ config.id }
                variant="ghost"
                className="w-full flex justify-start"
                onClick={ () => handleLoadConfig(config.path) }
                disabled={ status === "Running" }
              >
                <File className="mr-2 w-4 h-4"/>
                { config.name }
              </Button>
            )) }
          </div>
        </div>

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
            <Button onClick={ () => handleLoadConfig(configPath) } disabled={ status === "Running" || alreadyLoaded }>
              <Upload className="w-4 h-4"/>
            </Button>
          </div>

          {/* Cronologia */ }
          <h2 className="text-lg font-semibold mt-6 mb-2">Cronologia</h2>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            { historyConfigs.map((config) => (
              <div key={ config.id }
                   className="flex justify-between items-center p-3 border rounded-lg shadow-sm bg-white">
                <div className="grow truncate text-ellipsis">
                  <p className="font-medium">{ config.name }</p>
                  <p className="text-xs text-gray-500">{ new Date(config.timestamp * 1000).toLocaleString() }</p>
                </div>

                <div className="flex flex-row gap-2">
                  <Button size="sm" variant="ghost" onClick={ () => handleLoadConfig(config.path) }
                          disabled={ status === "Running" }>
                    <Upload className="w-4 h-4"/>
                  </Button>
                  <Button size="sm" variant="destructive" onClick={ () => handleDeleteConfig(config.path) }>
                    <Trash className="w-4 h-4"/>
                  </Button>
                </div>
              </div>
            )) }
          </div>
        </div>

        {/* Max Messages Setting */ }
        <div className="space-y-2">
          <Label htmlFor="maxMessages">Max Log Messages</Label>
          <Input
            id="maxMessages"
            type="number"
            value={ maxMessages }
            onChange={ (e) => {
              const value = parseInt(e.target.value, 10);
              if (value > 0) {
                setMaxMessages(value);
              } else {
                toast.error("Value must be greater than 0");
              }
            } }
            className="w-full"
          />
        </div>

        {/* Discovery Interval Setting */ }
        <div className="space-y-2">
          <Label htmlFor="discoveryInterval">Discovery Interval (seconds)</Label>
          <div className="flex flex-row gap-2">
            <Input
              id="discoveryInterval"
              type="number"
              value={ discoveryInterval === 0 ? "" : discoveryInterval }
              placeholder="0 = Default"
              disabled={ status === "Running" }
              onChange={ (e) => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value)) {
                  if (value >= 0) {
                    if (value !== discoveryInterval) {
                      setDiscoveryInterval(value);
                      setDiscoveryIntervalSent(false);
                    }
                  } else {
                    toast.error("Value must be greater than or equal to 0");
                  }
                }
              } }
              className="flex-1"
            />
            <Button onClick={ () => {
              invoke("set_discovery_interval", { interval: discoveryInterval })
              setDiscoveryIntervalSent(true);
            } }
                    disabled={ discoveryIntervalSent || status === "Running" }>
              <CircleCheck/>
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-around">
          <Label htmlFor="strictMode">Strict Mode in Validation</Label>
          <Switch id="strictMode" checked={ strict } onCheckedChange={ toggleStrictMode }/>
        </div>

        {/* Client URL */ }
        <div className="space-y-2">
          <Label htmlFor="clientUrl">Client URL</Label>
          <Input
            id="clientUrl"
            type="text"
            value={ clientUrl }
            onChange={ (e) => setClientUrl(e.target.value) }
            className="w-full"
          />
        </div>

        {/* Server URL */ }
        <div className="space-y-2">
          <Label htmlFor="serverUrl">Server URL</Label>
          <Input
            id="serverUrl"
            type="text"
            value={ serverUrl }
            onChange={ (e) => setServerUrl(e.target.value) }
            className="w-full"
          />
        </div>
      </div>

      <Separator className="my-6"/>

      <h2 className="text-lg font-semibold pb-2">Theme</h2>
      <div className="w-full grid grid-cols-3 gap-4">


        <div className="flex flex-row items-center justify-start gap-4">
          <Label htmlFor="richColors">Toast Colorati</Label>
          <Switch id="richColors" checked={ richColors } onCheckedChange={ setRichColors }/>
        </div>
      </div>
    </div>
  );
};

export default Settings;
