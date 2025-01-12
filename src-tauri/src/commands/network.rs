use crate::error::NetworkError;
use crate::network::state::NetworkState;
use log::{error, info};
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State as TauriState;

/// Starts the network by calling `initialize_network` on the `NetworkState`.
/// Fails if `node_threads` is not empty (network already running).
#[tauri::command]
pub fn start_network(state: TauriState<Arc<Mutex<NetworkState>>>) -> Result<(), NetworkError> {
    let mut net_state = state.lock();
    info!("Starting network...");

    // Ensure no threads are running currently
    if !net_state.node_threads.is_empty() {
        error!("Network already running");
        return Err(NetworkError::NetworkAlreadyRunning);
    }

    net_state.initialize_network()?;
    info!("Network started successfully");

    Ok(())
}

/// Stops the network by joining and clearing all threads in `node_threads`.
#[tauri::command]
pub fn stop_network(state: TauriState<Arc<Mutex<NetworkState>>>) -> Result<(), String> {
    let mut net_state = state.lock();

    // Drain the node_threads, joining each thread
    for (node_id, handle) in net_state.node_threads.drain() {
        if let Err(e) = handle.join() {
            error!("Failed to join thread for node {}: {:?}", node_id, e);
        }
    }

    info!("Network stopped successfully");
    Ok(())
}
