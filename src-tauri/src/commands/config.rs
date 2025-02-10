use crate::error::NetworkError;
use crate::simulation::state::SimulationState;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::UNIX_EPOCH;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager, State};

/// Represents a configuration file with metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigFile {
    pub id: String,     // Unique UUID of the configuration
    pub name: String,   // Unique file name
    pub path: String,   // Saved file path
    pub timestamp: u64, // Timestamp of when it was loaded (UNIX timestamp)
}

/// Loads a configuration file and stores it in `state.initial_config`.
#[tauri::command]
pub fn load_config(
    path: String,
    state: State<Arc<Mutex<SimulationState>>>,
) -> Result<(), NetworkError> {
    let mut sim_state = state.lock();
    sim_state.load_config_from_file(&path)?;
    Ok(())
}

/// Retrieves the history directory path, creating it if it does not exist.
///
/// # Arguments
///
/// * `app_handle` - The application handle to resolve paths.
///
/// # Returns
///
/// * `Ok(PathBuf)` - The history directory path.
/// * `Err(String)` - If the directory cannot be created or resolved.
#[tauri::command]
pub fn get_history_dir(app_handle: AppHandle) -> Result<PathBuf, NetworkError> {
    let history_dir = app_handle
        .path()
        .resolve("history", BaseDirectory::AppData)
        .map_err(|e| NetworkError::PathError(e.to_string()))?;

    if !history_dir.exists() {
        fs::create_dir_all(&history_dir).map_err(|e| NetworkError::PathError(e.to_string()))?;
    }

    Ok(history_dir)
}

/// Retrieves all historical configuration files.
///
/// # Arguments
///
/// * `app_handle` - The application handle.
///
/// # Returns
///
/// * `Ok(Vec<ConfigFile>)` - A list of historical configurations.
/// * `Err(String)` - If an error occurs while reading the directory.
#[tauri::command]
pub fn get_history_configs(app_handle: AppHandle) -> Result<Vec<ConfigFile>, NetworkError> {
    let history_dir = get_history_dir(app_handle)?;

    let mut configs = Vec::new();
    for entry in fs::read_dir(history_dir).map_err(NetworkError::ConfigFileReadError)? {
        let entry = entry.map_err(NetworkError::ConfigFileReadError)?;
        let path = entry.path();

        if path.is_file() {
            let metadata = fs::metadata(&path).map_err(NetworkError::ConfigFileReadError)?;
            let timestamp = metadata
                .modified()
                .map_err(NetworkError::ConfigFileReadError)?
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);

            configs.push(ConfigFile {
                id: path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .map(String::from)
                    .ok_or_else(|| NetworkError::Other("Failed to parse file stem".into()))?,
                name: path
                    .file_name()
                    .and_then(|s| s.to_str())
                    .map(String::from)
                    .ok_or_else(|| NetworkError::Other("Failed to parse file name".into()))?,
                path: path.to_string_lossy().into_owned(),
                timestamp,
            });
        }
    }

    configs.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(configs)
}

/// Retrieves all default configuration files.
///
/// # Arguments
///
/// * `app_handle` - The application handle.
///
/// # Returns
///
/// * `Ok(Vec<ConfigFile>)` - A list of default configurations.
/// * `Err(NetworkError)` - If an error occurs while reading the directory.
#[tauri::command]
pub fn get_default_configs(app_handle: AppHandle) -> Result<Vec<ConfigFile>, NetworkError> {
    let dir = crate::simulation::configs::configs_handler::get_default_configs_dir(app_handle)
        .map_err(|e| NetworkError::PathError(e.to_string()))?;

    let mut configs = Vec::new();

    for entry in fs::read_dir(dir).map_err(NetworkError::ConfigFileReadError)? {
        let entry = entry.map_err(NetworkError::ConfigFileReadError)?;
        let path = entry.path();

        let id = path
            .file_stem()
            .and_then(|s| s.to_str())
            .map(String::from)
            .ok_or_else(|| NetworkError::Other("Failed to parse file stem".into()))?;

        let name = path
            .file_name()
            .and_then(|s| s.to_str())
            .map(String::from)
            .ok_or_else(|| NetworkError::Other("Failed to parse file name".into()))?;

        configs.push(ConfigFile {
            id,
            name,
            path: path.to_string_lossy().into_owned(),
            timestamp: 0,
        });
    }

    Ok(configs)
}

/// Deletes a configuration file from history.
///
/// # Arguments
///
/// * `file_path` - The path of the file to delete.
///
/// # Returns
///
/// * `Ok(())` - If the file is successfully deleted.
/// * `Err(NetworkError)` - If an error occurs during deletion.
#[tauri::command]
pub fn delete_history_config(file_path: String) -> Result<(), NetworkError> {
    fs::remove_file(&file_path).map_err(NetworkError::ConfigFileDeleteError)
}
