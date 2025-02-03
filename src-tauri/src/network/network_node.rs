use crate::error::NetworkError;
use crate::network::state::NetworkState;
use client::RustbustersClient;
use common_utils::HostCommand;
use crossbeam_channel::{unbounded, Receiver, Sender};
use log::info;
use rustbusters_drone::RustBustersDrone;
use serde::de::Error;
use server::utils::traits::Runnable;
use server::{RustBustersServer, RustBustersServerController};
use std::collections::HashMap;
use std::net::Ipv4Addr;
use std::{env, thread};
use wg_2024::controller::{DroneCommand, DroneEvent};
use wg_2024::drone::Drone;
use wg_2024::network::NodeId;
use wg_2024::packet::Packet;

/// A trait representing a generic drone implementation
/// that can be 'run' in its own thread. Because you call
/// `thread::spawn(move || { ... })`, this trait must be `Send` if
/// you want to move the drone object across threads.
pub trait DroneRunnable: Send {
    fn run(&mut self);
}

/// Blanket impl: any `T` that implements `wg_2024::drone::Drone + Send`
/// automatically implements `DroneRunnable`.
impl<T: Drone + Send> DroneRunnable for T {
    fn run(&mut self) {
        <Self as Drone>::run(self);
    }
}

/// Type alias for a factory function that produces a `Box<dyn DroneRunnable + Send>`.
pub type DroneFactory = Box<
    dyn Fn(
            NodeId,
            // The drone sends events back via this Sender<DroneEvent>
            Sender<DroneEvent>,
            // The drone receives commands from this Receiver<DroneCommand>
            crossbeam_channel::Receiver<DroneCommand>,
            // The drone receives incoming Packets
            crossbeam_channel::Receiver<Packet>,
            // A map of neighbor_id -> Sender<Packet>, used to send packets out
            HashMap<NodeId, Sender<Packet>>,
            // The PDR for this drone
            f32,
        ) -> Box<dyn DroneRunnable + Send>
        + Send
        + Sync,
>;

/// Macro that produces a vector of factory closures.
/// Each closure can instantiate a specific drone type that implements
/// `Drone + Send`.
#[macro_export]
macro_rules! drone_factories {
    ($($type_name:ty),* $(,)?) => {{
        vec![
            $(
                Box::new(
                    |id, evt_tx, cmd_rx, pkt_rx, pkt_send, pdr| -> Box<dyn DroneRunnable + Send> {
                        // Create an instance of <$type_name>, which must implement
                        // `wg_2024::drone::Drone + Send`.
                        // Because of the blanket impl, it automatically works as `DroneRunnable + Send`.
                        Box::new(<$type_name>::new(id, evt_tx, cmd_rx, pkt_rx, pkt_send, pdr))
                    }
                ) as DroneFactory
            ),*
        ]
    }};
}

/// Initializes drones based on the drone list in `state.initial_config`.
/// By default, it uses the `RustyDrone` factory, but you can adapt this
/// to select different drone types based on config fields.
pub fn initialize_drones(state: &mut NetworkState) -> Result<(), NetworkError> {
    // Example: build an array with just one drone factory for demonstration
    // Ensure `RustyDrone` is actually `Send`.
    let factories = drone_factories![RustBustersDrone]; // RustyDrone, LockheedRustin

    let config = state
        .initial_config
        .as_ref()
        .ok_or(NetworkError::NoConfigLoaded)?;

    for drone in &config.drone {
        // 1) Create a channel for commands (controller -> drone)
        let (cmd_tx, cmd_rx) = unbounded::<DroneCommand>();
        // 2) Create a channel for events (drone -> controller)
        let (evt_tx, evt_rx) = unbounded::<DroneEvent>();

        // Store (Sender<DroneCommand>, Receiver<DroneEvent>) so the controller can
        // send commands and receive events from this drone
        state
            .drones_controller_channels
            .insert(drone.id, (cmd_tx.clone(), evt_rx));

        // Ensure we have inter_node_channels for this drone
        state
            .inter_node_channels
            .entry(drone.id)
            .or_insert_with(|| {
                let (packet_sender, packet_receiver) = unbounded();
                (packet_sender, packet_receiver)
            });

        // The drone's Packet receiver
        let packet_recv = state
            .inter_node_channels
            .get(&drone.id)
            .ok_or(NetworkError::ChannelNotFound(drone.id))?
            .1
            .clone();

        // Build a map of neighbor -> neighbor's Sender<Packet>
        let mut packet_send = HashMap::new();
        for &neighbor_id in &drone.connected_node_ids {
            state
                .inter_node_channels
                .entry(neighbor_id)
                .or_insert_with(|| {
                    let (tx, rx) = unbounded();
                    (tx, rx)
                });

            let neighbor_sender = state
                .inter_node_channels
                .get(&neighbor_id)
                .ok_or(NetworkError::ChannelNotFound(neighbor_id))?
                .0
                .clone();

            packet_send.insert(neighbor_id, neighbor_sender);
        }

        // Pick a drone factory. In a real scenario, match a config field if needed.
        let build_fn = factories.get(0).ok_or_else(|| {
            NetworkError::ConfigParseError(toml::de::Error::custom("No drone factory specified"))
        })?;

        // Create a new drone using the factory
        // If RustyDrone is truly `Send`, this will compile.
        let new_drone = build_fn(
            drone.id,
            evt_tx, // The drone can send events here
            cmd_rx, // The drone receives commands here
            packet_recv,
            packet_send,
            drone.pdr,
        );

        // Now we can spawn the drone in a new thread
        // because `Box<dyn DroneRunnable + Send>` is `Send`.
        let handle = thread::spawn(move || {
            let mut d = new_drone;
            d.run();
        });

        // Store the thread handle
        state.node_threads.insert(drone.id, handle);
    }

    Ok(())
}

/// Initializes clients based on the client list in `state.initial_config`.
/// The logic remains unchanged except we fix NodeId imports.
pub fn initialize_clients(state: &mut NetworkState) -> Result<(), NetworkError> {
    let config = state
        .initial_config
        .as_ref()
        .ok_or(NetworkError::NoConfigLoaded)?;

    for client in &config.client {
        // 1) Create a channel for commands (controller -> client)
        let (cmd_tx, cmd_rx) = unbounded::<common_utils::HostCommand>();
        // 2) Create a channel for events (client -> controller)
        let (evt_tx, evt_rx) = unbounded::<common_utils::HostEvent>();

        // Store in state so we can send commands to the client, read events from it
        state
            .client_controller_channels
            .insert(client.id, (cmd_tx.clone(), evt_rx));

        // Ensure inter_node_channels for this client
        state
            .inter_node_channels
            .entry(client.id)
            .or_insert_with(|| {
                let (packet_sender, packet_receiver) = unbounded();
                (packet_sender, packet_receiver)
            });

        let packet_recv = state
            .inter_node_channels
            .get(&client.id)
            .ok_or(NetworkError::ChannelNotFound(client.id))?
            .1
            .clone();

        // Build map of neighbor -> neighbor's Sender<Packet>
        let mut packet_send = HashMap::new();
        for &neighbor_id in &client.connected_drone_ids {
            state
                .inter_node_channels
                .entry(neighbor_id)
                .or_insert_with(|| {
                    let (tx, rx) = unbounded();
                    (tx, rx)
                });
            let neighbor_sender = state
                .inter_node_channels
                .get(&neighbor_id)
                .ok_or(NetworkError::ChannelNotFound(neighbor_id))?
                .0
                .clone();
            packet_send.insert(neighbor_id, neighbor_sender);
        }

        let client_clone = client.clone();
        let handle = thread::spawn(move || {
            let mut client_host = RustbustersClient::new(
                client_clone.id,
                evt_tx, // the client can send events
                cmd_rx, // the client receives commands
                packet_recv,
                packet_send,
                None,
            );
            client_host.run();
        });

        state.node_threads.insert(client.id, handle);
    }

    Ok(())
}

/// Initializes servers based on the server list in `state.initial_config`.
/// Very similar to clients, but using server_controller_channels.
pub fn initialize_servers(state: &mut NetworkState) -> Result<(), NetworkError> {
    let config = state
        .initial_config
        .as_ref()
        .ok_or(NetworkError::NoConfigLoaded)?;

    let (
        http_server_address,
        http_public_path,
        ws_server_address,
        server_controller_sender,
        server_controller_receiver,
    ) = config_server_controller();
    let mut server_controller = RustBustersServerController::new(
        http_server_address,
        http_public_path,
        ws_server_address,
        server_controller_receiver,
    );
    server_controller.run();

    for server in &config.server {
        let (cmd_tx, cmd_rx) = unbounded::<common_utils::HostCommand>();
        let (evt_tx, evt_rx) = unbounded::<common_utils::HostEvent>();

        state
            .server_controller_channels
            .insert(server.id, (cmd_tx.clone(), evt_rx));

        state
            .inter_node_channels
            .entry(server.id)
            .or_insert_with(|| {
                let (packet_sender, packet_receiver) = unbounded();
                (packet_sender, packet_receiver)
            });

        let packet_recv = state
            .inter_node_channels
            .get(&server.id)
            .ok_or(NetworkError::ChannelNotFound(server.id))?
            .1
            .clone();

        let mut packet_send = HashMap::new();
        for &neighbor_id in &server.connected_drone_ids {
            state
                .inter_node_channels
                .entry(neighbor_id)
                .or_insert_with(|| {
                    let (tx, rx) = unbounded();
                    (tx, rx)
                });
            let neighbor_sender = state
                .inter_node_channels
                .get(&neighbor_id)
                .ok_or(NetworkError::ChannelNotFound(neighbor_id))?
                .0
                .clone();
            packet_send.insert(neighbor_id, neighbor_sender);
        }

        let server_clone = server.clone();
        let server_controller_sender_clone = server_controller_sender.clone();
        
        let handle = thread::spawn(move || {
            let mut server_host = RustBustersServer::new(
                server_clone.id,
                evt_tx,
                cmd_rx,
                packet_send,
                packet_recv,
                server_controller_sender_clone,
                None,
            );
            server_host.run().unwrap();
        });

        state.node_threads.insert(server.id, handle);
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
    let server_ip: [u8; 4] = env::var("SERVER_IP")
        .expect("SERVER_IP must be set in .env file")
        .parse::<Ipv4Addr>()
        .expect("SERVER_IP must be a valid IpV4 IP address")
        .octets();
    info!("Server IP: {:?}", server_ip);
    let port = env::var("SERVER_PORT")
        .expect("SERVER_PORT must be set in .env file")
        .parse::<u16>()
        .expect("Error in parsing HTTP_SERVER_PORT from .env");
    info!("Server port: {:?}", port);
    let http_public_path =
        env::var("SERVER_PUBLIC_PATH").expect("SERVER_PUBLIC_PATH must be set in .env file");
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
