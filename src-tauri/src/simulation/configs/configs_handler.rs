use crate::commands::config::get_history_dir;
use crate::error::NetworkError;
use crate::simulation::state::SimulationState;
use crate::simulation::topology::NodeMetadata;
use chrono::Utc;
use log::info;
use std::fs;
use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};
use wg_2024::config::Config;
use wg_2024::network::NodeId;

pub fn get_default_configs_dir(app_handle: AppHandle) -> Result<PathBuf, NetworkError> {
    app_handle
        .path()
        .resolve("resources/default_configs", BaseDirectory::Resource)
        .map_err(|e| NetworkError::PathError(e.to_string()))
}

pub fn get_config_from_file(path: &str) -> Result<Config, NetworkError> {
    let config_data = std::fs::read_to_string(path).map_err(NetworkError::ConfigFileReadError)?;
    let config: Config = toml::from_str(&config_data).map_err(NetworkError::ConfigParseError)?;

    info!("Initial configuration loaded successfully.");

    Ok(config)
}

pub fn save_config_to_history(
    state: &SimulationState,
    app_handle: AppHandle,
) -> Result<(), NetworkError> {
    let history_dir = get_history_dir(app_handle)?;
    let timestamp = Utc::now().format("%Y%m%d%H%M%S");

    // Convert `Config` into `SerializableConfig`
    let config = state.get_config().ok_or(NetworkError::NoConfigLoaded)?;
    let serializable_config = crate::simulation::configs::SerializableConfig::from(config);

    // Serialize to TOML
    let toml_data =
        toml::to_string(&serializable_config).map_err(|e| NetworkError::Other(e.to_string()))?; // FIXME

    // Generate a filename
    let file_name = format!("config_{}.toml", timestamp);
    let file_path = history_dir.join(file_name);

    // Save to file
    fs::write(&file_path, toml_data).map_err(|e| NetworkError::PathError(e.to_string()))?;

    Ok(())
}

pub fn remove_node_from_config(
    state: &mut SimulationState,
    node_id: NodeId,
) -> Result<(), NetworkError> {
    let config = state.get_config_mut().ok_or(NetworkError::NoConfigLoaded)?;

    config.drone.retain(|d| d.id != node_id);
    config.client.retain(|c| c.id != node_id);
    config.server.retain(|s| s.id != node_id);

    for drone in &mut config.drone {
        drone.connected_node_ids.retain(|&id| id != node_id);
    }
    for client in &mut config.client {
        client.connected_drone_ids.retain(|&id| id != node_id);
    }
    for server in &mut config.server {
        server.connected_drone_ids.retain(|&id| id != node_id);
    }

    Ok(())
}

pub fn remove_edge_from_config(
    state: &mut SimulationState,
    node1_id: NodeId,
    node2_id: NodeId,
) -> Result<(), NetworkError> {
    let config = state.get_config_mut().ok_or(NetworkError::NoConfigLoaded)?;

    for drone in &mut config.drone {
        if drone.id == node1_id {
            drone.connected_node_ids.retain(|&id| id != node2_id);
        }
        if drone.id == node2_id {
            drone.connected_node_ids.retain(|&id| id != node1_id);
        }
    }

    for client in &mut config.client {
        if client.id == node1_id {
            client.connected_drone_ids.retain(|&id| id != node2_id);
        }
        if client.id == node2_id {
            client.connected_drone_ids.retain(|&id| id != node1_id);
        }
    }

    for server in &mut config.server {
        if server.id == node1_id {
            server.connected_drone_ids.retain(|&id| id != node2_id);
        }
        if server.id == node2_id {
            server.connected_drone_ids.retain(|&id| id != node1_id);
        }
    }

    Ok(())
}

// TODO: fix this
pub fn add_node_to_config(
    state: &mut SimulationState,
    node_id: NodeId,
    node_type: NodeMetadata,
) -> Result<(), NetworkError> {
    let config = state.get_config_mut().ok_or(NetworkError::NoConfigLoaded)?;

    /*match node_type {
        NodeMetadata::Drone => {
            config.drone.push(SerializableDrone {
                id: node_id,
                connected_node_ids: vec![],
                pdr: 1.0,
            });
        }
        NodeMetadata::Client => {
            config.client.push(SerializableClient {
                id: node_id,
                connected_drone_ids: vec![],
            });
        }
        NodeMetadata::Server => {
            config.server.push(SerializableServer {
                id: node_id,
                connected_drone_ids: vec![],
            });
        }
    }*/

    Ok(())
}

pub fn add_edge_to_config(
    state: &mut SimulationState,
    node1_id: NodeId,
    node2_id: NodeId,
) -> Result<(), NetworkError> {
    let config = state.get_config_mut().ok_or(NetworkError::NoConfigLoaded)?;

    for drone in &mut config.drone {
        if drone.id == node1_id {
            drone.connected_node_ids.push(node2_id);
        }
        if drone.id == node2_id {
            drone.connected_node_ids.push(node1_id);
        }
    }

    for client in &mut config.client {
        if client.id == node1_id {
            client.connected_drone_ids.push(node2_id);
        }
        if client.id == node2_id {
            client.connected_drone_ids.push(node1_id);
        }
    }

    for server in &mut config.server {
        if server.id == node1_id {
            server.connected_drone_ids.push(node2_id);
        }
        if server.id == node2_id {
            server.connected_drone_ids.push(node1_id);
        }
    }

    Ok(())
}
