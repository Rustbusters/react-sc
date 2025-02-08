use crate::error::NetworkError;
use crate::network::network_initializer::create_new_drone;
use crate::network::state::{NetworkState, NetworkStatus, NodeMetadata};
use crate::network::validation::validate_graph;
use parking_lot::Mutex;
use serde_json::json;
use serde_json::Value;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use wg_2024::config::{Config, Drone};
use wg_2024::network::{NodeId, SourceRoutingHeader};
use wg_2024::packet::{FloodRequest, FloodResponse, Fragment, Nack, NackType, NodeType, Packet};

/// Sends a "Crash" command to a specific drone.
/// This calls `crash_command` on `NetworkState`.
#[tauri::command]
pub fn crash_command(
    state: State<Arc<Mutex<NetworkState>>>,
    drone_id: u32,
) -> Result<(), NetworkError> {
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
) -> Result<(), NetworkError> {
    let mut state = state.lock();
    state.add_neighbor(node_id, neighbor_id)
}

#[tauri::command]
pub fn remove_neighbor(
    state: State<Arc<Mutex<NetworkState>>>,
    node_id: NodeId,
    neighbor_id: NodeId,
) -> Result<(), NetworkError> {
    let mut state = state.lock();
    state.remove_neighbor(node_id, neighbor_id)
}

#[tauri::command]
pub fn add_drone(
    state: State<Arc<Mutex<NetworkState>>>,
    connected_node_ids: Vec<NodeId>,
    pdr: f32,
) -> Result<NodeId, NetworkError> {
    let mut state = state.lock();

    if state.get_status() != NetworkStatus::Running {
        match state.initial_config.as_mut() {
            None => {
                return Err(NetworkError::NoConfigLoaded);
            }
            Some(config) => {
                let how_many_nodes = config.drone.len() + config.client.len() + config.server.len();
                let mut drone_id = how_many_nodes as NodeId;

                while config.drone.iter().any(|d| d.id == drone_id)
                    || config.client.iter().any(|c| c.id == drone_id)
                    || config.server.iter().any(|s| s.id == drone_id)
                {
                    drone_id += 1;
                }

                let mut drone = Drone {
                    id: drone_id,
                    connected_node_ids: connected_node_ids.clone(),
                    pdr,
                };

                for &neighbor_id in &connected_node_ids {
                    if let Some(neighbor) = config.drone.iter_mut().find(|d| d.id == neighbor_id) {
                        if !neighbor.connected_node_ids.contains(&drone_id) {
                            neighbor.connected_node_ids.push(drone_id);
                        }
                    } else if let Some(neighbor) =
                        config.client.iter_mut().find(|c| c.id == neighbor_id)
                    {
                        if !neighbor.connected_drone_ids.contains(&drone_id) {
                            neighbor.connected_drone_ids.push(drone_id);
                        }
                    } else if let Some(neighbor) =
                        config.server.iter_mut().find(|s| s.id == neighbor_id)
                    {
                        if !neighbor.connected_drone_ids.contains(&drone_id) {
                            neighbor.connected_drone_ids.push(drone_id);
                        }
                    }
                }

                config.drone.push(drone);

                return Ok(drone_id);
            }
        }
    }

    let mut drone_id = state.graph.node_info.len() as NodeId;
    while state.inter_node_channels.contains_key(&drone_id) {
        drone_id += 1;
    }

    let mut new_graph = state.graph.clone();

    new_graph.node_info.insert(
        drone_id,
        NodeMetadata {
            node_type: crate::network::state::NodeType::Drone,
            node_group: None, // it will be set later
            pdr,
            crashed: false,
        },
    );

    for &neighbor_id in &connected_node_ids {
        new_graph
            .adjacency
            .entry(drone_id)
            .or_insert_with(Vec::new)
            .push(neighbor_id);
        new_graph
            .adjacency
            .entry(neighbor_id)
            .or_insert_with(Vec::new)
            .push(drone_id);
    }

    validate_graph(&new_graph, state.get_strict_mode())?;

    state.graph = new_graph;

    state
        .metrics
        .drone_metrics
        .insert(drone_id, Default::default());

    create_new_drone(&mut state, drone_id, connected_node_ids, pdr)
}

#[tauri::command]
pub fn send_packet(
    state: State<Arc<Mutex<NetworkState>>>,
    sender_id: NodeId,
    session_id: u64,
    packet_type: String,
    hops: Vec<NodeId>,
    fragment_index: Option<u64>,
    total_fragments: Option<u64>,
    data: Option<String>,
    nack_type: Option<String>,
    error_node: Option<NodeId>,
) -> Result<(), NetworkError> {
    let mut net_state = state.lock();
    match packet_type.as_str() {
        "MsgFragment" => {
            let fi = fragment_index
                .ok_or_else(|| NetworkError::ValidationError("fragment_index missing".into()))?;
            let tot = total_fragments.unwrap_or(1);
            let data_str = data.unwrap_or_default();
            let fragment = Fragment::from_string(fi, tot, data_str);
            let routing_header = SourceRoutingHeader::new(hops.clone(), 0);
            let packet = Packet::new_fragment(routing_header, session_id, fragment);
            do_send_packet(&mut net_state, sender_id, session_id, packet, hops, 0)
        }
        "Ack" => {
            let fi = fragment_index
                .ok_or_else(|| NetworkError::ValidationError("fragment_index missing".into()))?;
            let routing_header = SourceRoutingHeader::new(hops.clone(), 0);
            let packet = Packet::new_ack(routing_header, session_id, fi);
            do_send_packet(&mut net_state, sender_id, session_id, packet, hops, 0)
        }
        "Nack" => {
            let fi = fragment_index
                .ok_or_else(|| NetworkError::ValidationError("fragment_index missing".into()))?;
            let nt = nack_type.unwrap_or_else(|| "Dropped".into());
            let nack_packet = match nt.as_str() {
                "ErrorInRouting" => {
                    let enode = error_node.ok_or_else(|| {
                        NetworkError::ValidationError(
                            "error_node required for ErrorInRouting".into(),
                        )
                    })?;
                    Nack {
                        fragment_index: fi,
                        nack_type: NackType::ErrorInRouting(enode),
                    }
                }
                "UnexpectedRecipient" => {
                    let enode = error_node.ok_or_else(|| {
                        NetworkError::ValidationError(
                            "error_node required for UnexpectedRecipient".into(),
                        )
                    })?;
                    Nack {
                        fragment_index: fi,
                        nack_type: NackType::UnexpectedRecipient(enode),
                    }
                }
                "DestinationIsDrone" => Nack {
                    fragment_index: fi,
                    nack_type: NackType::DestinationIsDrone,
                },
                _ | "Dropped" => Nack {
                    fragment_index: fi,
                    nack_type: NackType::Dropped,
                },
            };
            let routing_header = SourceRoutingHeader::new(hops.clone(), 0);
            let packet = Packet::new_nack(routing_header, session_id, nack_packet);
            do_send_packet(&mut net_state, sender_id, session_id, packet, hops, 0)
        }
        "FloodRequest" => {
            let flood_request = FloodRequest::initialize(0, sender_id, NodeType::Client);
            let routing_header = SourceRoutingHeader::new(hops.clone(), 0);
            let packet = Packet::new_flood_request(routing_header, session_id, flood_request);
            do_send_packet(&mut net_state, sender_id, session_id, packet, hops, 0)
        }
        "FloodResponse" => {
            let flood_response = FloodResponse {
                flood_id: 0,
                path_trace: vec![],
            };
            let routing_header = SourceRoutingHeader::new(hops.clone(), 0);
            let packet = Packet::new_flood_response(routing_header, session_id, flood_response);
            do_send_packet(&mut net_state, sender_id, session_id, packet, hops, 0)
        }
        _ => Err(NetworkError::Other("Invalid packet type".into())),
    }
}

// --- Helper: Internal Packet Sending Function ---
fn do_send_packet(
    state: &mut NetworkState,
    sender_id: NodeId,
    session_id: u64,
    packet: Packet,
    hops: Vec<NodeId>,
    hop_index: usize,
) -> Result<(), NetworkError> {
    if !state.inter_node_channels.contains_key(&sender_id) {
        let available_nodes = state
            .inter_node_channels
            .keys()
            .map(|k| k.to_string())
            .collect::<Vec<_>>()
            .join(", ");
        return Err(NetworkError::NodeNotFound(format!(
            "Sender ID {} not found in the network. Available nodes: {}",
            sender_id, available_nodes
        )));
    }

    let mut hops = hops;
    let mut hop_index = hop_index;
    if hops.first().copied() != Some(sender_id) {
        log::debug!(
            "Adding sender ID {} to the beginning of the hops list",
            sender_id
        );
        hops.insert(0, sender_id);
        hop_index += 1;
    }
    let routing_header = SourceRoutingHeader::new(hops.clone(), hop_index);
    // (Assume that packet’s routing_header is set appropriately.)
    let next_node = hops.get(hop_index).copied().ok_or_else(|| {
        NetworkError::ValidationError(format!(
            "Invalid hop_index {} for a route of length {}",
            hop_index,
            hops.len()
        ))
    })?;
    let (sender_channel, _receiver) = state
        .inter_node_channels
        .get(&next_node)
        .ok_or(NetworkError::ChannelNotFound(next_node))?;

    sender_channel.send(packet.clone()).map_err(|err| {
        NetworkError::SendError(format!(
            "Failed to send packet to node {}: {:?}",
            next_node, err
        ))
    })?;
    log::info!(
        "Packet successfully sent to node {}: {:?}",
        next_node,
        packet
    );
    Ok(())
}

// --- Command: Start Repeated Sending ---
#[tauri::command]
pub fn start_repeated_sending(
    app_handle: AppHandle,
    // Global network state (managed via Tauri)
    state: State<Arc<Mutex<NetworkState>>>,
    // Packet parameters:
    sender_id: NodeId,
    session_id: u64,
    packet_type: String,
    hops: Vec<NodeId>,
    fragment_index: Option<u64>,
    total_fragments: Option<u64>,
    data: Option<String>,
    nack_type: Option<String>,
    error_node: Option<NodeId>,
    batch_count: u64,
    interval: u64,
    random_mode: bool,
    // The repeated sender state – a shared Option<Arc<AtomicBool>>
    repeated_state: State<Arc<Mutex<Option<Arc<AtomicBool>>>>>,
) -> Result<(), String> {
    // Lock our repeated state.
    let mut rep_state = repeated_state.lock();
    if rep_state.is_some() {
        return Err("A sending job is already running".into());
    }
    // Create a cancellation flag.
    let cancel_flag = Arc::new(AtomicBool::new(false));
    *rep_state = Some(cancel_flag.clone());
    // Clone the repeated state Arc so we can clear it later.
    let repeated_state_arc = repeated_state.inner().clone();

    let app_handle_clone = app_handle.clone();
    let hops_clone = hops.clone();
    // Extract the inner network state Arc so that it becomes 'static.
    let state_arc = state.inner().clone();

    std::thread::spawn(move || {
        let mut sent = 0;
        while sent < batch_count && !cancel_flag.load(Ordering::Relaxed) {
            // If random_mode is enabled, generate randomized values.
            let (sid, sess_id, pkt_type, frag_idx, tot_frag, pkt_data, nack, err_node, route) =
                if random_mode {
                    (
                        // Random sender id between 1 and 10:
                        (rand::random::<u8>() % 10) + 1,
                        rand::random::<u64>() % 10000,
                        packet_type.clone(),
                        Some(rand::random::<u64>() % 10),
                        if packet_type == "MsgFragment" {
                            Some((rand::random::<u64>() % 10) + 1)
                        } else {
                            None
                        },
                        Some("Random Data".to_string()),
                        if packet_type == "Nack" {
                            Some("Dropped".to_string())
                        } else {
                            None
                        },
                        if packet_type == "Nack" {
                            Some((rand::random::<u8>() % 10) + 1)
                        } else {
                            None
                        },
                        hops_clone.clone(),
                    )
                } else {
                    (
                        sender_id,
                        session_id,
                        packet_type.clone(),
                        fragment_index,
                        total_fragments,
                        data.clone(),
                        nack_type.clone(),
                        error_node,
                        hops_clone.clone(),
                    )
                };

            let send_result = {
                // Use our cloned network state (an owned Arc<Mutex<NetworkState>>)
                let mut net_state = state_arc.lock();
                match pkt_type.as_str() {
                    "MsgFragment" => {
                        let fi = frag_idx.expect("fragment_index missing");
                        let tot = tot_frag.unwrap_or(1);
                        let data_str = pkt_data.unwrap_or_default();
                        let fragment = Fragment::from_string(fi, tot, data_str);
                        let routing_header = SourceRoutingHeader::new(route.clone(), 0);
                        let packet = Packet::new_fragment(routing_header, sess_id, fragment);
                        do_send_packet(&mut net_state, sid, sess_id, packet, route.clone(), 0)
                    }
                    "Ack" => {
                        let fi = frag_idx.expect("fragment_index missing");
                        let routing_header = SourceRoutingHeader::new(route.clone(), 0);
                        let packet = Packet::new_ack(routing_header, sess_id, fi);
                        do_send_packet(&mut net_state, sid, sess_id, packet, route.clone(), 0)
                    }
                    "Nack" => {
                        let fi = frag_idx.expect("fragment_index missing");
                        let nt = nack.unwrap_or_else(|| "Dropped".into());
                        let nack_packet = match nt.as_str() {
                            "ErrorInRouting" => {
                                let enode =
                                    err_node.expect("error_node required for ErrorInRouting");
                                Nack {
                                    fragment_index: fi,
                                    nack_type: NackType::ErrorInRouting(enode),
                                }
                            }
                            "UnexpectedRecipient" => {
                                let enode =
                                    err_node.expect("error_node required for UnexpectedRecipient");
                                Nack {
                                    fragment_index: fi,
                                    nack_type: NackType::UnexpectedRecipient(enode),
                                }
                            }
                            "DestinationIsDrone" => Nack {
                                fragment_index: fi,
                                nack_type: NackType::DestinationIsDrone,
                            },
                            _ => Nack {
                                fragment_index: fi,
                                nack_type: NackType::Dropped,
                            },
                        };
                        let routing_header = SourceRoutingHeader::new(route.clone(), 0);
                        let packet = Packet::new_nack(routing_header, sess_id, nack_packet);
                        do_send_packet(&mut net_state, sid, sess_id, packet, route.clone(), 0)
                    }
                    "FloodRequest" => {
                        let flood_request = FloodRequest::initialize(0, sid, NodeType::Client);
                        let routing_header = SourceRoutingHeader::new(route.clone(), 0);
                        let packet =
                            Packet::new_flood_request(routing_header, sess_id, flood_request);
                        do_send_packet(&mut net_state, sid, sess_id, packet, route.clone(), 0)
                    }
                    "FloodResponse" => {
                        let flood_response = FloodResponse {
                            flood_id: 0,
                            path_trace: vec![],
                        };
                        let routing_header = SourceRoutingHeader::new(route.clone(), 0);
                        let packet =
                            Packet::new_flood_response(routing_header, sess_id, flood_response);
                        do_send_packet(&mut net_state, sid, sess_id, packet, route.clone(), 0)
                    }
                    _ => Err(NetworkError::Other("Invalid packet type".into())),
                }
            };

            if let Err(e) = send_result {
                log::error!("Failed to send packet {}: {:?}", sent, e);
            } else {
                sent += 1;
            }
            // Emit a status update to the frontend.
            let status = json!({ "sent": sent, "remaining": batch_count - sent });
            app_handle_clone
                .emit("packet-sending-status", status)
                .unwrap();
            std::thread::sleep(std::time::Duration::from_millis(interval));
        }
        // When finished (or cancelled), clear the repeated state.
        repeated_state_arc.lock().take();
        // Emit a completion event.
        let complete = json!({ "sent": sent });
        app_handle_clone
            .emit("packet-sending-complete", complete)
            .unwrap();
    });

    Ok(())
}

// --- Command: Stop Repeated Sending ---
#[tauri::command]
pub fn stop_repeated_sending(
    repeated_state: State<Arc<Mutex<Option<Arc<AtomicBool>>>>>,
) -> Result<(), String> {
    let mut rep_state = repeated_state.lock();
    if rep_state.is_some() {
        // Take the cancellation flag out (this sets the state back to None).
        rep_state.take();
        Ok(())
    } else {
        Err("No sending job is currently running".into())
    }
}

#[tauri::command]
pub fn get_graph(state: State<Arc<Mutex<NetworkState>>>) -> Value {
    let state = state.lock();

    let drones: Vec<_> = state.graph.node_info.iter().filter_map(|(&id, meta)| {
        if matches!(meta.node_type, crate::network::state::NodeType::Drone) {
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
        if matches!(meta.node_type, crate::network::state::NodeType::Client) {
            Some(json!({
                "id": id,
                "connected_drone_ids": state.graph.adjacency.get(&id).cloned().unwrap_or_default(),
            }))
        } else {
            None
        }
    }).collect();

    let servers: Vec<_> = state.graph.node_info.iter().filter_map(|(&id, meta)| {
        if matches!(meta.node_type, crate::network::state::NodeType::Server) {
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
