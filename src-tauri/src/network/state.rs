use crate::error::NetworkError;
use crate::network::network_node::{initialize_clients, initialize_drones, initialize_servers};
use crate::network::validation::validate_graph;
use crate::utils::ControllerEvent;
use common_utils::{HostCommand, HostEvent};
use crossbeam_channel::{Receiver, Sender};
use log::{debug, error, info, trace};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::thread::JoinHandle;
use std::time::{SystemTime, UNIX_EPOCH};
use wg_2024::config::{Config, Drone, Server};
use wg_2024::controller::{DroneCommand, DroneEvent};
use wg_2024::network::NodeId;
use wg_2024::packet::Packet;

/// Holds adjacency information (custom graph) and per-node metadata.
#[derive(Debug, Default)]
pub struct GraphState {
    /// Adjacency list: NodeId -> list of neighbors
    pub adjacency: HashMap<NodeId, Vec<NodeId>>,
    /// Node-level metadata (e.g., node type, pdr, crashed)
    pub node_info: HashMap<NodeId, NodeMetadata>,
}

/// Metadata for a single node in the graph.
#[derive(Debug, Clone)]
pub struct NodeMetadata {
    pub node_type: NodeType,
    pub pdr: f32,
    pub crashed: bool,
}

/// Simple enum to distinguish node types.
#[derive(Debug, Clone)]
pub enum NodeType {
    Drone,
    Client,
    Server,
}

const MAX_HISTORY: usize = 100000;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum NodeStatsType {
    PacketsSent,
    PacketsDropped,
}

#[derive(Debug, Clone, Serialize)]
pub struct NodeEventLog {
    pub timestamp: u64,
    pub event_type: NodeStatsType,
}

/// Granular statistics for each node.
#[derive(Debug, Default)]
pub struct NodeStats {
    pub events: VecDeque<NodeEventLog>,
}

impl NodeStats {
    /// Record a sent packet event.
    pub fn record_sent_packet(&mut self) {
        self.record_event(NodeStatsType::PacketsSent);
    }

    /// Record a dropped packet event.
    pub fn record_dropped_packet(&mut self) {
        self.record_event(NodeStatsType::PacketsDropped);
    }

    /// Returns a copy of the events for this node.
    pub fn get_events(&self) -> Vec<NodeEventLog> {
        self.events.iter().cloned().collect()
    }

    /// Internal helper to record an event with a timestamp.
    fn record_event(&mut self, event_type: NodeStatsType) {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or_default();

        self.events.push_back(NodeEventLog {
            timestamp,
            event_type,
        });

        if self.events.len() > MAX_HISTORY {
            self.events.pop_front();
        }
    }
}

/// Main structure holding the network state and runtime data.
pub struct NetworkState {
    /// The initial configuration of the network (static, read-only).
    /// This config is never mutated after loading.
    pub initial_config: Option<Config>,

    /// Custom adjacency graph and node metadata for the *current* network.
    pub graph: GraphState,

    /// Thread handles for each node, so we can join or remove them if needed.
    pub node_threads: HashMap<NodeId, JoinHandle<()>>,

    /// Channels for inter-node packet exchange.
    /// inter_node_channels[node_id].0 -> Sender to node_id
    /// inter_node_channels[node_id].1 -> Receiver that node_id uses
    pub inter_node_channels: HashMap<NodeId, (Sender<Packet>, Receiver<Packet>)>,

    /// Channels to communicate with drones from the simulation controller.
    pub drones_controller_channels: HashMap<NodeId, (Sender<DroneCommand>, Receiver<DroneEvent>)>,

    /// Channels to communicate with clients from the simulation controller.
    pub client_controller_channels: HashMap<NodeId, (Sender<HostCommand>, Receiver<HostEvent>)>,

    /// Channels to communicate with servers from the simulation controller.
    pub server_controller_channels: HashMap<NodeId, (Sender<HostCommand>, Receiver<HostEvent>)>,

    /// Granular stats for each drone: NodeId -> NodeStats
    pub node_stats: HashMap<NodeId, NodeStats>,

    /// A list of received messages for each node.
    pub received_messages: Vec<ControllerEvent>,
}

impl NetworkState {
    /// Creates a new, empty NetworkState.
    pub fn new() -> Self {
        NetworkState {
            initial_config: None,
            graph: GraphState::default(),
            node_threads: HashMap::new(),
            inter_node_channels: HashMap::new(),
            drones_controller_channels: HashMap::new(),
            client_controller_channels: HashMap::new(),
            server_controller_channels: HashMap::new(),
            node_stats: HashMap::new(),
            received_messages: Vec::new(),
        }
    }

    // --------------------------------------------------------------------------
    // Convenience getters
    // --------------------------------------------------------------------------
    /// Returns the list of node IDs that are considered drones in the current graph.
    pub fn get_drones(&self) -> Vec<NodeId> {
        self.graph
            .node_info
            .iter()
            .filter_map(|(&node_id, meta)| {
                if matches!(meta.node_type, NodeType::Drone) {
                    Some(node_id)
                } else {
                    None
                }
            })
            .collect()
    }

    /// Returns the list of node IDs that are considered clients in the current graph.
    pub fn get_clients(&self) -> Vec<NodeId> {
        self.graph
            .node_info
            .iter()
            .filter_map(|(&node_id, meta)| {
                if matches!(meta.node_type, NodeType::Client) {
                    Some(node_id)
                } else {
                    None
                }
            })
            .collect()
    }

    /// Returns the list of node IDs that are considered servers in the current graph.
    pub fn get_servers(&self) -> Vec<NodeId> {
        self.graph
            .node_info
            .iter()
            .filter_map(|(&node_id, meta)| {
                if matches!(meta.node_type, NodeType::Server) {
                    Some(node_id)
                } else {
                    None
                }
            })
            .collect()
    }

    // --------------------------------------------------------------------------
    // Config loading (read-only usage)
    // --------------------------------------------------------------------------
    /// Loads a config file into `NetworkState::initial_config` (static).
    /// Clears any existing runtime state in the process.
    pub fn load_config_from_file(&mut self, path: &str) -> Result<(), NetworkError> {
        let config_data =
            std::fs::read_to_string(path).map_err(NetworkError::ConfigFileReadError)?;
        let config: Config =
            toml::from_str(&config_data).map_err(NetworkError::ConfigParseError)?;

        self.load_config(config)?;
        info!("Initial configuration loaded successfully.");

        Ok(())
    }

    /// Stores the config in `initial_config` and clears any existing runtime state.
    /// This config remains static and will NOT be updated after initialization.
    pub fn load_config(&mut self, config: Config) -> Result<(), NetworkError> {
        // Clear existing runtime state
        self.node_threads.clear();
        self.inter_node_channels.clear();
        self.drones_controller_channels.clear();
        self.client_controller_channels.clear();
        self.server_controller_channels.clear();
        self.node_stats.clear();
        self.graph = GraphState::default();

        // Store the newly loaded config
        self.initial_config = Some(config);

        Ok(())
    }

    // --------------------------------------------------------------------------
    // Network initialization
    // --------------------------------------------------------------------------
    /// Initializes the network based on the static config.
    /// Builds the custom graph, spawns threads, etc.
    pub fn initialize_network(&mut self) -> Result<(), NetworkError> {
        // Clone the config so we don't hold an immutable borrow of `self`
        let local_config = match self.initial_config.clone() {
            Some(c) => c,
            None => return Err(NetworkError::NoConfigLoaded),
        };

        debug!("Initializing network with config: {:?}", local_config);

        // Clear leftover structures
        self.node_threads.clear();
        self.inter_node_channels.clear();
        self.drones_controller_channels.clear();
        self.client_controller_channels.clear();
        self.server_controller_channels.clear();
        self.node_stats.clear();
        self.graph = GraphState::default();

        // Build the custom graph from the cloned config
        self.build_graph(&local_config);

        debug!("Graph built successfully");
        trace!("Adjacency: {:?}", self.graph.adjacency);

        // Validate the graph
        validate_graph(&self.graph).map_err(NetworkError::ValidationError)?;

        debug!("Graph validated successfully");

        // Create inter-node channels for drones, clients, and servers
        for drone in &local_config.drone {
            let (sender, receiver) = crossbeam_channel::unbounded();
            self.inter_node_channels
                .insert(drone.id, (sender, receiver));
            self.node_stats.insert(drone.id, NodeStats::default());
        }
        for client in &local_config.client {
            let (sender, receiver) = crossbeam_channel::unbounded();
            self.inter_node_channels
                .insert(client.id, (sender, receiver));
            self.node_stats.insert(client.id, NodeStats::default());
        }
        for server in &local_config.server {
            let (sender, receiver) = crossbeam_channel::unbounded();
            self.inter_node_channels
                .insert(server.id, (sender, receiver));
            self.node_stats.insert(server.id, NodeStats::default());
        }

        // Finally, spawn node threads
        initialize_drones(self)?;
        initialize_clients(self)?;
        initialize_servers(self)?;

        Ok(())
    }

    /// Builds the adjacency list and node_info from a `Config` reference.
    /// This does NOT mutate `initial_config`; it only populates `self.graph`.
    fn build_graph(&mut self, cfg: &Config) {
        // 1) Insert drones
        for drone in &cfg.drone {
            self.graph.adjacency.entry(drone.id).or_default();

            // Insert neighbors
            for &nbr in &drone.connected_node_ids {
                self.graph.adjacency.entry(drone.id).or_default().push(nbr);
            }

            // Insert drone node info
            self.graph.node_info.insert(
                drone.id,
                NodeMetadata {
                    node_type: NodeType::Drone,
                    pdr: drone.pdr,
                    crashed: false,
                },
            );
        }

        // 2) Insert clients
        for client in &cfg.client {
            self.graph.adjacency.entry(client.id).or_default();

            for &nbr in &client.connected_drone_ids {
                self.graph.adjacency.entry(client.id).or_default().push(nbr);
            }

            self.graph.node_info.insert(
                client.id,
                NodeMetadata {
                    node_type: NodeType::Client,
                    pdr: 0.0,
                    crashed: false,
                },
            );
        }

        // 3) Insert servers
        for server in &cfg.server {
            self.graph.adjacency.entry(server.id).or_default();

            for &nbr in &server.connected_drone_ids {
                self.graph.adjacency.entry(server.id).or_default().push(nbr);
            }

            self.graph.node_info.insert(
                server.id,
                NodeMetadata {
                    node_type: NodeType::Server,
                    pdr: 0.0,
                    crashed: false,
                },
            );
        }
    }

    // --------------------------------------------------------------------------
    // Simulation and commands
    // --------------------------------------------------------------------------

    /// Sends a "Crash" command to a drone, removing it from the current graph and
    /// channels, but does NOT update the static config. The config remains the
    /// original state from which we started.
    pub fn send_crash_command(&mut self, drone_id: NodeId) -> Result<(), String> {
        // Send command to the drone if it exists
        if let Some((cmd_sender, _)) = self.drones_controller_channels.get(&drone_id) {
            cmd_sender
                .send(DroneCommand::Crash)
                .map_err(|_| "Failed to send Crash command")?;
        }

        debug!("Crashing drone {}", drone_id);

        // Remove from runtime structures
        self.drones_controller_channels.remove(&drone_id);
        self.inter_node_channels.remove(&drone_id);
        self.node_threads.remove(&drone_id);

        // Mark crashed in the graph
        if let Some(meta) = self.graph.node_info.get_mut(&drone_id) {
            meta.crashed = true;
        }

        // Remove adjacency for the crashed drone
        if let Some(neighbors) = self.graph.adjacency.remove(&drone_id) {
            for n in neighbors {
                if let Some(adj_list) = self.graph.adjacency.get_mut(&n) {
                    adj_list.retain(|&id| id != drone_id);
                }
            }
        }

        Ok(())
    }

    /// Dynamically sets the PDR on a given drone. Does NOT modify the static config.
    pub fn send_set_pdr_command(&mut self, drone_id: NodeId, pdr: u8) -> Result<(), String> {
        if pdr > 100 {
            error!("PDR out of range (0..100)");
            return Err(format!("PDR must be between 0 and 100, got: {}", pdr));
        }

        // Notify the drone to change PDR, if present
        if let Some((cmd_sender, _)) = self.drones_controller_channels.get(&drone_id) {
            cmd_sender
                .send(DroneCommand::SetPacketDropRate((pdr as f32) / 100.0))
                .map_err(|_| "Failed to send SetPacketDropRate command")?;
        }

        // Update runtime metadata
        if let Some(meta) = self.graph.node_info.get_mut(&drone_id) {
            meta.pdr = (pdr as f32) / 100.0;
        }

        Ok(())
    }

    pub fn add_neighbor(
        &mut self,
        node_id: NodeId,
        neighbor_id: NodeId,
    ) -> Result<(), NetworkError> {
        if node_id == neighbor_id {
            return Err(NetworkError::InvalidOperation(
                "Un nodo non può essere connesso da se stesso.".to_string(),
            ));
        }

        let node_type = self
            .get_node_type(node_id)
            .ok_or_else(|| NetworkError::NodeNotFound(node_id.to_string()))?;

        let neighbor_type = self
            .get_node_type(neighbor_id)
            .ok_or_else(|| NetworkError::NodeNotFound(neighbor_id.to_string()))?;

        self.send_add_sender_command(node_id, &node_type, neighbor_id)?;
        self.send_add_sender_command(neighbor_id, &neighbor_type, node_id)?;

        self.graph
            .adjacency
            .entry(node_id)
            .or_default()
            .push(neighbor_id);
        self.graph
            .adjacency
            .entry(neighbor_id)
            .or_default()
            .push(node_id);

        info!("Aggiunto collegamento tra {} e {}", node_id, neighbor_id);
        Ok(())
    }

    pub fn send_add_sender_command(
        &mut self,
        node_id: NodeId,
        node_type: &NodeType,
        target_id: NodeId,
    ) -> Result<(), NetworkError> {

        let target_sender = self
            .inter_node_channels
            .get(&target_id)
            .ok_or(NetworkError::ChannelNotFound(target_id))?
            .0
            .clone();
        
        match node_type {
            NodeType::Drone => {
                if let Some(sender) = self.drones_controller_channels.get(&node_id) {
                    sender
                        .0
                        .send(DroneCommand::AddSender(target_id, target_sender))
                        .map_err(|_| NetworkError::CommandSendError(node_id.to_string()))?;
                } else {
                    return Err(NetworkError::ChannelNotFound(node_id));
                }
            }
            NodeType::Client => {
                if let Some(sender) = self.client_controller_channels.get(&node_id) {
                    sender
                        .0
                        .send(HostCommand::AddSender(target_id, target_sender))
                        .map_err(|_| NetworkError::CommandSendError(node_id.to_string()))?;
                } else {
                    return Err(NetworkError::ChannelNotFound(node_id));
                }
            }
            NodeType::Server => {
                if let Some(sender) = self.server_controller_channels.get(&node_id) {
                    sender
                        .0
                        .send(HostCommand::AddSender(target_id, target_sender))
                        .map_err(|_| NetworkError::CommandSendError(node_id.to_string()))?;
                } else {
                    return Err(NetworkError::ChannelNotFound(node_id));
                }
            }
        }
        Ok(())
    }

    pub fn remove_neighbor(
        &mut self,
        node_id: NodeId,
        neighbor_id: NodeId,
    ) -> Result<(), NetworkError> {
        // Un nodo non può disconnettersi da se stesso.
        if node_id == neighbor_id {
            return Err(NetworkError::InvalidOperation(
                "Un nodo non può essere disconnesso da se stesso.".to_string(),
            ));
        }

        // Verifica che entrambi i nodi esistano nella rete.
        let node_type = self
            .get_node_type(node_id)
            .ok_or_else(|| NetworkError::NodeNotFound(node_id.to_string()))?;

        let neighbor_type = self
            .get_node_type(neighbor_id)
            .ok_or_else(|| NetworkError::NodeNotFound(neighbor_id.to_string()))?;

        // Usa il helper per inviare il comando di rimozione per entrambi i nodi.
        self.send_remove_sender_command(node_id, &node_type, neighbor_id)?;
        self.send_remove_sender_command(neighbor_id, &neighbor_type, node_id)?;

        // Rimuove il collegamento nella lista di adiacenza.
        if let Some(adj) = self.graph.adjacency.get_mut(&node_id) {
            adj.retain(|&id| id != neighbor_id);
        }
        if let Some(adj) = self.graph.adjacency.get_mut(&neighbor_id) {
            adj.retain(|&id| id != node_id);
        }

        info!("Rimosso collegamento tra {} e {}", node_id, neighbor_id);
        Ok(())
    }

    pub fn send_remove_sender_command(
        &mut self,
        node_id: NodeId,
        node_type: &NodeType,
        target_id: NodeId,
    ) -> Result<(), NetworkError> {
        match node_type {
            NodeType::Drone => {
                if let Some(sender) = self.drones_controller_channels.get(&node_id) {
                    sender
                        .0
                        .send(DroneCommand::RemoveSender(target_id))
                        .map_err(|_| NetworkError::CommandSendError(node_id.to_string()))?;
                } else {
                    return Err(NetworkError::ChannelNotFound(node_id));
                }
            }
            NodeType::Client => {
                if let Some(sender) = self.client_controller_channels.get(&node_id) {
                    sender
                        .0
                        .send(HostCommand::RemoveSender(target_id))
                        .map_err(|_| NetworkError::CommandSendError(node_id.to_string()))?;
                } else {
                    return Err(NetworkError::ChannelNotFound(node_id));
                }
            }
            NodeType::Server => {
                if let Some(sender) = self.server_controller_channels.get(&node_id) {
                    sender
                        .0
                        .send(HostCommand::RemoveSender(target_id))
                        .map_err(|_| NetworkError::CommandSendError(node_id.to_string()))?;
                } else {
                    return Err(NetworkError::ChannelNotFound(node_id));
                }
            }
        }
        Ok(())
    }

    // --------------------------------------------------------------------------
    // Example of how you might record stats in a centralized way.
    // --------------------------------------------------------------------------

    /// Increment the packets_sent counter for a given node.
    pub fn record_node_sent_packet(&mut self, node_id: NodeId) {
        if let Some(stats) = self.node_stats.get_mut(&node_id) {
            stats.record_sent_packet();
        }
    }

    /// Increment the packets_dropped counter for a given node.
    pub fn record_node_dropped_packet(&mut self, node_id: NodeId) {
        if let Some(stats) = self.node_stats.get_mut(&node_id) {
            stats.record_dropped_packet();
        }
    }

    /// Returns the stats for a specific node, if available.
    pub fn get_node_stats(&self, node_id: NodeId) -> Option<&NodeStats> {
        self.node_stats.get(&node_id)
    }

    /// Returns a reference to the entire node_stats map.
    pub fn get_all_node_stats(&self) -> &HashMap<NodeId, NodeStats> {
        &self.node_stats
    }

    pub fn get_node_type(&self, node_id: NodeId) -> Option<NodeType> {
        self.graph
            .node_info
            .get(&node_id)
            .map(|meta| meta.node_type.clone())
    }
}
