use crate::error::NetworkError;
use crate::simulation::state::SimulationState;
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State;

/// Sets the discovery interval for the network.
///
/// # Arguments
///
/// * `interval` - The discovery interval in seconds.
///
/// # Returns
///
/// * `Ok(())` - If the interval is successfully updated.
#[tauri::command]
pub fn set_discovery_interval(
    state: State<Arc<Mutex<SimulationState>>>,
    interval: u64,
) -> Result<(), NetworkError> {
    let mut sim_state = state.lock();

    if interval == 0 {
        sim_state.set_discovery_interval(None);
    } else {
        sim_state.set_discovery_interval(Some(std::time::Duration::from_secs(interval)));
    }

    Ok(())
}

#[tauri::command]
pub fn get_discovery_interval(state: State<Arc<Mutex<SimulationState>>>) -> u64 {
    state
        .lock()
        .get_discovery_interval()
        .map_or(0, |d| d.as_secs())
}

#[tauri::command]
pub fn get_strict_mode(state: State<Arc<Mutex<SimulationState>>>) -> bool {
    state.lock().get_strict_mode()
}

#[tauri::command]
pub fn set_strict_mode(
    state: State<Arc<Mutex<SimulationState>>>,
    strict: bool,
) -> Result<(), NetworkError> {
    state.lock().set_strict_mode(strict);
    Ok(())
}
