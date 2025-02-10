use crate::error::NetworkError;
use crate::simulation::state::SimulationState;
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State;
use wg_2024::network::{NodeId, SourceRoutingHeader};
use wg_2024::packet::{FloodRequest, FloodResponse, Fragment, Nack, NackType, Packet};

#[tauri::command]
pub fn crash_drone(
    // TODO: valutare di rimuoverlo
    state: State<Arc<Mutex<SimulationState>>>,
    drone_id: NodeId,
) -> Result<(), NetworkError> {
    let mut sim_state = state.lock();

    crate::simulation::controller::crash_drone(&mut sim_state, drone_id)?;
    Ok(())
}

#[tauri::command]
pub fn set_pdr(
    state: State<Arc<Mutex<SimulationState>>>,
    drone_id: NodeId,
    pdr: u8,
) -> Result<(), NetworkError> {
    let mut sim_state = state.lock();

    crate::simulation::controller::set_pdr(&mut sim_state, drone_id, pdr)?;
    Ok(())
}

#[tauri::command]
pub fn send_packet(
    state: tauri::State<Arc<Mutex<SimulationState>>>,
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
                .ok_or_else(|| NetworkError::Other("fragment_index missing".into()))?;
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
                _ => Nack {
                    fragment_index: fi,
                    nack_type: NackType::Dropped,
                },
            };
            let routing_header = SourceRoutingHeader::new(hops.clone(), 0);
            let packet = Packet::new_nack(routing_header, session_id, nack_packet);
            do_send_packet(&mut net_state, sender_id, session_id, packet, hops, 0)
        }
        "FloodRequest" => {
            let flood_request =
                FloodRequest::initialize(0, sender_id, wg_2024::packet::NodeType::Client);
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
    state: &mut SimulationState,
    sender_id: NodeId,
    _session_id: u64,
    packet: Packet,
    mut hops: Vec<NodeId>,
    mut hop_index: usize,
) -> Result<(), NetworkError> {
    if !state.get_inter_node_channels().contains_key(&sender_id) {
        let available_nodes = state
            .get_inter_node_channels()
            .keys()
            .map(|k| k.to_string())
            .collect::<Vec<_>>()
            .join(", ");
        return Err(NetworkError::NodeNotFound(format!(
            "Sender ID {} not found in the network. Available nodes: {}",
            sender_id, available_nodes
        )));
    }

    // Ensure the sender is at the beginning of the hops list.
    if hops.first().copied() != Some(sender_id) {
        log::debug!(
            "Adding sender ID {} to the beginning of the hops list",
            sender_id
        );
        hops.insert(0, sender_id);
        hop_index += 1;
    }
    let next_node = hops.get(hop_index).copied().ok_or_else(|| {
        NetworkError::ValidationError(format!(
            "Invalid hop_index {} for a route of length {}",
            hop_index,
            hops.len()
        ))
    })?;
    let (sender_channel, _receiver) = state
        .get_inter_node_channels()
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
