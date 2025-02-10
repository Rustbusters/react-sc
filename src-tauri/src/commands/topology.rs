use crate::error::NetworkError;
use crate::simulation::state::{SimulationState, SimulationStatus};
use crate::simulation::topology::NodeMetadata;
use parking_lot::Mutex;
use serde_json::{json, Value};
use std::sync::Arc;
use tauri::State;
use wg_2024::network::NodeId;
use wg_2024::packet::NodeType;

#[tauri::command]
pub fn remove_node(
    state: State<Arc<Mutex<SimulationState>>>,
    node_id: NodeId,
) -> Result<(), NetworkError> {
    let mut sim_state = state.lock();

    if sim_state.get_status() == SimulationStatus::Running {
        // TODO: migliorare questo pezzo
        let node_type = sim_state
            .get_graph()
            .get_node_type(node_id)
            .ok_or_else(|| NetworkError::NodeNotFound(node_id.to_string()))?;
        match node_type {
            NodeMetadata::Drone(_) => {
                crate::simulation::controller::crash_drone(&mut sim_state, node_id)?;
            }
            NodeMetadata::Client | NodeMetadata::Server => {
                Err(NetworkError::NodeIsNotDrone(node_id))?;
            }
        }
    } else {
        crate::simulation::configs::configs_handler::remove_node_from_config(
            &mut sim_state,
            node_id,
        )?;
    }

    Ok(())
}

#[tauri::command]
pub fn remove_edge(
    state: State<Arc<Mutex<SimulationState>>>,
    node1_id: NodeId,
    node2_id: NodeId,
) -> Result<(), NetworkError> {
    let mut sim_state = state.lock();

    if sim_state.get_status() == SimulationStatus::Running {
        crate::simulation::controller::remove_edge(&mut sim_state, node1_id, node2_id)?;
    } else {
        crate::simulation::configs::configs_handler::remove_edge_from_config(
            &mut sim_state,
            node1_id,
            node2_id,
        )?;
    }

    Ok(())
}

#[tauri::command]
pub fn add_node(
    state: State<Arc<Mutex<SimulationState>>>,
    neighbors: Vec<NodeId>,
    pdr: Option<u32>,
    node_type: String, // Drone, Client, Server
) -> Result<(), NetworkError> {
    let mut sim_state = state.lock();
    
    let node_type = match node_type.as_str() {
        "Drone" => NodeType::Drone,
        "Client" => NodeType::Client,
        "Server" => NodeType::Server,
        _ => return Err(NetworkError::InvalidNodeType(node_type)),
    };

    if sim_state.get_status() == SimulationStatus::Running {
        if node_type == NodeType::Drone {
            let pdr = pdr.ok_or(NetworkError::InvalidPdr(0))?;
            crate::simulation::controller::add_drone(&mut sim_state, neighbors, pdr)?;
        } else {
            return Err(NetworkError::InvalidOperation(
                "Cannot add a client or server node during the simulation".to_string(),
            ));
        }
    } else {
        crate::simulation::configs::configs_handler::add_node_to_config(
            &mut sim_state,
            node_type,
            neighbors,
            pdr,
        )?;
    }

    Ok(())
}

#[tauri::command]
pub fn add_edge(
    state: State<Arc<Mutex<SimulationState>>>,
    node1_id: NodeId,
    node2_id: NodeId,
) -> Result<(), NetworkError> {
    let mut sim_state = state.lock();

    if sim_state.get_status() == SimulationStatus::Running {
        crate::simulation::controller::add_edge(&mut sim_state, node1_id, node2_id)?;
    } else {
        crate::simulation::configs::configs_handler::add_edge_to_config(
            &mut sim_state,
            node1_id,
            node2_id,
        )?;
    }

    Ok(())
}

// TODO: refactoring di questa funzione
#[tauri::command]
pub fn get_graph(state: State<Arc<Mutex<SimulationState>>>) -> Value {
    let sim_state = state.lock();

    let drones: Vec<_> = sim_state
        .get_graph()
        .get_nodes_info()
        .iter()
        .filter_map(|(id, meta)| {
            if let crate::simulation::topology::NodeMetadata::Drone(drone) = meta {
                Some(json!({
                    "id": id,
                    "connected_node_ids": sim_state.get_graph().get_neighbors(*id),
                    "pdr": drone.get_pdr(),
                }))
            } else {
                None
            }
        })
        .collect();

    let clients: Vec<_> = sim_state
        .get_graph()
        .get_nodes_info()
        .iter()
        .filter_map(|(id, meta)| {
            if matches!(meta, crate::simulation::topology::NodeMetadata::Client) {
                Some(json!({
                    "id": id,
                    "connected_drone_ids": sim_state.get_graph().get_neighbors(*id),
                }))
            } else {
                None
            }
        })
        .collect();

    let servers: Vec<_> = sim_state
        .get_graph()
        .get_nodes_info()
        .iter()
        .filter_map(|(id, meta)| {
            if matches!(meta, crate::simulation::topology::NodeMetadata::Server) {
                Some(json!({
                    "id": id,
                    "connected_drone_ids": sim_state.get_graph().get_neighbors(*id),
                }))
            } else {
                None
            }
        })
        .collect();

    if drones.is_empty() && clients.is_empty() && servers.is_empty() {
        if let Some(config) = &sim_state.get_config() {
            return json!({
                "drones": config.drone.iter().map(|d| {
                    json!({
                        "id": d.id,
                        "connected_node_ids": d.connected_node_ids,
                        "pdr": d.pdr,
                    })
                }).collect::<Vec<_>>(),
                "clients": config.client.iter().map(|c| {
                    json!({
                        "id": c.id,
                        "connected_drone_ids": c.connected_drone_ids,
                    })
                }).collect::<Vec<_>>(),
                "servers": config.server.iter().map(|s| {
                    json!({
                        "id": s.id,
                        "connected_drone_ids": s.connected_drone_ids,
                    })
                }).collect::<Vec<_>>(),
            });
        }
    }

    json!({
        "drones": drones,
        "clients": clients,
        "servers": servers,
    })
}

// TODO: refactoring di questa funzione
#[tauri::command]
pub fn get_network_nodes(state: State<Arc<Mutex<SimulationState>>>) -> Result<Value, NetworkError> {
    let sim_state = state.lock();

    if sim_state.get_status() != SimulationStatus::Running {
        return Err(NetworkError::NetworkNotRunning);
    }

    let nodes_json: Vec<Value> = sim_state
        .get_graph()
        .get_nodes_info()
        .iter()
        .map(|(node_id, metadata)| match metadata {
            crate::simulation::topology::NodeMetadata::Drone(drone) => {
                json!({
                    "id": node_id,
                    "type": "Drone",
                    "pdr": drone.get_pdr(),
                    "crashed": false,
                })
            }
            crate::simulation::topology::NodeMetadata::Client => {
                json!({
                    "id": node_id,
                    "type": "Client",
                    "pdr": 0.0,
                    "crashed": false,
                })
            }
            crate::simulation::topology::NodeMetadata::Server => {
                json!({
                    "id": node_id,
                    "type": "Server",
                    "pdr": 0.0,
                    "crashed": false,
                })
            }
        })
        .collect();

    Ok(json!(nodes_json))
}
