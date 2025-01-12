use crate::error::NetworkError;
use crate::network::state::NetworkState;
use parking_lot::Mutex;
use serde_json::json;
use std::sync::Arc;
use tauri::State;

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
