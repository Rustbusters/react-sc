use crate::error::NetworkError;
use crate::simulation::controller::controller_commands::send_remove_sender_command;
use crate::simulation::state::{SimulationState, SimulationStatus};
use crate::simulation::topology::validations::validate_graph;
use crate::utils::ControllerEvent;
use common_utils::{HostCommand, HostEvent};
use crossbeam_channel::{Receiver, Sender};
use log::{error, info};
use std::collections::HashMap;
use std::default::Default;
use std::thread::JoinHandle;
use wg_2024::controller::{DroneCommand, DroneEvent};
use wg_2024::network::NodeId;
use wg_2024::packet::Packet;

impl Default for SimulationState {
    fn default() -> Self {
        Self::new()
    }
}

impl SimulationState {
    pub fn new() -> Self {
        SimulationState {
            initial_config: None,
            status: SimulationStatus::Init,
            node_threads: HashMap::new(),
            inter_node_channels: HashMap::new(),
            drones_controller_channels: HashMap::new(),
            client_controller_channels: HashMap::new(),
            server_controller_channels: HashMap::new(),
            graph: Default::default(),
            discovery_interval: None,
            strict_mode: false,
            metrics: Default::default(),
            received_messages: vec![],
        }
    }

    pub fn clear_simulation(&mut self) {
        // Not clearing initial_config
        self.node_threads.clear();
        self.inter_node_channels.clear();
        self.drones_controller_channels.clear();
        self.client_controller_channels.clear();
        self.server_controller_channels.clear();
        self.graph = Default::default();
        self.metrics = Default::default();
        self.received_messages.clear();
    }

    pub fn load_config_from_file(&mut self, path: &str) -> Result<(), NetworkError> {
        let config = crate::simulation::configs::configs_handler::get_config_from_file(path)?;

        self.initial_config = Some(config);
        Ok(())
    }

    // GETTERS AND SETTERS

    pub fn get_status(&self) -> SimulationStatus {
        self.status.clone()
    }

    pub fn set_status(&mut self, status: SimulationStatus) {
        self.status = status;
    }

    pub fn get_nodes_threads(&self) -> &HashMap<NodeId, JoinHandle<()>> {
        &self.node_threads
    }

    pub fn get_nodes_threads_mut(&mut self) -> &mut HashMap<NodeId, JoinHandle<()>> {
        &mut self.node_threads
    }

    pub fn get_node_thread(&self, node_id: NodeId) -> Option<&JoinHandle<()>> {
        self.node_threads.get(&node_id)
    }

    pub fn get_inter_node_channels(&self) -> &HashMap<NodeId, (Sender<Packet>, Receiver<Packet>)> {
        &self.inter_node_channels
    }

    pub fn set_inter_node_channels(
        &mut self,
        inter_node_channels: HashMap<NodeId, (Sender<Packet>, Receiver<Packet>)>,
    ) {
        self.inter_node_channels = inter_node_channels;
    }

    pub fn get_inter_node_channels_mut(
        &mut self,
    ) -> &mut HashMap<NodeId, (Sender<Packet>, Receiver<Packet>)> {
        &mut self.inter_node_channels
    }

    pub fn get_drone_controller_channels(
        &self,
    ) -> &HashMap<NodeId, (Sender<DroneCommand>, Receiver<DroneEvent>)> {
        &self.drones_controller_channels
    }

    pub fn get_drone_controller_channels_mut(
        &mut self,
    ) -> &mut HashMap<NodeId, (Sender<DroneCommand>, Receiver<DroneEvent>)> {
        &mut self.drones_controller_channels
    }

    pub fn get_client_controller_channels(
        &self,
    ) -> &HashMap<NodeId, (Sender<HostCommand>, Receiver<HostEvent>)> {
        &self.client_controller_channels
    }

    pub fn get_client_controller_channels_mut(
        &mut self,
    ) -> &mut HashMap<NodeId, (Sender<HostCommand>, Receiver<HostEvent>)> {
        &mut self.client_controller_channels
    }

    pub fn get_server_controller_channels(
        &self,
    ) -> &HashMap<NodeId, (Sender<HostCommand>, Receiver<HostEvent>)> {
        &self.server_controller_channels
    }

    pub fn get_server_controller_channels_mut(
        &mut self,
    ) -> &mut HashMap<NodeId, (Sender<HostCommand>, Receiver<HostEvent>)> {
        &mut self.server_controller_channels
    }

    pub fn set_discovery_interval(&mut self, interval: Option<std::time::Duration>) {
        self.discovery_interval = interval;
    }

    pub fn get_discovery_interval(&self) -> Option<std::time::Duration> {
        self.discovery_interval
    }

    pub fn get_strict_mode(&self) -> bool {
        self.strict_mode
    }

    pub fn set_strict_mode(&mut self, strict: bool) {
        self.strict_mode = strict;
    }

    pub fn get_config(&self) -> Option<&wg_2024::config::Config> {
        self.initial_config.as_ref()
    }

    pub fn get_config_mut(&mut self) -> Option<&mut wg_2024::config::Config> {
        self.initial_config.as_mut()
    }

    pub fn get_graph(&self) -> &crate::simulation::topology::GraphState {
        &self.graph
    }

    pub fn get_graph_mut(&mut self) -> &mut crate::simulation::topology::GraphState {
        &mut self.graph
    }

    pub fn set_graph(&mut self, graph: crate::simulation::topology::GraphState) {
        self.graph = graph;
    }

    pub fn get_metrics(&self) -> &crate::simulation::metrics::Metrics {
        &self.metrics
    }

    pub fn get_metrics_mut(&mut self) -> &mut crate::simulation::metrics::Metrics {
        &mut self.metrics
    }

    pub fn get_received_messages(&self) -> &Vec<ControllerEvent> {
        &self.received_messages
    }
    pub fn get_received_messages_mut(&mut self) -> &mut Vec<ControllerEvent> {
        &mut self.received_messages
    }

    pub fn start_simulation(&mut self) -> Result<(), NetworkError> {
        if self.status == SimulationStatus::Running {
            return Err(NetworkError::NetworkAlreadyRunning);
        }

        if self.initial_config.is_none() {
            return Err(NetworkError::NoConfigLoaded);
        }

        let config = self.initial_config.as_ref().unwrap();

        // Build the graph
        self.graph.build_graph(config);

        // Validate the graph
        validate_graph(&self.graph, true)?;

        // Initialize the network
        crate::simulation::initializer::network_initializer::initialize_network(self)?;

        Ok(())
    }

    pub fn stop_simulation(&mut self) -> Result<(), NetworkError> {
        if self.status != SimulationStatus::Running {
            return Ok(());
        }

        for (&node_id, neighbors) in &self.graph.adjacency.clone() {
            for &neighbor_id in neighbors {
                send_remove_sender_command(&self, node_id, neighbor_id)?;
            }
        }

        // Drones
        for (drone_id, (sender, _receiver)) in &self.drones_controller_channels {
            sender.send(DroneCommand::Crash).map_err(|_| {
                NetworkError::CommandSendError(format!(
                    "Failed to send 'Crash' command to drone {}",
                    drone_id
                ))
            })?;
            info!("Sent 'Crash' command to drone {}", drone_id);
        }

        // Clients
        for (client_id, (sender, _receiver)) in &self.client_controller_channels {
            sender.send(HostCommand::Stop).map_err(|_| {
                NetworkError::CommandSendError(format!(
                    "Failed to send 'Stop' command to client {}",
                    client_id
                ))
            })?;
            info!("Sent 'Stop' command to client {}", client_id);
        }

        // Servers
        for (server_id, (sender, _receiver)) in &self.server_controller_channels {
            sender.send(HostCommand::Stop).map_err(|_| {
                NetworkError::CommandSendError(format!(
                    "Failed to send 'Stop' command to server {}",
                    server_id
                ))
            })?;
            info!("Sent 'Stop' command to server {}", server_id);
        }

        self.inter_node_channels.clear();
        self.drones_controller_channels.clear();
        self.client_controller_channels.clear();
        self.server_controller_channels.clear();
        self.graph.node_info.clear();
        self.graph.adjacency.clear();

        for (node_id, handle) in self.node_threads.drain() {
            info!("Attempting to join thread for node {}", node_id);
            match handle.join() {
                Ok(_) => {
                    info!("Thread for node {} joined successfully", node_id);
                }
                Err(_) => {
                    error!("Failed to join thread for node {}", node_id);
                }
            }
        }

        self.clear_simulation();
        self.set_status(SimulationStatus::Stopped);

        Ok(())
    }
}
