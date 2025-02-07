use crate::error::NetworkError;
use crate::network::state::{GraphState, NetworkState, NetworkStatus, NodeMetadata, NodeType};
use common_utils::HostCommand;
use log::{error, info};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State as TauriState;
use tauri::{AppHandle, Emitter};
use wg_2024::controller::DroneCommand;
use wg_2024::network::NodeId;

/// Starts the network by initializing the network state and starting all nodes.
#[tauri::command]
pub fn start_network(
    app: AppHandle,
    state: TauriState<Arc<Mutex<NetworkState>>>,
) -> Result<(), NetworkError> {
    let mut net_state = state.lock();
    info!("Starting network...");

    if net_state.get_status() == NetworkStatus::Running {
        error!("Network already running");
        return Err(NetworkError::NetworkAlreadyRunning);
    }

    net_state.initialize_network()?;

    if let Err(err) = net_state.save_config_to_history(app.clone()) {
        error!("Failed to save configuration to history: {}", err);
    }

    app.emit("network_status_changed", NetworkStatus::Running)
        .unwrap();
    info!("Network started successfully");

    Ok(())
}

#[tauri::command]
pub fn get_network_status(state: TauriState<Arc<Mutex<NetworkState>>>) -> NetworkStatus {
    state.lock().get_status()
}

/// Stops the network by sending "Crash" to all drones and "Stop" to all hosts,
/// then joining and clearing all threads.
#[tauri::command]
pub fn stop_network(
    app: AppHandle,
    state: TauriState<Arc<Mutex<NetworkState>>>,
) -> Result<(), NetworkError> {
    let mut net_state = state.lock();

    if net_state.get_status() != NetworkStatus::Running {
        info!("Network is already stopped");
        return Ok(());
    }

    info!("Stopping the network...");

    // Drones
    for (drone_id, (sender, _receiver)) in &net_state.drones_controller_channels {
        sender.send(DroneCommand::Crash).map_err(|_| {
            NetworkError::CommandSendError(format!(
                "Failed to send 'Crash' command to drone {}",
                drone_id
            ))
        })?;
        info!("Sent 'Crash' command to drone {}", drone_id);
    }

    // Clients
    for (client_id, (sender, _receiver)) in &net_state.client_controller_channels {
        sender.send(HostCommand::Stop).map_err(|_| {
            NetworkError::CommandSendError(format!(
                "Failed to send 'Stop' command to client {}",
                client_id
            ))
        })?;
        info!("Sent 'Stop' command to client {}", client_id);
    }

    // Servers
    for (server_id, (sender, _receiver)) in &net_state.server_controller_channels {
        sender.send(HostCommand::Stop).map_err(|_| {
            NetworkError::CommandSendError(format!(
                "Failed to send 'Stop' command to server {}",
                server_id
            ))
        })?;
        info!("Sent 'Stop' command to server {}", server_id);
    }

    for (node_id, handle) in net_state.node_threads.drain() {
        info!("Attempting to join thread for node {}", node_id);
        if let Err(e) = handle.join() {
            error!(
                "Failed to join thread for node {}: {:?}. Force-removing.",
                node_id, e
            );
        } else {
            info!("Thread for node {} stopped successfully", node_id);
        }
    }

    net_state.clear_simulation();

    net_state.set_status(NetworkStatus::Stopped);

    app.emit("network_status_changed", NetworkStatus::Stopped)
        .map_err(|err| {
            NetworkError::CommandSendError(format!(
                "Failed to emit network status change: {:?}",
                err
            ))
        })?;

    info!("Network stopped successfully");
    Ok(())
}

// =============================================================================
use serde_json::{json, Value};

#[tauri::command]
pub fn get_network_nodes(
    state: TauriState<Arc<Mutex<NetworkState>>>,
) -> Result<Value, NetworkError> {
    let state = state.lock();

    if state.get_status() != NetworkStatus::Running {
        return Err(NetworkError::NetworkNotRunning);
    }

    let mut nodes_json: Vec<Value> = state
        .graph
        .node_info
        .iter()
        .map(|(node_id, metadata)| {
            json!({
                "id": node_id,
                "type": match metadata.node_type {
                    NodeType::Drone => "Drone",
                    NodeType::Client => "Client",
                    NodeType::Server => "Server",
                },
                "pdr": metadata.pdr,
                "crashed": metadata.crashed
            })
        })
        .collect();

    nodes_json.sort_by(|a, b| a["id"].as_u64().cmp(&b["id"].as_u64()));

    Ok(json!(nodes_json))
}
