mod state_handler;

use crate::simulation::metrics::Metrics;
use crate::simulation::topology::GraphState;
use crate::utils::ControllerEvent;
use common_utils::{HostCommand, HostEvent};
use crossbeam_channel::{Receiver, Sender};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::thread::JoinHandle;
use std::time::Duration;
use wg_2024::config::Config;
use wg_2024::controller::{DroneCommand, DroneEvent};
use wg_2024::network::NodeId;
use wg_2024::packet::Packet;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub enum SimulationStatus {
    #[default]
    Init,
    Stopped,
    Running,
}

pub struct SimulationState {
    /// The initial configuration of the network.
    initial_config: Option<Config>,

    /// The current status of the network.
    status: SimulationStatus,

    /// Thread handles for each node, so we can join or remove them if needed.
    node_threads: HashMap<NodeId, JoinHandle<()>>,

    /// Channels for inter-node packet exchange.
    /// inter_node_channels[node_id].0 -> Sender to node_id
    /// inter_node_channels[node_id].1 -> Receiver that node_id uses
    inter_node_channels: HashMap<NodeId, (Sender<Packet>, Receiver<Packet>)>,

    /// Channels to communicate with drones from the simulation controller.
    drones_controller_channels: HashMap<NodeId, (Sender<DroneCommand>, Receiver<DroneEvent>)>,

    /// Channels to communicate with clients from the simulation controller.
    client_controller_channels: HashMap<NodeId, (Sender<HostCommand>, Receiver<HostEvent>)>,

    /// Channels to communicate with servers from the simulation controller.
    server_controller_channels: HashMap<NodeId, (Sender<HostCommand>, Receiver<HostEvent>)>,

    /// The current state of the network graph.
    graph: GraphState,

    /// The interval at which hosts should perform network discovery.
    discovery_interval: Option<Duration>,

    /// If validation should be strict
    strict_mode: bool,

    // The metrics of the network
    metrics: Metrics,

    /// A list of received messages for each node.
    received_messages: Vec<ControllerEvent>,
}
