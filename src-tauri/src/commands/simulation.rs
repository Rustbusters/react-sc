use std::sync::Arc;
use parking_lot::Mutex;
use crate::network::state::NetworkState;
use tauri::State;
use wg_2024::network::NodeId;

#[tauri::command]
pub fn send_crash_command(state: State<Arc<Mutex<NetworkState>>>, drone_id: u32) -> Result<(), String> {
    state.lock().send_crash_command(drone_id as NodeId)
}

#[tauri::command]
pub fn send_set_pdr_command(
    state: State<Arc<Mutex<NetworkState>>>,
    drone_id: u32,
    pdr: u8,
) -> Result<(), String> {
    state.lock().send_set_pdr_command(drone_id as NodeId, pdr)
}

#[tauri::command]
pub fn send_add_sender_command(
    state: State<Arc<Mutex<NetworkState>>>,
    drone_id: u32,
    target_id: u32,
) -> Result<(), String> {
    state.lock().send_add_sender_command(drone_id as NodeId, target_id as NodeId)
}

#[tauri::command]
pub fn send_remove_sender_command(
    state: State<Arc<Mutex<NetworkState>>>,
    drone_id: u32,
    target_id: u32,
) -> Result<(), String> {
    state.lock().send_remove_sender_command(drone_id as NodeId, target_id as NodeId)
}