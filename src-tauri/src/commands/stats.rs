use crate::network::state::{DroneStatsType, NetworkState};
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
    let stats = state.get_all_drone_stats();

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
    let stats = state.get_all_drone_stats();

    if let Some(drone_stats) = stats.get(&node_id) {
        let total_sent = drone_stats
            .events
            .iter()
            .filter(|e| e.event_type == DroneStatsType::PacketsSent)
            .count() as u64;

        let total_dropped = drone_stats
            .events
            .iter()
            .filter(|e| e.event_type == DroneStatsType::PacketsDropped)
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
    let stats = state.get_all_drone_stats();

    let history_map: HashMap<String, Vec<_>> = stats
        .iter()
        .map(|(node_id, drone_stats)| (node_id.to_string(), drone_stats.get_events()))
        .collect();

    json!({ "history": history_map })
}

#[tauri::command]
pub fn get_all_drones_statistics(state: State<Arc<Mutex<NetworkState>>>) -> Value {
    let state = state.lock();
    let stats = state.get_all_drone_stats();

    let stats_map: HashMap<String, Value> = stats
        .iter()
        .map(|(node_id, drone_stats)| {
            let total_sent = drone_stats
                .events
                .iter()
                .filter(|e| e.event_type == DroneStatsType::PacketsSent)
                .count() as u64;

            let total_dropped = drone_stats
                .events
                .iter()
                .filter(|e| e.event_type == DroneStatsType::PacketsDropped)
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
    let stats = state.get_all_drone_stats();

    let mut total_packets_sent = 0;
    let mut total_packets_dropped = 0;
    let mut drones_by_sent: Vec<(NodeId, u64)> = Vec::new();
    let mut drones_by_dropped: Vec<(NodeId, u64)> = Vec::new();

    for (node_id, drone_stats) in stats.iter() {
        let sent = drone_stats
            .events
            .iter()
            .filter(|e| e.event_type == DroneStatsType::PacketsSent)
            .count() as u64;

        let dropped = drone_stats
            .events
            .iter()
            .filter(|e| e.event_type == DroneStatsType::PacketsDropped)
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
pub fn get_received_messages(state: State<Arc<Mutex<NetworkState>>>) -> Value {
    let state = state.lock();
    let messages: Vec<Value> = state
        .received_messages
        .iter()
        .map(|event| match event {
            DroneEvent::PacketSent(packet) => json!({
                "type": "PacketSent",
                "packet": format!("{:?}", packet)
            }),
            DroneEvent::PacketDropped(packet) => json!({
                "type": "PacketDropped",
                "packet": format!("{:?}", packet)
            }),
            DroneEvent::ControllerShortcut(packet) => json!({
                "type": "ControllerShortcut",
                "packet": format!("{:?}", packet)
            }),
        })
        .collect();

    json!({ "messages": messages })
}
