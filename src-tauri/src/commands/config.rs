use crate::error::NetworkError;
use crate::network::state::NetworkState;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::UNIX_EPOCH;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager, State};
use wg_2024::network::NodeId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigFile {
    pub id: String,     // UUID univoco della configurazione
    pub name: String,   // Nome file (unico)
    pub path: String,   // Percorso salvato
    pub timestamp: u64, // Data e ora di caricamento (UNIX timestamp)
}

/// Loads the configuration from a file and stores it in `state.initial_config`.
#[tauri::command]
pub fn load_config(
    path: String,
    state: State<Arc<Mutex<NetworkState>>>,
) -> Result<(), NetworkError> {
    let mut net_state = state.lock();
    net_state.load_config_from_file(&path)?;
    Ok(())
}

/// Returns the configuration **as originally loaded**, in JSON form.
/// This does *not* reflect runtime changes like added/removed links.
#[tauri::command]
pub fn get_config(state: State<Arc<Mutex<NetworkState>>>) -> serde_json::Value {
    let state = state.lock();

    if let Some(config) = &state.initial_config {
        json!({
            "drones": config.drone.iter().map(|d| {
                json!({
                    "id": d.id,
                    "connected_node_ids": d.connected_node_ids,
                    "pdr": d.pdr,
                })
            }).collect::<Vec<_>>(),
            "clients": config.client.iter().map(|c| {
                json!({
                    "id": c.id,
                    "connected_drone_ids": c.connected_drone_ids,
                })
            }).collect::<Vec<_>>(),
            "servers": config.server.iter().map(|s| {
                json!({
                    "id": s.id,
                    "connected_drone_ids": s.connected_drone_ids,
                })
            }).collect::<Vec<_>>(),
        })
    } else {
        // If no initial_config is loaded, return an empty structure
        json!({
            "drones": [],
            "clients": [],
            "servers": [],
        })
    }
}
#[tauri::command]
pub fn get_default_configs_dir(app_handle: AppHandle) -> Result<PathBuf, String> {
    app_handle
        .path()
        .resolve("resources/default_configs", BaseDirectory::Resource)
        .map_err(|e| format!("Errore directory default configs: {}", e))
}

#[tauri::command]
pub fn get_history_dir(app_handle: AppHandle) -> Result<PathBuf, String> {
    let history_dir = app_handle
        .path()
        .resolve("history", BaseDirectory::AppData)
        .map_err(|e| format!("Errore nel recupero della directory AppData: {}", e))?;

    // Crea la cartella se non esiste
    if !history_dir.exists() {
        fs::create_dir_all(&history_dir)
            .map_err(|e| format!("Errore nella creazione della directory: {}", e))?;
    }

    Ok(history_dir)
}

#[tauri::command]
pub fn get_history_configs(app_handle: tauri::AppHandle) -> Result<Vec<ConfigFile>, String> {
    let history_dir = get_history_dir(app_handle)?;

    let mut configs = Vec::new();
    for entry in fs::read_dir(history_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.is_file() {
            let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
            let timestamp = metadata
                .modified()
                .map_err(|e| e.to_string())?
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);

            configs.push(ConfigFile {
                id: path.file_stem().unwrap().to_string_lossy().into_owned(),
                name: path.file_name().unwrap().to_string_lossy().into_owned(),
                path: path.to_string_lossy().into_owned(),
                timestamp,
            });
        }
    }

    configs.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(configs)
}

#[tauri::command]
pub fn get_default_configs(app_handle: tauri::AppHandle) -> Result<Vec<ConfigFile>, String> {
    let dir = get_default_configs_dir(app_handle)?;
    let mut configs = Vec::new();

    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        configs.push(ConfigFile {
            id: path.file_stem().unwrap().to_string_lossy().into_owned(),
            name: path.file_name().unwrap().to_string_lossy().into_owned(),
            path: path.to_string_lossy().into_owned(),
            timestamp: 0,
        });
    }

    Ok(configs)
}

#[tauri::command]
pub fn delete_history_config(file_path: String) -> Result<(), String> {
    fs::remove_file(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn config_remove_node(node_id: NodeId, state: State<Arc<Mutex<NetworkState>>>) -> Result<(), String> {
    let mut net_state = state.lock();

    if let Some(config) = &mut net_state.initial_config {
        config.drone.retain(|d| d.id != node_id);
        config.client.retain(|c| c.id != node_id);
        config.server.retain(|s| s.id != node_id);

        for drone in &mut config.drone {
            drone.connected_node_ids.retain(|&id| id != node_id);
        }
        for client in &mut config.client {
            client.connected_drone_ids.retain(|&id| id != node_id);
        }
        for server in &mut config.server {
            server.connected_drone_ids.retain(|&id| id != node_id);
        }

        Ok(())
    } else {
        Err("No configuration loaded".to_string())
    }
}

#[tauri::command]
pub fn config_remove_edge(
    node1_id: NodeId,
    node2_id: NodeId,
    state: State<Arc<Mutex<NetworkState>>>,
) -> Result<(), String> {
    let mut net_state = state.lock();

    if let Some(config) = &mut net_state.initial_config {
        for drone in &mut config.drone {
            if drone.id == node1_id {
                drone.connected_node_ids.retain(|&id| id != node2_id);
            }
            if drone.id == node2_id {
                drone.connected_node_ids.retain(|&id| id != node1_id);
            }
        }

        for client in &mut config.client {
            if client.id == node1_id {
                client.connected_drone_ids.retain(|&id| id != node2_id);
            }
            if client.id == node2_id {
                client.connected_drone_ids.retain(|&id| id != node1_id);
            }
        }

        for server in &mut config.server {
            if server.id == node1_id {
                server.connected_drone_ids.retain(|&id| id != node2_id);
            }
            if server.id == node2_id {
                server.connected_drone_ids.retain(|&id| id != node1_id);
            }
        }

        Ok(())
    } else {
        Err("No configuration loaded".to_string())
    }
}
