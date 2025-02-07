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

#[derive(Serialize, Deserialize, Debug)]
pub enum EventType {
    PacketSent,
    PacketDropped,
    ControllerShortcut,
    HostMessageSent,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Message {
    pub id: usize,
    pub event_type: EventType,
    pub node: NodeId,
    pub node_type: String, // New field: "Host" or "Drone"
    pub packet: String,
}

#[tauri::command]
pub fn get_new_messages(
    state: State<Arc<Mutex<NetworkState>>>,
    last_id: usize,
    max_messages: usize,
) -> Vec<Message> {
    let state = state.lock();
    let total_messages = state.received_messages.len();
    let start_index = total_messages.saturating_sub(max_messages).max(last_id);

    state.received_messages[start_index..]
        .iter()
        .enumerate()
        .map(|(idx, event)| {
            let message_id = start_index + idx;
            match event {
                // FIXME: panics here
                ControllerEvent::Drone { node_id, event } => {
                    let node_type = "Drone".to_string();
                    match event {
                        DroneEvent::PacketSent(packet) => Message {
                            id: message_id,
                            event_type: EventType::PacketSent,
                            node: *node_id,
                            node_type,
                            packet: format!("{:?}", packet),
                        },
                        DroneEvent::PacketDropped(packet) => Message {
                            id: message_id,
                            event_type: EventType::PacketDropped,
                            node: *node_id,
                            node_type,
                            packet: format!("{:?}", packet),
                        },
                        DroneEvent::ControllerShortcut(packet) => Message {
                            id: message_id,
                            event_type: EventType::ControllerShortcut,
                            node: *node_id,
                            node_type,
                            packet: format!("{:?}", packet),
                        },
                    }
                }
                ControllerEvent::Host { node_id, event } => {
                    let node_type = "Host".to_string();
                    match event {
                        HostEvent::HostMessageSent(_, message, _) => Message {
                            id: message_id,
                            event_type: EventType::HostMessageSent,
                            node: *node_id,
                            node_type,
                            packet: format!("{:?}", message),
                        },
                        HostEvent::PacketSent(packet_header) => Message {
                            id: message_id,
                            event_type: EventType::PacketSent, // Renamed from HostPacketSent
                            node: *node_id,
                            node_type,
                            packet: format!("{:?}", packet_header),
                        },
                        HostEvent::ControllerShortcut(packet) => Message {
                            id: message_id,
                            event_type: EventType::ControllerShortcut,
                            node: *node_id,
                            node_type,
                            packet: format!("{:?}", packet),
                        },
                    }
                }
            }
        })
        .collect()
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

            if let Some(metrics) = state.metrics.drone_metrics.get(&node_id) {
                node_data["current_pdr"] = json!(metrics.current_pdr);
                node_data["packets_sent"] = json!(metrics.number_of_packets_sent());
                node_data["packets_dropped"] = json!(metrics.drops);
                node_data["shortcuts"] = json!(metrics.shortcuts);
            }
        } else if let Some(metrics) = state.metrics.host_metrics.get(&node_id) {
            node_data["packets_sent"] = json!(metrics.number_of_packets_sent()); // TODO: pacchetti inviati, non MsgFragment inviati
            node_data["packets_acked"] = json!(metrics
                .dest_stats
                .values()
                .map(|(_, acked)| acked)
                .sum::<u64>());
            node_data["shortcuts"] = json!(metrics.shortcuts);
        }

        nodes_info.push(node_data);
    }

    json!({ "nodes": nodes_info })
}

use crate::network::metrics::PacketTypeLabel;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct NodeInfo {
    pub node_id: NodeId,
    pub node_type: String,
    pub connections: Vec<NodeId>,
    pub metrics: NodeMetrics,
}

#[derive(Serialize, Deserialize)]
#[serde(tag = "category")]
pub enum NodeMetrics {
    Drone {
        pdr: f32,
        current_pdr: f32,
        packets_sent: u64,
        packets_dropped: u64,
        shortcuts_used: u64,
        packet_type_counts: HashMap<PacketTypeLabel, u64>,
    },
    Host {
        packets_sent: u64,
        packets_acked: u64,
        shortcuts_used: u64,
        packet_type_counts: HashMap<PacketTypeLabel, u64>,
        latencies: Vec<u64>, // Millisecondi
    },
    None, // Per nodi senza metriche
}

#[tauri::command]
pub fn get_node_info(
    state: State<Arc<Mutex<NetworkState>>>,
    node_id: NodeId,
) -> Result<NodeInfo, String> {
    let state = state.lock();

    let metadata = state
        .graph
        .node_info
        .get(&node_id)
        .ok_or_else(|| format!("Node {} not found", node_id))?;

    let connections = state
        .graph
        .adjacency
        .get(&node_id)
        .cloned()
        .unwrap_or_default();

    let node_type = match metadata.node_type {
        NodeType::Drone => "Drone",
        NodeType::Client => "Client",
        NodeType::Server => "Server",
    };

    let metrics = match metadata.node_type {
        NodeType::Drone => {
            let drone_metrics = state.metrics.drone_metrics.get(&node_id);
            NodeMetrics::Drone {
                pdr: metadata.pdr,
                current_pdr: drone_metrics.map_or(0.0, |m| m.current_pdr),
                packets_sent: drone_metrics.map_or(0, |m| m.number_of_packets_sent()),
                packets_dropped: drone_metrics.map_or(0, |m| m.drops),
                shortcuts_used: drone_metrics.map_or(0, |m| m.shortcuts),
                packet_type_counts: drone_metrics
                    .map_or(HashMap::new(), |m| m.packet_type_counts.clone()),
            }
        }
        NodeType::Client | NodeType::Server => {
            let host_metrics = state.metrics.host_metrics.get(&node_id);
            NodeMetrics::Host {
                packets_sent: host_metrics.map_or(0, |m| m.number_of_packets_sent()),
                packets_acked: host_metrics
                    .map_or(0, |m| m.dest_stats.values().map(|(_, acked)| acked).sum()),
                shortcuts_used: host_metrics.map_or(0, |m| m.shortcuts),
                packet_type_counts: host_metrics
                    .map_or(HashMap::new(), |m| m.packet_type_counts.clone()),
                latencies: host_metrics.map_or(vec![], |m| {
                    m.latencies
                        .iter()
                        .map(|lat| lat.as_millis() as u64)
                        .collect()
                }),
            }
        }
    };

    Ok(NodeInfo {
        node_id,
        node_type: node_type.to_string(),
        connections,
        metrics,
    })
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
