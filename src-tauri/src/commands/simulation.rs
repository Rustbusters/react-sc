use crate::error::NetworkError;
use crate::simulation::state::{SimulationState, SimulationStatus};
use log::{error, info};
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

#[tauri::command]
pub fn start_simulation(
    app: AppHandle,
    state: State<Arc<Mutex<SimulationState>>>,
) -> Result<(), NetworkError> {
    let mut sim_state = state.lock();
    info!("Starting simulation...");

    if sim_state.get_status() == SimulationStatus::Running {
        error!("Simulation already running");
        return Err(NetworkError::NetworkAlreadyRunning);
    }

    sim_state.start_simulation()?;

    if let Err(err) =
        crate::simulation::configs::configs_handler::save_config_to_history(&sim_state, app.clone())
    {
        error!("Failed to save configuration to history: {}", err);
    }

    app.emit("simulation_status_changed", SimulationStatus::Running)
        .map_err(|err| {
            NetworkError::CommandSendError(format!(
                "Failed to emit network status change: {:?}",
                err
            ))
        })?;
    info!("Simulation started successfully");

    Ok(())
}

#[tauri::command]
pub fn get_simulation_status(state: State<Arc<Mutex<SimulationState>>>) -> SimulationStatus {
    state.lock().get_status()
}

#[tauri::command]
pub fn stop_simulation(
    app: AppHandle,
    state: State<Arc<Mutex<SimulationState>>>,
) -> Result<(), NetworkError> {
    let mut sim_state = state.lock();

    if sim_state.get_status() != SimulationStatus::Running {
        info!("Simulation is already stopped");
        return Ok(());
    }

    info!("Stopping the simulation...");

    sim_state.stop_simulation()?;

    app.emit("simulation_status_changed", SimulationStatus::Stopped)
        .map_err(|err| {
            NetworkError::CommandSendError(format!(
                "Failed to emit simulation status change: {:?}",
                err
            ))
        })?;
    info!("Simulation stopped successfully");

    Ok(())
}
