use crate::error::NetworkError;
use crate::network::state::{GraphState, NetworkState, NetworkStatus};
use log::{error, info};
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State as TauriState;
use tauri::{AppHandle, Emitter};

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

/// Stops the network by joining and clearing all threads in `node_threads`.
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

    info!("Force-stopping the network...");

    for (node_id, handle) in net_state.node_threads.drain() {
        // Se il thread è ancora attivo, forziamo la terminazione
        if let Err(e) = handle.join() {
            error!(
                "Failed to join thread for node {}: {:?}. Force-removing.",
                node_id, e
            );
        } else {
            info!("Thread for node {} stopped successfully", node_id);
        }
    }

    // 2️⃣ Pulizia delle strutture dati
    net_state.inter_node_channels.clear();
    net_state.drones_controller_channels.clear();
    net_state.client_controller_channels.clear();
    net_state.server_controller_channels.clear();
    net_state.node_stats.clear();
    net_state.graph = GraphState::default();

    app.emit("network_status_changed", NetworkStatus::Stopped)
        .unwrap();

    info!("Network force-stopped successfully");
    Ok(())
}
