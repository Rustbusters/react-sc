use crate::network::state::{NetworkState, NodeType};
use log::{debug, error, info};
use parking_lot::Mutex;
use serde_json::json;
use serde_json::Value;
use std::sync::Arc;
use tauri::State;
use wg_2024::network::{NodeId, SourceRoutingHeader};
use wg_2024::packet::{Fragment, Packet};

/// Sends a "Crash" command to a specific drone.
/// This calls `send_crash_command` on `NetworkState`.
#[tauri::command]
pub fn send_crash_command(
    state: State<Arc<Mutex<NetworkState>>>,
    drone_id: u32,
) -> Result<(), String> {
    state.lock().send_crash_command(drone_id as NodeId)
}

/// Sets the Packet Drop Rate (PDR) for a specific drone.
#[tauri::command]
pub fn send_set_pdr_command(
    state: State<Arc<Mutex<NetworkState>>>,
    drone_id: u32,
    pdr: u8,
) -> Result<(), String> {
    state.lock().send_set_pdr_command(drone_id as NodeId, pdr)
}

#[tauri::command]
pub fn add_neighbor(
    state: State<Arc<Mutex<NetworkState>>>,
    node_id: NodeId,
    neighbor_id: NodeId,
) -> Result<(), String> {
    let mut state = state.lock();
    state
        .add_neighbor(node_id, neighbor_id)
        .map_err(|e| e.to_string())
}
// TODO: aggiornare il grafo
#[tauri::command]
pub fn remove_neighbor(
    state: State<Arc<Mutex<NetworkState>>>,
    node_id: NodeId,
    neighbor_id: NodeId,
) -> Result<(), String> {
    let mut state = state.lock();
    state
        .remove_neighbor(node_id, neighbor_id)
        .map_err(|e| e.to_string())
}

/// Sends a packet from a specific sender to the network.
#[tauri::command]
pub fn send_packet(
    state: State<Arc<Mutex<NetworkState>>>,
    sender_id: NodeId,
    session_id: u64,
    mut hops: Vec<NodeId>,
    mut hop_index: usize,
    fragment_index: u64,
    total_fragments: u64,
    data: String,
) -> Result<(), String> {
    // 1) Blocco mutuamente esclusivo sullo stato
    let state = state.lock();

    // 2) Verifichiamo che il sender esista davvero nella mappa
    if !state.inter_node_channels.contains_key(&sender_id) {
        let available = state
            .inter_node_channels
            .keys()
            .map(|k| k.to_string())
            .collect::<Vec<_>>()
            .join(", ");
        return Err(format!(
            "Sender ID {} not found in the network. Available {}",
            sender_id, available
        ));
    }

    // 3) Se il primo elemento di `hops` non è `sender_id`, lo inseriamo
    //    e incrementiamo l’hop_index.
    if hops.first().copied() != Some(sender_id) {
        debug!(
            "Adding sender ID {} to the beginning of the hops list",
            sender_id
        );
        hops.insert(0, sender_id);
        hop_index += 1;
    }

    // 4) Creiamo il routing header
    let routing_header = SourceRoutingHeader::new(hops.clone(), hop_index);

    // 5) Creiamo il frammento e poi il pacchetto
    let fragment = Fragment::from_string(fragment_index, total_fragments, data);
    let packet = Packet::new_fragment(routing_header, session_id, fragment);

    // 6) Recuperiamo il canale del nodo in `hops[hop_index]`
    let Some(&dest_node) = hops.get(hop_index) else {
        return Err(format!(
            "Invalid hop_index {} for route of length {}",
            hop_index,
            hops.len()
        ));
    };

    let Some((sender_channel, _receiver)) = state.inter_node_channels.get(&dest_node) else {
        return Err(format!("Next hop ID {} has no valid channel", dest_node));
    };

    // 7) Inviamo il pacchetto
    sender_channel
        .send(packet.clone())
        .map_err(|err| format!("Failed to send packet to hop {}: {:?}", dest_node, err))?;

    info!(
        "Packet successfully sent to node {}: {:?}",
        dest_node, packet
    );
    Ok(())
}

#[tauri::command]
pub fn get_graph(state: State<Arc<Mutex<NetworkState>>>) -> Value {
    let state = state.lock();
    
    let drones: Vec<_> = state.graph.node_info.iter().filter_map(|(&id, meta)| {
        if matches!(meta.node_type, NodeType::Drone) {
            Some(json!({
                "id": id,
                "connected_node_ids": state.graph.adjacency.get(&id).cloned().unwrap_or_default(),
                "pdr": meta.pdr,
            }))
        } else {
            None
        }
    }).collect();

    let clients: Vec<_> = state.graph.node_info.iter().filter_map(|(&id, meta)| {
        if matches!(meta.node_type, NodeType::Client) {
            Some(json!({
                "id": id,
                "connected_drone_ids": state.graph.adjacency.get(&id).cloned().unwrap_or_default(),
            }))
        } else {
            None
        }
    }).collect();

    let servers: Vec<_> = state.graph.node_info.iter().filter_map(|(&id, meta)| {
        if matches!(meta.node_type, NodeType::Server) {
            Some(json!({
                "id": id,
                "connected_drone_ids": state.graph.adjacency.get(&id).cloned().unwrap_or_default(),
            }))
        } else {
            None
        }
    }).collect();
    
    if drones.is_empty() && clients.is_empty() && servers.is_empty() {
        if let Some(config) = &state.initial_config {
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
