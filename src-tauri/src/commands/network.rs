use crate::error::NetworkError;
use crate::network::state::{GraphState, NetworkState, NetworkStatus};
use common_utils::HostCommand;
use log::{error, info};
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State as TauriState;
use tauri::{AppHandle, Emitter};
use wg_2024::controller::DroneCommand;

/// Starts the network by calling `initialize_network` on the `NetworkState`.
/// Fails if `node_threads` is not empty (network already running).
#[tauri::command]
pub fn start_network(
    app: tauri::AppHandle,
    state: TauriState<Arc<Mutex<NetworkState>>>,
) -> Result<(), NetworkError> {
    let mut net_state = state.lock();
    info!("Starting network...");

    if net_state.get_status() == NetworkStatus::Running {
        error!("Network already running");
        return Err(NetworkError::NetworkAlreadyRunning);
    }

    net_state.initialize_network()?;
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
    app: tauri::AppHandle,
    state: TauriState<Arc<Mutex<NetworkState>>>,
) -> Result<(), String> {
    let mut net_state = state.lock();

    if net_state.get_status() != NetworkStatus::Running {
        info!("Network is already stopped");
        return Ok(());
    }

    info!("Stopping the network...");

    // 🔹 Invia il comando "Crash" a tutti i droni
    for (drone_id, (sender, _receiver)) in &net_state.drones_controller_channels {
        if sender.send(DroneCommand::Crash).is_err() {
            error!("Failed to send 'Crash' command to drone {}", drone_id);
        } else {
            info!("Sent 'Crash' command to drone {}", drone_id);
        }
    }

    // 🔹 Invia il comando "Stop" a tutti i client
    for (client_id, (sender, _receiver)) in &net_state.client_controller_channels {
        if sender.send(HostCommand::Stop).is_err() {
            error!("Failed to send 'Stop' command to client {}", client_id);
        } else {
            info!("Sent 'Stop' command to client {}", client_id);
        }
    }

    // 🔹 Invia il comando "Stop" a tutti i server
    for (server_id, (sender, _receiver)) in &net_state.server_controller_channels {
        if sender.send(HostCommand::Stop).is_err() {
            error!("Failed to send 'Stop' command to server {}", server_id);
        } else {
            info!("Sent 'Stop' command to server {}", server_id);
        }
    }

    // 🔹 Join dei thread dei nodi dopo aver mandato i comandi
    for (node_id, handle) in net_state.node_threads.drain() {
        if let Err(e) = handle.join() {
            error!(
                "Failed to join thread for node {}: {:?}. Force-removing.",
                node_id, e
            );
        } else {
            info!("Thread for node {} stopped successfully", node_id);
        }
    }

    net_state.inter_node_channels.clear();
    net_state.drones_controller_channels.clear();
    net_state.client_controller_channels.clear();
    net_state.server_controller_channels.clear();
    net_state.node_stats.clear();
    net_state.graph = GraphState::default();

    // 🔹 Notifica il frontend che la rete è stata stoppata
    app.emit("network_status_changed", NetworkStatus::Stopped)
        .unwrap_or_else(|err| error!("Failed to emit network status change: {:?}", err));

    info!("Network stopped successfully");
    Ok(())
}
