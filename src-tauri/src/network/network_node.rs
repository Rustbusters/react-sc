use crate::error::NetworkError;
use crate::network::state::NetworkState;
use crossbeam_channel::unbounded;
use node::SimpleHost;
use std::collections::HashMap;
use std::thread;
use rustbusters_drone::RustBustersDrone;
use wg_2024::drone::Drone;

pub fn initialize_drones(state: &mut NetworkState) -> Result<(), NetworkError> {
    let config = state.config.as_ref().ok_or(NetworkError::NoConfigLoaded)?;
    for drone in &config.drone {
        let (controller_to_drone_sender, drone_from_controller_receiver) = unbounded();
        let (drone_to_controller_sender, controller_from_drone_receiver) = unbounded();

        state.simulation_controller_channels.insert(
            drone.id,
            (
                controller_to_drone_sender.clone(),
                controller_from_drone_receiver,
            ),
        );

        // Initialize intra_node_channels for this drone if not already present
        state
            .intra_node_channels
            .entry(drone.id)
            .or_insert_with(|| {
                let (packet_sender, packet_receiver) = unbounded();
                (packet_sender, packet_receiver)
            });

        let packet_recv = state
            .intra_node_channels
            .get(&drone.id)
            .ok_or(NetworkError::ChannelNotFound(drone.id))?
            .1
            .clone();

        let mut packet_send = HashMap::new();
        for &neighbour in &drone.connected_node_ids {
            // Initialize intra_node_channels for the neighbour if not already present
            state
                .intra_node_channels
                .entry(neighbour)
                .or_insert_with(|| {
                    let (packet_sender, packet_receiver) = unbounded();
                    (packet_sender, packet_receiver)
                });

            let sender = state
                .intra_node_channels
                .get(&neighbour)
                .ok_or(NetworkError::ChannelNotFound(neighbour))?
                .0
                .clone();

            packet_send.insert(neighbour, sender);
        }

        let drone_clone = drone.clone();
        let handle = thread::spawn(move || {
            let mut drone = RustBustersDrone::new(
                drone_clone.id,
                drone_to_controller_sender,
                drone_from_controller_receiver,
                packet_recv,
                packet_send,
                drone_clone.pdr,
            );

            drone.run();
        });

        state.handles.push(handle);
    }
    Ok(())
}

pub fn initialize_clients(state: &mut NetworkState) -> Result<(), NetworkError> {
    let config = state.config.as_ref().ok_or(NetworkError::NoConfigLoaded)?;

    for client in &config.client {
        let (controller_to_client_sender, client_from_controller_receiver) = unbounded();
        let (client_to_controller_sender, controller_from_client_receiver) = unbounded();

        state.client_controller_channels.insert(
            client.id,
            (
                controller_to_client_sender.clone(),
                controller_from_client_receiver,
            ),
        );

        // Initialize intra_node_channels for this client if not already present
        state
            .intra_node_channels
            .entry(client.id)
            .or_insert_with(|| {
                let (packet_sender, packet_receiver) = unbounded();
                (packet_sender, packet_receiver)
            });

        let packet_recv = state
            .intra_node_channels
            .get(&client.id)
            .ok_or(NetworkError::ChannelNotFound(client.id))?
            .1
            .clone();

        let mut packet_send = HashMap::new();
        for &neighbour in &client.connected_drone_ids {
            // Initialize intra_node_channels for the neighbour if not already present
            state
                .intra_node_channels
                .entry(neighbour)
                .or_insert_with(|| {
                    let (packet_sender, packet_receiver) = unbounded();
                    (packet_sender, packet_receiver)
                });

            let sender = state
                .intra_node_channels
                .get(&neighbour)
                .ok_or(NetworkError::ChannelNotFound(neighbour))?
                .0
                .clone();

            packet_send.insert(neighbour, sender);
        }

        let client_clone = client.clone();
        let handle = thread::spawn(move || {
            let mut client = SimpleHost::new(
                client_clone.id,
                wg_2024::packet::NodeType::Client,
                client_to_controller_sender,
                client_from_controller_receiver,
                packet_recv,
                packet_send,
            );
            client.run();
        });

        state.handles.push(handle);
    }
    Ok(())
}

pub fn initialize_servers(state: &mut NetworkState) -> Result<(), NetworkError> {
    let config = state.config.as_ref().ok_or(NetworkError::NoConfigLoaded)?;

    for server in &config.server {
        let (controller_to_server_sender, server_from_controller_receiver) = unbounded();
        let (server_to_controller_sender, controller_from_server_receiver) = unbounded();

        state.server_controller_channels.insert(
            server.id,
            (
                controller_to_server_sender.clone(),
                controller_from_server_receiver,
            ),
        );

        // Initialize intra_node_channels for this server if not already present
        state
            .intra_node_channels
            .entry(server.id)
            .or_insert_with(|| {
                let (packet_sender, packet_receiver) = unbounded();
                (packet_sender, packet_receiver)
            });

        let packet_recv = state
            .intra_node_channels
            .get(&server.id)
            .ok_or(NetworkError::ChannelNotFound(server.id))?
            .1
            .clone();

        let mut packet_send = HashMap::new();
        for &neighbour in &server.connected_drone_ids {
            // Initialize intra_node_channels for the neighbour if not already present
            state
                .intra_node_channels
                .entry(neighbour)
                .or_insert_with(|| {
                    let (packet_sender, packet_receiver) = unbounded();
                    (packet_sender, packet_receiver)
                });

            let sender = state
                .intra_node_channels
                .get(&neighbour)
                .ok_or(NetworkError::ChannelNotFound(neighbour))?
                .0
                .clone();

            packet_send.insert(neighbour, sender);
        }

        let server_clone = server.clone();
        let handle = thread::spawn(move || {
            let mut server = SimpleHost::new(
                server_clone.id,
                wg_2024::packet::NodeType::Server,
                server_to_controller_sender,
                server_from_controller_receiver,
                packet_recv,
                packet_send,
            );
            server.run();
        });

        state.handles.push(handle);
    }
    Ok(())
}
