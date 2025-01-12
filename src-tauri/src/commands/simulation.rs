use crate::network::state::NetworkState;
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State;
use wg_2024::network::NodeId;

/// Sends a "Crash" command to a specific drone.
/// This calls `send_crash_command` on `NetworkState`.
#[tauri::command]
pub fn send_crash_command(
    state: State<Arc<Mutex<NetworkState>>>,
    drone_id: u32,
) -> Result<(), String> {
    state.lock().send_crash_command(drone_id as NodeId)
}

/// Sets the Packet Drop Rate (PDR) for a specific drone.
#[tauri::command]
pub fn send_set_pdr_command(
    state: State<Arc<Mutex<NetworkState>>>,
    drone_id: u32,
    pdr: u8,
) -> Result<(), String> {
    state.lock().send_set_pdr_command(drone_id as NodeId, pdr)
}

/// Dynamically adds a new link (sender) between two drone IDs in the runtime graph.
#[tauri::command]
pub fn send_add_sender_command(
    state: State<Arc<Mutex<NetworkState>>>,
    drone_id: u32,
    target_id: u32,
) -> Result<(), String> {
    state
        .lock()
        .send_add_sender_command(drone_id as NodeId, target_id as NodeId)
}

/// Dynamically removes a link (sender) between two drone IDs in the runtime graph.
#[tauri::command]
pub fn send_remove_sender_command(
    state: State<Arc<Mutex<NetworkState>>>,
    drone_id: u32,
    target_id: u32,
) -> Result<(), String> {
    state
        .lock()
        .send_remove_sender_command(drone_id as NodeId, target_id as NodeId)
}
