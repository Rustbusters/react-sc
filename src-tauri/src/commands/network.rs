use crate::error::NetworkError;
use crate::network::state::NetworkState;
use log::{error, info};
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State as TauriState;

#[tauri::command]
pub fn start_network(state: TauriState<Arc<Mutex<NetworkState>>>) -> Result<(), NetworkError> {
    let mut state = state.lock();

    if !state.handles.is_empty() {
        return Err(NetworkError::NetworkAlreadyRunning);
    }

    state.initialize_network()?;

    info!("Network started successfully");
    Ok(())
}

#[tauri::command]
pub fn stop_network(state: TauriState<Arc<Mutex<NetworkState>>>) -> Result<(), String> {
    let mut state = state.lock();
    while let Some(handle) = state.handles.pop() {
        if let Err(e) = handle.join() {
            error!("Failed to join thread: {:?}", e);
        }
    }

    info!("Network stopped successfully");
    Ok(())
}
