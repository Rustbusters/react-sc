use std::collections::HashMap;
use wg_2024::network::NodeId;

pub mod topology_handler;
pub mod validations;

#[derive(Debug, Clone, Default)]
pub struct GraphState {
    /// Adjacency list: NodeId -> list of neighbors
    pub adjacency: HashMap<NodeId, Vec<NodeId>>,
    /// Node metadata: NodeId -> metadata
    pub node_info: HashMap<NodeId, NodeMetadata>,
}

#[derive(Debug, Clone)]
pub enum NodeMetadata {
    Drone(DroneMetadata),
    Client,
    Server,
}

#[derive(Debug, Clone)]
pub struct DroneMetadata {
    node_group: Option<String>,
    pdr: f32,
}

impl DroneMetadata {
    pub fn new(node_group: Option<String>, pdr: f32) -> Self {
        Self { node_group, pdr }
    }

    pub fn get_pdr(&self) -> f32 {
        self.pdr
    }

    pub fn get_group(&self) -> Option<String> {
        self.node_group.clone()
    }
}
