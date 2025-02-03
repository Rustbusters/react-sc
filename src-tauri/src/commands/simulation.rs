use crate::network::state::NetworkState;
use log::{debug, error, info};
use parking_lot::Mutex;
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

/// Dynamically adds a new link (sender) between two drone IDs in the runtime graph.
#[tauri::command]
pub fn send_add_sender_command(
    state: State<Arc<Mutex<NetworkState>>>,
    drone_id: u32,
    target_id: u32,
) -> Result<(), String> {
    state
        .lock()
        .send_add_sender_command(drone_id as NodeId, target_id as NodeId)
}

/// Dynamically removes a link (sender) between two drone IDs in the runtime graph.
#[tauri::command]
pub fn send_remove_sender_command(
    state: State<Arc<Mutex<NetworkState>>>,
    drone_id: u32,
    target_id: u32,
) -> Result<(), String> {
    state
        .lock()
        .send_remove_sender_command(drone_id as NodeId, target_id as NodeId)
}

#[tauri::command]
pub fn add_neighbor(
    state: State<Arc<Mutex<NetworkState>>>,
    node_id: NodeId,
    neighbor_id: NodeId,
) -> Result<(), String> {
    let mut state = state.lock();

    if node_id == neighbor_id {
        return Err("Un nodo non può essere connesso a se stesso.".to_string());
    }
    // Assicuriamoci che entrambi i nodi esistano nella rete
    if !state.graph.node_info.contains_key(&node_id) {
        return Err(format!("Nodo {} non trovato nella rete.", node_id));
    }
    if !state.graph.node_info.contains_key(&neighbor_id) {
        return Err(format!("Nodo {} non trovato nella rete.", neighbor_id));
    }

    state.send_add_sender_command(node_id, neighbor_id)?;
    state.send_add_sender_command(neighbor_id, node_id)?;

    Ok(())
}
// TODO: aggiornare il grafo
#[tauri::command]
pub fn remove_neighbor(
    state: State<Arc<Mutex<NetworkState>>>,
    node_id: NodeId,
    neighbor_id: NodeId,
) -> Result<(), String> {
    let mut state = state.lock();

    if node_id == neighbor_id {
        return Err("Un nodo non può essere scollegato da se stesso.".to_string());
    }
    if !state.graph.node_info.contains_key(&node_id) {
        return Err(format!("Nodo {} non trovato nella rete.", node_id));
    }
    if !state.graph.node_info.contains_key(&neighbor_id) {
        return Err(format!("Nodo {} non trovato nella rete.", neighbor_id));
    }

    state.send_remove_sender_command(node_id, neighbor_id)?;
    state.send_remove_sender_command(neighbor_id, node_id)?;

    Ok(())
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
