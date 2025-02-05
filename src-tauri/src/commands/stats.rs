use crate::network::state::{NetworkState, NodeType};
use crate::utils::ControllerEvent;
use common_utils::HostEvent;
use parking_lot::Mutex;
use serde_json::json;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;
use wg_2024::controller::DroneEvent;
use wg_2024::network::NodeId;

#[tauri::command]
pub fn get_drone_statistics(state: State<Arc<Mutex<NetworkState>>>, node_id: NodeId) -> Value {
    let state = state.lock();
    if let Some(drone_metrics) = state.metrics.drone_metrics.get(&node_id) {
        json!({
            "node_id": node_id,
            "total_packets_sent": drone_metrics.number_of_packets_sent(),
            "total_packets_dropped": drone_metrics.drops,
            "pdr": drone_metrics.current_pdr,
            "shortcuts_used": drone_metrics.shortcuts,
            "packet_type_counts": drone_metrics.packet_type_counts,
        })
    } else {
        json!({ "error": "Drone not found" })
    }
}

#[tauri::command]
pub fn get_all_drones_statistics(state: State<Arc<Mutex<NetworkState>>>) -> Value {
    let state = state.lock();
    let stats_map: HashMap<String, Value> = state
        .metrics
        .drone_metrics
        .iter()
        .map(|(node_id, metrics)| {
            (
                node_id.to_string(),
                json!({
                    "total_packets_sent": metrics.number_of_packets_sent(),
                    "total_packets_dropped": metrics.drops,
                    "pdr": metrics.current_pdr,
                    "shortcuts_used": metrics.shortcuts,
                    "packet_type_counts": metrics.packet_type_counts,
                }),
            )
        })
        .collect();

    json!({ "stats": stats_map })
}

#[tauri::command]
pub fn get_global_statistics(state: State<Arc<Mutex<NetworkState>>>) -> Value {
    let state = state.lock();

    let total_packets_sent: u64 = state
        .metrics
        .drone_metrics
        .values()
        .map(|m| m.number_of_packets_sent())
        .sum();

    let total_packets_dropped: u64 = state.metrics.drone_metrics.values().map(|m| m.drops).sum();

    let mut drones_by_sent: Vec<_> = state
        .metrics
        .drone_metrics
        .iter()
        .map(|(node_id, metrics)| (*node_id, metrics.number_of_packets_sent()))
        .collect();

    let mut drones_by_dropped: Vec<_> = state
        .metrics
        .drone_metrics
        .iter()
        .map(|(node_id, metrics)| (*node_id, metrics.drops))
        .collect();

    // Ordina per numero di pacchetti inviati e pacchetti scartati
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
                    HostEvent::HostMessageSent(destination, message, duration) => json!({
                        "id": message_id,
                        "type": "HostEvent::HostMessageSent",
                        "node": node_id,
                        "message": format!("{:?}", message)
                    }),
                    HostEvent::PacketSent(packet_header) => json!({
                        "id": message_id,
                        "type": "HostEvent::PacketSent",
                        "node": node_id,
                        "packet": format!("{:?}", packet_header)
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
            if let Some(metrics) = state.metrics.drone_metrics.get(&node_id) {
                node_data["pdr"] = json!(metrics.current_pdr);
                node_data["packets_sent"] = json!(metrics.number_of_packets_sent());
                node_data["packets_dropped"] = json!(metrics.drops);
            }
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
            if let Some(metrics) = state.metrics.drone_metrics.get(&node_id) {
                node_data["pdr"] = json!(metrics.current_pdr);
                node_data["packets_sent"] = json!(metrics.number_of_packets_sent());
                node_data["packets_dropped"] = json!(metrics.drops);
            }
        }

        node_data
    } else {
        json!({ "error": "Node not found" })
    }
}

#[tauri::command]
pub fn get_host_stats(state: State<Arc<Mutex<NetworkState>>>, node_id: NodeId) -> Value {
    let state = state.lock();

    if let Some(metrics) = state.metrics.host_metrics.get(&node_id) {
        json!({
            "node_id": node_id,
            "packets_sent": metrics.dest_stats.values().map(|(sent, _)| sent).sum::<u64>(),
            "packets_acked": metrics.dest_stats.values().map(|(_, acked)| acked).sum::<u64>(),
            "shortcuts_used": metrics.shortcuts,
            "packet_type_counts": metrics.packet_type_counts,
            "latencies": metrics.latencies.iter().map(|lat| lat.as_millis()).collect::<Vec<_>>(),
        })
    } else {
        json!({ "error": "Host not found" })
    }
}
