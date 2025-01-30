use crate::network::state::NetworkState;
use parking_lot::Mutex;
use serde_json::json;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;
use wg_2024::controller::DroneEvent;

#[tauri::command]
pub fn get_network_stats(state: State<Arc<Mutex<NetworkState>>>) -> Value {
    let state = state.lock();
    let stats = state.get_all_drone_stats();
    
    json!({
        "stats": stats.iter().map(|(node_id, drone_stats)| {
            (
                node_id.to_string(),
                json!({
                    "packets_sent": drone_stats.packets_sent,
                    "packets_dropped": drone_stats.packets_dropped
                })
            )
        }).collect::<HashMap<_, _>>()
    })
}


#[tauri::command]
pub fn get_received_messages(state: State<Arc<Mutex<NetworkState>>>) -> Value {
    let state = state.lock();
    let messages: Vec<Value> = state.received_messages.iter().map(|event| {
        match event {
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
        }
    }).collect();

    json!({ "messages": messages })
}