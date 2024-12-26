use crate::error::NetworkError;
use crate::network::state::NetworkState;
use log::info;
use parking_lot::Mutex;
use serde_json::json;
use std::sync::Arc;
use tauri::State;
use wg_2024::config::Config;

#[tauri::command]
pub fn load_config(
    path: String,
    state: State<Arc<Mutex<NetworkState>>>,
) -> Result<(), NetworkError> {
    // Read the config file
    let config_data =
        std::fs::read_to_string(&path).map_err(NetworkError::ConfigFileReadError)?;

    // Parse the TOML config
    let config: Config =
        toml::from_str(&config_data).map_err(NetworkError::ConfigParseError)?;

    // Lock the state and load the configuration
    let mut state = state.lock();
    state.load_config(config)?;

    info!("Config loaded successfully");
    Ok(())
}
#[tauri::command]
pub fn get_config(state: State<Arc<Mutex<NetworkState>>>) -> serde_json::Value {
    let state = state.lock();

    if let Some(config) = &state.config {
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
        json!({
            "drones": [],
            "clients": [],
            "servers": [],
        })
    }
}
