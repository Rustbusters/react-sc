use crate::error::NetworkError;
use crate::network::state::{NetworkState, NodeStatsType, NodeType};
use crate::utils::ControllerEvent;
use common_utils::{HostCommand, HostEvent};
use crossbeam_channel::Sender;
use parking_lot::Mutex;
use serde_json::json;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;
use wg_2024::controller::DroneEvent;
use wg_2024::network::NodeId;

#[tauri::command]
pub fn get_drone_history(state: State<Arc<Mutex<NetworkState>>>, node_id: NodeId) -> Value {
    let state = state.lock();
    let stats = state.get_all_node_stats();

    if let Some(drone_stats) = stats.get(&node_id) {
        json!({
            "node_id": node_id,
            "history": drone_stats.get_events()
        })
    } else {
        json!({ "error": "Drone not found" })
    }
}

#[tauri::command]
pub fn get_drone_statistics(state: State<Arc<Mutex<NetworkState>>>, node_id: NodeId) -> Value {
    let state = state.lock();
    let stats = state.get_all_node_stats();

    if let Some(drone_stats) = stats.get(&node_id) {
        let total_sent = drone_stats
            .events
            .iter()
            .filter(|e| e.event_type == NodeStatsType::PacketsSent)
            .count() as u64;

        let total_dropped = drone_stats
            .events
            .iter()
            .filter(|e| e.event_type == NodeStatsType::PacketsDropped)
            .count() as u64;

        json!({
            "node_id": node_id,
            "total_packets_sent": total_sent,
            "total_packets_dropped": total_dropped
        })
    } else {
        json!({ "error": "Drone not found" })
    }
}

#[tauri::command]
pub fn get_all_drones_history(state: State<Arc<Mutex<NetworkState>>>) -> Value {
    let state = state.lock();
    let stats = state.get_all_node_stats();

    let history_map: HashMap<String, Vec<_>> = stats
        .iter()
        .map(|(node_id, drone_stats)| (node_id.to_string(), drone_stats.get_events()))
        .collect();

    json!({ "history": history_map })
}

#[tauri::command]
pub fn get_all_drones_statistics(state: State<Arc<Mutex<NetworkState>>>) -> Value {
    let state = state.lock();
    let stats = state.get_all_node_stats();

    let stats_map: HashMap<String, Value> = stats
        .iter()
        .map(|(node_id, drone_stats)| {
            let total_sent = drone_stats
                .events
                .iter()
                .filter(|e| e.event_type == NodeStatsType::PacketsSent)
                .count() as u64;

            let total_dropped = drone_stats
                .events
                .iter()
                .filter(|e| e.event_type == NodeStatsType::PacketsDropped)
                .count() as u64;

            (
                node_id.to_string(),
                json!({
                    "total_packets_sent": total_sent,
                    "total_packets_dropped": total_dropped
                }),
            )
        })
        .collect();

    json!({ "stats": stats_map })
}

#[tauri::command]
pub fn get_global_statistics(state: State<Arc<Mutex<NetworkState>>>) -> Value {
    let state = state.lock();
    let stats = state.get_all_node_stats();

    let mut total_packets_sent = 0;
    let mut total_packets_dropped = 0;
    let mut drones_by_sent: Vec<(NodeId, u64)> = Vec::new();
    let mut drones_by_dropped: Vec<(NodeId, u64)> = Vec::new();

    for (node_id, drone_stats) in stats.iter() {
        let sent = drone_stats
            .events
            .iter()
            .filter(|e| e.event_type == NodeStatsType::PacketsSent)
            .count() as u64;

        let dropped = drone_stats
            .events
            .iter()
            .filter(|e| e.event_type == NodeStatsType::PacketsDropped)
            .count() as u64;

        total_packets_sent += sent;
        total_packets_dropped += dropped;

        drones_by_sent.push((*node_id, sent));
        drones_by_dropped.push((*node_id, dropped));
    }

    // Sort drones by sent and dropped packets
    drones_by_sent.sort_by(|a, b| b.1.cmp(&a.1));
    drones_by_dropped.sort_by(|a, b| b.1.cmp(&a.1));

    json!({
        "total_packets_sent": total_packets_sent,
        "total_packets_dropped": total_packets_dropped,
        "top_drones_by_sent": drones_by_sent.into_iter().take(5).collect::<Vec<_>>(),
        "top_drones_by_dropped": drones_by_dropped.into_iter().take(5).collect::<Vec<_>>(),
    })
}

#[tauri::command]
pub fn get_new_messages(
    state: State<Arc<Mutex<NetworkState>>>,
    last_id: usize,
    max_messages: usize,
) -> Value {
    let state = state.lock();
    let total_messages = state.received_messages.len();

    // Calcoliamo il punto di inizio senza scorrere tutta la lista
    let start_index = total_messages.saturating_sub(max_messages).max(last_id);

    // Estraiamo solo i messaggi rilevanti con ID basato sull'indice
    let messages: Vec<Value> = state.received_messages[start_index..]
        .iter()
        .enumerate()
        .map(|(idx, event)| {
            let message_id = start_index + idx;
            match event {
                ControllerEvent::Drone { node_id, event } => match event {
                    DroneEvent::PacketSent(packet) => json!({
                        "id": message_id,
                        "type": "DroneEvent::PacketSent",
                        "node": node_id,
                        "packet": format!("{:?}", packet)
                    }),
                    DroneEvent::PacketDropped(packet) => json!({
                        "id": message_id,
                        "type": "DroneEvent::PacketDropped",
                        "node": node_id,
                        "packet": format!("{:?}", packet)
                    }),
                    DroneEvent::ControllerShortcut(packet) => json!({
                        "id": message_id,
                        "type": "DroneEvent::ControllerShortcut",
                        "node": node_id,
                        "packet": format!("{:?}", packet)
                    }),
                },
                ControllerEvent::Host { node_id, event } => match event {
                    HostEvent::HostMessageSent(message) => json!({
                        "id": message_id,
                        "type": "HostEvent::HostMessageSent",
                        "node": node_id,
                        "message": format!("{:?}", message)
                    }),
                    HostEvent::HostMessageReceived(message) => json!({
                        "id": message_id,
                        "type": "HostEvent::HostMessageReceived",
                        "node": node_id,
                        "message": format!("{:?}", message)
                    }),
                    HostEvent::StatsResponse(stats) => json!({
                        "id": message_id,
                        "type": "HostEvent::StatsResponse",
                        "node": node_id,
                        "stats": format!("{:?}", stats)
                    }),
                    HostEvent::ControllerShortcut(packet) => json!({
                        "id": message_id,
                        "type": "HostEvent::ControllerShortcut",
                        "node": node_id,
                        "packet": format!("{:?}", packet)
                    }),
                },
            }
        })
        .collect();

    json!({ "messages": messages })
}

#[tauri::command]
pub fn get_network_infos(state: State<Arc<Mutex<NetworkState>>>) -> Value {
    let state = state.lock();

    let mut nodes_info = Vec::new();

    let mut sorted_nodes: Vec<_> = state.graph.node_info.iter().collect();
    sorted_nodes.sort_by_key(|(&node_id, _)| node_id);

    for (&node_id, metadata) in sorted_nodes {
        let mut connections = state
            .graph
            .adjacency
            .get(&node_id)
            .cloned()
            .unwrap_or_default();
        connections.sort();
        let mut node_data = json!({
            "node_id": node_id,
            "type": match metadata.node_type {
                NodeType::Drone => "Drone",
                NodeType::Client => "Client",
                NodeType::Server => "Server",
            },
            "connections": connections,
        });

        if let NodeType::Drone = metadata.node_type {
            node_data["pdr"] = json!(metadata.pdr);
        }

        let node_stats = state.get_node_stats(node_id);
        if let Some(stats) = node_stats {
            let total_sent = stats
                .events
                .iter()
                .filter(|e| e.event_type == NodeStatsType::PacketsSent)
                .count() as u64;

            let total_dropped = stats
                .events
                .iter()
                .filter(|e| e.event_type == NodeStatsType::PacketsDropped)
                .count() as u64;

            node_data["packets_sent"] = json!(total_sent);
            node_data["packets_dropped"] = json!(total_dropped);
        }

        nodes_info.push(node_data);
    }

    json!({ "nodes": nodes_info })
}

#[tauri::command]
pub fn get_node_info(state: State<Arc<Mutex<NetworkState>>>, node_id: NodeId) -> Value {
    let state = state.lock();

    if let Some(metadata) = state.graph.node_info.get(&node_id) {
        let mut connections = state
            .graph
            .adjacency
            .get(&node_id)
            .cloned()
            .unwrap_or_default();
        connections.sort();
        let mut node_data = json!({
            "node_id": node_id,
            "type": match metadata.node_type {
                NodeType::Drone => "Drone",
                NodeType::Client => "Client",
                NodeType::Server => "Server",
            },
            "connections": connections,
        });

        if let NodeType::Drone = metadata.node_type {
            node_data["pdr"] = json!(metadata.pdr);
        }

        let node_stats = state.get_node_stats(node_id);
        if let Some(stats) = node_stats {
            let total_sent = stats
                .events
                .iter()
                .filter(|e| e.event_type == NodeStatsType::PacketsSent)
                .count() as u64;

            let total_dropped = stats
                .events
                .iter()
                .filter(|e| e.event_type == NodeStatsType::PacketsDropped)
                .count() as u64;

            node_data["packets_sent"] = json!(total_sent);
            node_data["packets_dropped"] = json!(total_dropped);
        }

        node_data
    } else {
        json!({ "error": "Node not found" })
    }
}

#[tauri::command]
pub fn get_host_stats(
    state: State<Arc<Mutex<NetworkState>>>,
    node_id: NodeId,
) -> Result<(), NetworkError> {
    let state = state.lock();

    let node_type = state
        .get_node_type(node_id)
        .ok_or_else(|| NetworkError::NodeNotFound(node_id.to_string()))?;

    let send_stats_request = |sender: &Sender<HostCommand>| {
        sender
            .send(HostCommand::StatsRequest)
            .map_err(|_| NetworkError::CommandSendError("HostCommand::StatsRequest".to_string()))
    };

    match node_type {
        NodeType::Client => {
            let sender = state
                .client_controller_channels
                .get(&node_id)
                .map(|(s, _)| s)
                .ok_or_else(|| NetworkError::NodeNotFound(node_id.to_string()))?;
            send_stats_request(sender)
        }
        NodeType::Server => {
            let sender = state
                .server_controller_channels
                .get(&node_id)
                .map(|(s, _)| s)
                .ok_or_else(|| NetworkError::NodeNotFound(node_id.to_string()))?;
            send_stats_request(sender)
        }
        _ => Err(NetworkError::InvalidOperation(node_id.to_string())),
    }
}
