use crate::error::NetworkError;
use crate::simulation::metrics::{DroneMetrics, HostMetricsTimePoint, Metrics, PacketTypeLabel};
use crate::simulation::state::SimulationState;
use crate::simulation::topology::NodeMetadata;
use crate::utils::ControllerEvent;
use common_utils::HostEvent;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tauri::State;
use wg_2024::controller::DroneEvent;
use wg_2024::network::NodeId;

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
    state: State<Arc<Mutex<SimulationState>>>,
    last_id: usize,
    max_messages: usize,
) -> Vec<Message> {
    let state = state.lock();
    let total_messages = state.get_received_messages().len();
    let start_index = total_messages.saturating_sub(max_messages).max(last_id);

    if start_index >= total_messages {
        return Vec::new();
    }

    state.get_received_messages()[start_index..]
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
pub fn get_network_infos(state: State<Arc<Mutex<SimulationState>>>) -> Value {
    let state = state.lock();
    let graph = state.get_graph();

    let nodes_info: Vec<_> = graph
        .get_nodes_info()
        .into_iter()
        .map(|(node_id, metadata)| create_node_json(node_id, metadata, &state))
        .collect();

    json!({ "nodes": nodes_info })
}

/// Genera il JSON per un nodo specifico
fn create_node_json(node_id: NodeId, metadata: &NodeMetadata, state: &SimulationState) -> Value {
    let connections = {
        let mut neighbors = state.get_graph().get_neighbors(node_id);
        neighbors.sort();
        neighbors
    };

    let mut node_data = json!({
        "node_id": node_id,
        "type": match metadata {
            NodeMetadata::Drone(_) => "Drone",
            NodeMetadata::Client => "Client",
            NodeMetadata::Server => "Server",
        },
        "connections": connections,
    });

    match metadata {
        NodeMetadata::Drone(drone_metadata) => {
            node_data["pdr"] = json!(drone_metadata.get_pdr());

            if let Some(metrics) = state.get_metrics().drone_metrics.get(&node_id) {
                node_data["current_pdr"] = json!(metrics.current_pdr);
                node_data["packets_sent"] = json!(metrics.number_of_packets_sent());
                node_data["packets_dropped"] = json!(metrics.drops);
                node_data["shortcuts"] = json!(metrics.shortcuts);
            }
        }
        NodeMetadata::Client | NodeMetadata::Server => {
            if let Some(metrics) = state.get_metrics().host_metrics.get(&node_id) {
                node_data["packets_sent"] = json!(metrics.number_of_packets_sent());
                node_data["packets_acked"] = json!(metrics
                    .dest_stats
                    .values()
                    .map(|(_, acked)| acked)
                    .sum::<u64>());
                node_data["shortcuts"] = json!(metrics.shortcuts);
            }
        }
    }

    node_data
}

#[derive(Serialize, Deserialize)]
pub struct NodeInfo {
    pub node_id: NodeId,
    pub node_type: String,
    pub node_group: Option<String>,
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
    state: State<Arc<Mutex<SimulationState>>>,
    node_id: NodeId,
) -> Result<NodeInfo, String> {
    let state = state.lock();
    let graph = &state.get_graph();

    let metadata = graph
        .get_node_type(node_id)
        .ok_or_else(|| format!("Node {} not found", node_id))?;

    let connections = {
        let mut neighbors = graph.get_neighbors(node_id);
        neighbors.sort();
        neighbors
    };

    let node_info = NodeInfo {
        node_id,
        node_type: get_node_type_string(metadata),
        node_group: match metadata {
            NodeMetadata::Drone(drone) => drone.get_group(),
            _ => None,
        },
        connections,
        metrics: create_node_metrics(node_id, metadata, &state),
    };

    Ok(node_info)
}

/// Restituisce il tipo del nodo come stringa
fn get_node_type_string(metadata: &NodeMetadata) -> String {
    match metadata {
        NodeMetadata::Drone(_) => "Drone".to_string(),
        NodeMetadata::Client => "Client".to_string(),
        NodeMetadata::Server => "Server".to_string(),
    }
}

/// Genera le metriche per un nodo
fn create_node_metrics(
    node_id: NodeId,
    metadata: &NodeMetadata,
    state: &SimulationState,
) -> NodeMetrics {
    match metadata {
        NodeMetadata::Drone(drone_metadata) => {
            let drone_metrics = state.get_metrics().drone_metrics.get(&node_id);
            NodeMetrics::Drone {
                pdr: drone_metadata.get_pdr(),
                current_pdr: drone_metrics.map_or(0.0, |m| m.current_pdr),
                packets_sent: drone_metrics.map_or(0, |m| m.number_of_packets_sent()),
                packets_dropped: drone_metrics.map_or(0, |m| m.drops),
                shortcuts_used: drone_metrics.map_or(0, |m| m.shortcuts),
                packet_type_counts: drone_metrics
                    .map_or_else(HashMap::new, |m| m.packet_type_counts.clone()),
            }
        }
        NodeMetadata::Client | NodeMetadata::Server => {
            let host_metrics = state.get_metrics().host_metrics.get(&node_id);
            NodeMetrics::Host {
                packets_sent: host_metrics.map_or(0, |m| m.number_of_packets_sent()),
                packets_acked: host_metrics
                    .map_or(0, |m| m.dest_stats.values().map(|(_, acked)| acked).sum()),
                shortcuts_used: host_metrics.map_or(0, |m| m.shortcuts),
                packet_type_counts: host_metrics
                    .map_or_else(HashMap::new, |m| m.packet_type_counts.clone()),
                latencies: host_metrics.map_or(vec![], |m| {
                    m.latencies
                        .iter()
                        .map(|lat| lat.as_millis() as u64)
                        .collect()
                }),
            }
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct OverviewMetrics {
    total_messages_sent: u64,
    total_packets_sent: u64,
    packets_by_type: HashMap<PacketTypeLabel, u64>,
    heatmap: HashMap<String, u64>,
}

#[tauri::command]
pub fn get_overview_metrics(
    state: State<Arc<Mutex<SimulationState>>>,
) -> Result<OverviewMetrics, String> {
    let state = state.lock();
    let metrics = state.get_metrics();

    let total_messages_sent = metrics
        .host_metrics
        .values()
        .map(|m| m.number_of_messages_sent())
        .sum();

    let packets_by_type = aggregate_packets_by_type(metrics);
    let total_packets_sent = packets_by_type.values().sum();
    let heatmap = format_heatmap(&metrics.global_heatmap);

    Ok(OverviewMetrics {
        total_messages_sent,
        total_packets_sent,
        packets_by_type,
        heatmap,
    })
}

/// Aggrega il conteggio dei pacchetti inviati da droni e host
fn aggregate_packets_by_type(metrics: &Metrics) -> HashMap<PacketTypeLabel, u64> {
    let mut packets_by_type: HashMap<PacketTypeLabel, u64> = HashMap::new();

    for drone_metrics in metrics.drone_metrics.values() {
        for (&packet_type, &count) in &drone_metrics.packet_type_counts {
            *packets_by_type.entry(packet_type).or_insert(0) += count;
        }
    }

    for host_metrics in metrics.host_metrics.values() {
        for (&packet_type, &count) in &host_metrics.packet_type_counts {
            *packets_by_type.entry(packet_type).or_insert(0) += count;
        }
    }

    packets_by_type
}

/// Converte la heatmap in un formato leggibile (Stringa -> u64)
fn format_heatmap(global_heatmap: &HashMap<(NodeId, NodeId), u64>) -> HashMap<String, u64> {
    global_heatmap
        .iter()
        .map(|((src, dest), &count)| (format!("{},{}", src, dest), count))
        .collect()
}

#[tauri::command]
pub fn get_drone_metrics(
    state: State<Arc<Mutex<SimulationState>>>,
    node_id: NodeId,
) -> Result<DroneMetrics, NetworkError> {
    let state = state.lock();

    state
        .get_metrics()
        .drone_metrics
        .get(&node_id)
        .cloned()
        .ok_or_else(|| NetworkError::NodeNotFound(node_id.to_string()))
}

#[derive(Serialize, Deserialize)]
pub struct HostStats {
    latencies: Vec<Duration>,
    number_of_fragment_sent: u64,
    time_series: Vec<HostMetricsTimePoint>,
}

#[tauri::command]
pub fn get_host_metrics(
    state: State<Arc<Mutex<SimulationState>>>,
    node_id: NodeId,
) -> Result<HostStats, NetworkError> {
    let state = state.lock();
    let host_metrics = state
        .get_metrics()
        .host_metrics
        .get(&node_id)
        .ok_or_else(|| NetworkError::NodeNotFound(node_id.to_string()))?;

    Ok(HostStats {
        latencies: host_metrics.latencies.clone(),
        number_of_fragment_sent: host_metrics.number_of_fragments_sent(),
        time_series: host_metrics.time_series.clone(),
    })
}
