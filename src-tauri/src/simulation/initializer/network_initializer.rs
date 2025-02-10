use crate::drone_factories;
use crate::error::NetworkError;
use crate::simulation::initializer::factory::{DroneFactory, DroneRunnable};
use crate::simulation::state::{SimulationState, SimulationStatus};
use client::RustbustersClient;
use common_utils::{HostCommand, HostEvent};
use crossbeam_channel::{unbounded, Receiver, Sender};
use log::info;
use rand::seq::SliceRandom;
use rand::thread_rng;
use server::utils::traits::Runnable;
use server::{RustBustersServer, RustBustersServerController};
use std::collections::HashMap;
use std::net::Ipv4Addr;
use std::{env, thread};
use wg_2024::controller::{DroneCommand, DroneEvent};
use wg_2024::drone::Drone;
use wg_2024::network::NodeId;

pub fn initialize_network(state: &mut SimulationState) -> Result<(), NetworkError> {
    info!("Initializing network...");

    init_inter_node_channels(state)?;
    initialize_drones(state)?;
    initialize_clients(state)?;
    initialize_servers(state)?;

    state.set_status(SimulationStatus::Running);

    Ok(())
}

pub fn init_inter_node_channels(state: &mut SimulationState) -> Result<(), NetworkError> {
    state.set_inter_node_channels(HashMap::new());

    let config = state
        .get_config()
        .ok_or(NetworkError::NoConfigLoaded)?
        .clone();

    for drone in &config.drone {
        let (sender, receiver) = unbounded();
        state
            .get_inter_node_channels_mut()
            .insert(drone.id, (sender, receiver));
        // state.metrics.insert_node(drone.id, NodeType::Drone); // TODO
        state
            .get_metrics_mut()
            .insert_node(drone.id, wg_2024::packet::NodeType::Drone);
    }
    for client in &config.client {
        let (sender, receiver) = unbounded();
        state
            .get_inter_node_channels_mut()
            .insert(client.id, (sender, receiver));
        // state.metrics.insert_node(client.id, NodeType::Client); // TODO
        state
            .get_metrics_mut()
            .insert_node(client.id, wg_2024::packet::NodeType::Client);
    }
    for server in &config.server {
        let (sender, receiver) = unbounded();
        state
            .get_inter_node_channels_mut()
            .insert(server.id, (sender, receiver));
        // state.metrics.insert_node(server.id, NodeType::Server); // TODO
        state
            .get_metrics_mut()
            .insert_node(server.id, wg_2024::packet::NodeType::Server);
    }

    Ok(())
}

pub fn initialize_drones(state: &mut SimulationState) -> Result<(), NetworkError> {
    // Example: build an array with just one drone factory for demonstration
    // Ensure `RustyDrone` is actually `Send`.
    let drone_factories: Vec<DroneFactory> = drone_factories![
        // rustbusters_drone::RustBustersDrone, // Non aspetta la chiusura del commands
        rusty_drones::RustyDrone,
        lockheedrustin_drone::LockheedRustin,
        fungi_drone::FungiDrone,
        rustastic_drone::RustasticDrone, // Come noi
        rusteze_drone::RustezeDrone,
        rust_do_it::RustDoIt,     // Come noi
        rust_roveri::RustRoveri,  // Come noi
        RF_drone::RustAndFurious, // Come noi
        ap2024_unitn_cppenjoyers_drone::CppEnjoyersDrone,
        wg_2024_rust::drone::RustDrone,
    ];
    let mut factory_index = 0;

    let config = state
        .get_config()
        .ok_or(NetworkError::NoConfigLoaded)?
        .clone();

    for drone in &config.drone {
        // 1) Create a channel for commands (controller -> drone)
        let (cmd_tx, cmd_rx) = unbounded::<DroneCommand>();
        // 2) Create a channel for events (drone -> controller)
        let (evt_tx, evt_rx) = unbounded::<DroneEvent>();

        // Store (Sender<DroneCommand>, Receiver<DroneEvent>) so the controller can
        // send commands and receive events from this drone
        state
            .get_drone_controller_channels_mut()
            .insert(drone.id, (cmd_tx.clone(), evt_rx));

        // Ensure we have inter_node_channels for this drone
        state
            .get_inter_node_channels_mut()
            .entry(drone.id)
            .or_insert_with(|| {
                let (packet_sender, packet_receiver) = unbounded();
                (packet_sender, packet_receiver)
            });

        // The drone's Packet receiver
        let packet_recv = state
            .get_inter_node_channels()
            .get(&drone.id)
            .ok_or(NetworkError::ChannelNotFound(drone.id))?
            .1
            .clone();

        // Build a map of neighbor -> neighbor's Sender<Packet>
        let mut packet_send = HashMap::new();
        for &neighbor_id in &drone.connected_node_ids {
            state
                .get_inter_node_channels_mut()
                .entry(neighbor_id)
                .or_insert_with(|| {
                    let (tx, rx) = unbounded();
                    (tx, rx)
                });

            let neighbor_sender = state
                .get_inter_node_channels()
                .get(&neighbor_id)
                .ok_or(NetworkError::ChannelNotFound(neighbor_id))?
                .0
                .clone();

            packet_send.insert(neighbor_id, neighbor_sender);
        }

        let create_drone = &drone_factories[factory_index];
        factory_index = (factory_index + 1) % drone_factories.len();

        let new_drone = create_drone(
            drone.id,
            evt_tx, // The drone can send events here
            cmd_rx, // The drone receives commands here
            packet_recv,
            packet_send,
            drone.pdr,
        );

        state
            .get_graph_mut()
            .set_drone_group(drone.id, new_drone.drone_type().to_string());

        // Now we can spawn the drone in a new thread
        // because `Box<dyn DroneRunnable + Send>` is `Send`.
        let handle = thread::spawn(move || {
            let mut d = new_drone;
            d.run();
        });

        // Store the thread handle
        state.get_nodes_threads_mut().insert(drone.id, handle);
    }

    Ok(())
}

/// Initializes clients based on the client list in `state.initial_config`.
pub fn initialize_clients(state: &mut SimulationState) -> Result<(), NetworkError> {
    let config = state
        .get_config()
        .ok_or(NetworkError::NoConfigLoaded)?
        .clone();

    for client in &config.client {
        // 1) Create a channel for commands (controller -> client)
        let (cmd_tx, cmd_rx) = unbounded::<common_utils::HostCommand>();
        // 2) Create a channel for events (client -> controller)
        let (evt_tx, evt_rx) = unbounded::<common_utils::HostEvent>();

        state
            .get_client_controller_channels_mut()
            .insert(client.id, (cmd_tx.clone(), evt_rx));

        // Ensure inter_node_channels for this client
        state
            .get_inter_node_channels_mut()
            .entry(client.id)
            .or_insert_with(|| {
                let (packet_sender, packet_receiver) = unbounded();
                (packet_sender, packet_receiver)
            });

        let packet_recv = state
            .get_inter_node_channels()
            .get(&client.id)
            .ok_or(NetworkError::ChannelNotFound(client.id))?
            .1
            .clone();

        // Build map of neighbor -> neighbor's Sender<Packet>
        let mut packet_send = HashMap::new();
        for &neighbor_id in &client.connected_drone_ids {
            state
                .get_inter_node_channels_mut()
                .entry(neighbor_id)
                .or_insert_with(|| {
                    let (tx, rx) = unbounded();
                    (tx, rx)
                });
            let neighbor_sender = state
                .get_inter_node_channels()
                .get(&neighbor_id)
                .ok_or(NetworkError::ChannelNotFound(neighbor_id))?
                .0
                .clone();
            packet_send.insert(neighbor_id, neighbor_sender);
        }

        let client_clone = client.clone();
        let discovery_interval = state.get_discovery_interval();
        let handle = thread::spawn(move || {
            let mut client_host = RustbustersClient::new(
                client_clone.id,
                evt_tx, // the client can send events
                cmd_rx, // the client receives commands
                packet_recv,
                packet_send,
                discovery_interval,
            );
            client_host.run();
        });

        state.get_nodes_threads_mut().insert(client.id, handle);
    }

    Ok(())
}

/// Initializes servers based on the server list in `state.initial_config`.
pub fn initialize_servers(state: &mut SimulationState) -> Result<(), NetworkError> {
    let config = state
        .get_config()
        .ok_or(NetworkError::NoConfigLoaded)?
        .clone();

    let (
        http_server_address,
        http_public_path,
        ws_server_address,
        server_controller_sender,
        server_controller_receiver,
    ) = config_server_controller();
    let server_controller = RustBustersServerController::new(
        http_server_address,
        http_public_path,
        ws_server_address,
        server_controller_receiver,
    );
    server_controller.run();

    for server in &config.server {
        let (cmd_tx, cmd_rx) = unbounded::<HostCommand>();
        let (evt_tx, evt_rx) = unbounded::<HostEvent>();

        state
            .get_server_controller_channels_mut()
            .insert(server.id, (cmd_tx.clone(), evt_rx));

        state
            .get_inter_node_channels_mut()
            .entry(server.id)
            .or_insert_with(|| {
                let (packet_sender, packet_receiver) = unbounded();
                (packet_sender, packet_receiver)
            });

        let packet_recv = state
            .get_inter_node_channels()
            .get(&server.id)
            .ok_or(NetworkError::ChannelNotFound(server.id))?
            .1
            .clone();

        let mut packet_send = HashMap::new();
        for &neighbor_id in &server.connected_drone_ids {
            state
                .get_inter_node_channels_mut()
                .entry(neighbor_id)
                .or_insert_with(|| {
                    let (tx, rx) = unbounded();
                    (tx, rx)
                });
            let neighbor_sender = state
                .get_inter_node_channels()
                .get(&neighbor_id)
                .ok_or(NetworkError::ChannelNotFound(neighbor_id))?
                .0
                .clone();
            packet_send.insert(neighbor_id, neighbor_sender);
        }

        let server_clone = server.clone();

        let discovery_interval = state.get_discovery_interval();
        let server_instance = RustBustersServer::new(
            server_clone.id,
            evt_tx,
            cmd_rx,
            packet_send,
            packet_recv,
            server_controller_sender.clone(),
            discovery_interval,
        );

        let handle = server_instance.run().unwrap();

        state.get_nodes_threads_mut().insert(server.id, handle);
    }

    Ok(())
}

fn config_server_controller() -> (
    String,
    String,
    String,
    Sender<HostCommand>,
    Receiver<HostCommand>,
) {
    info!("Reading server configuration from .env file");
    let server_ip: [u8; 4] = "127.0.0.1"
        .parse::<Ipv4Addr>()
        .expect("SERVER_IP must be a valid IpV4 IP address")
        .octets();
    info!("Server IP: {:?}", server_ip);
    let port = "8080"
        .parse::<u16>()
        .expect("Error in parsing HTTP_SERVER_PORT from .env");
    info!("Server port: {:?}", port);
    let http_public_path = "static/server/frontend/build".to_string();
    info!("Server public path: {:?}", http_public_path);

    let ip_str: String = server_ip
        .iter()
        .map(|n| n.to_string())
        .collect::<Vec<String>>()
        .join(".");
    let http_server_address = format!("{}:{}", ip_str, port);
    let ws_server_address = format!("{}:{}", ip_str, port + 1);

    info!("HTTP server address: {}", http_server_address);
    info!("WS server address: {}", ws_server_address);

    let (sender, receiver) = unbounded::<HostCommand>();

    (
        http_server_address,
        http_public_path,
        ws_server_address,
        sender,
        receiver,
    )
}

/// Creates a new drone with the given connected neighbors and PDR.
pub fn create_new_drone(
    state: &mut SimulationState,
    drone_id: NodeId,
    connected_node_ids: Vec<NodeId>,
    pdr: u32,
) -> Result<NodeId, NetworkError> {
    let (cmd_tx, cmd_rx) = unbounded::<DroneCommand>();
    let (evt_tx, evt_rx) = unbounded::<DroneEvent>();

    state
        .get_drone_controller_channels_mut()
        .insert(drone_id, (cmd_tx.clone(), evt_rx));

    let (packet_sender, packet_receiver) = unbounded();
    state
        .get_inter_node_channels_mut()
        .insert(drone_id, (packet_sender.clone(), packet_receiver.clone()));

    state
        .get_metrics_mut()
        .insert_node(drone_id, wg_2024::packet::NodeType::Drone);

    let mut packet_send = HashMap::new();
    for &neighbor_id in &connected_node_ids {
        let neighbor_sender = state
            .get_inter_node_channels()
            .get(&neighbor_id)
            .ok_or(NetworkError::ChannelNotFound(neighbor_id))?
            .0
            .clone();

        packet_send.insert(neighbor_id, neighbor_sender);
    }

    let drone_factories: Vec<DroneFactory> = drone_factories![
        rusty_drones::RustyDrone,
        lockheedrustin_drone::LockheedRustin,
        fungi_drone::FungiDrone,
        rustastic_drone::RustasticDrone,
        rusteze_drone::RustezeDrone,
        rust_do_it::RustDoIt,
        rust_roveri::RustRoveri,
        RF_drone::RustAndFurious,
        ap2024_unitn_cppenjoyers_drone::CppEnjoyersDrone,
        wg_2024_rust::drone::RustDrone,
    ];

    let mut rng = thread_rng();
    let selected_factory =
        drone_factories
            .choose(&mut rng)
            .ok_or(NetworkError::ValidationError(
                "No drone factories available".to_string(),
            ))?;

    let new_drone = selected_factory(
        drone_id,
        evt_tx.clone(),
        cmd_rx.clone(),
        packet_receiver,
        packet_send,
        pdr as f32 / 100.0,
    );

    state
        .get_graph_mut()
        .set_drone_group(drone_id, new_drone.drone_type().to_string());

    // call send_add_sender_command on each neighbor
    for neighbor_id in &connected_node_ids {
        crate::simulation::controller::controller_commands::send_add_sender_command(
            state,
            drone_id,
            *neighbor_id,
        )?;
    }

    let handle = std::thread::spawn(move || {
        let mut d = new_drone;
        d.run();
    });

    state.get_nodes_threads_mut().insert(drone_id, handle);

    Ok(drone_id)
}
