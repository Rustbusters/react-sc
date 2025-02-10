use crate::error::NetworkError;
use crate::simulation::topology::{DroneMetadata, GraphState, NodeMetadata};
use wg_2024::config::Config;
use wg_2024::network::NodeId;

impl GraphState {
    pub fn new() -> Self {
        GraphState {
            adjacency: Default::default(),
            node_info: Default::default(),
        }
    }

    pub fn build_graph(&mut self, config: &Config) {
        for drone in &config.drone {
            self.adjacency.entry(drone.id).or_default(); // TODO: remove

            // Insert neighbors
            for &nbr in &drone.connected_node_ids {
                self.adjacency.entry(drone.id).or_default().push(nbr);
            }

            // Insert drone node info
            self.node_info.insert(
                drone.id,
                NodeMetadata::Drone(DroneMetadata {
                    node_group: None,
                    pdr: drone.pdr,
                }),
            );
        }

        // 2) Insert clients
        for client in &config.client {
            self.adjacency.entry(client.id).or_default();

            for &nbr in &client.connected_drone_ids {
                self.adjacency.entry(client.id).or_default().push(nbr);
            }

            self.node_info.insert(client.id, NodeMetadata::Client);
        }

        // 3) Insert servers
        for server in &config.server {
            self.adjacency.entry(server.id).or_default();

            for &nbr in &server.connected_drone_ids {
                self.adjacency.entry(server.id).or_default().push(nbr);
            }

            self.node_info.insert(server.id, NodeMetadata::Server);
        }
    }

    pub fn set_drone_group(&mut self, node_id: NodeId, group: String) {
        if let Some(NodeMetadata::Drone(drone)) = self.node_info.get_mut(&node_id) {
            drone.node_group = Some(group);
        }
    }

    pub fn get_drone_group(&self, node_id: NodeId) -> Option<&String> {
        if let Some(NodeMetadata::Drone(drone)) = self.node_info.get(&node_id) {
            drone.node_group.as_ref()
        } else {
            None
        }
    }

    pub fn get_node_type(&self, node_id: NodeId) -> Option<&NodeMetadata> {
        self.node_info.get(&node_id)
    }

    pub fn get_nodes(&self) -> Vec<NodeId> {
        self.node_info.keys().copied().collect()
    }

    pub fn get_nodes_info(&self) -> Vec<(NodeId, &NodeMetadata)> {
        self.node_info
            .iter()
            .map(|(&id, info)| (id, info))
            .collect()
    }

    pub fn crash_drone(&mut self, drone_id: NodeId) -> Result<(), NetworkError> {
        if !matches!(self.node_info.get(&drone_id), Some(NodeMetadata::Drone(_))) {
            return Err(NetworkError::NodeIsNotDrone(drone_id));
        }
        self.node_info.remove(&drone_id);
        self.adjacency.remove(&drone_id);
        for (_, neighbors) in self.adjacency.iter_mut() {
            neighbors.retain(|&id| id != drone_id);
        }
        Ok(())
    }

    pub fn get_neighbors(&self, node_id: NodeId) -> Vec<NodeId> {
        self.adjacency.get(&node_id).cloned().unwrap_or_default()
    }

    pub fn set_pdr(&mut self, drone_id: NodeId, pdr: u8) -> Result<(), NetworkError> {
        if let Some(NodeMetadata::Drone(drone)) = self.node_info.get_mut(&drone_id) {
            drone.pdr = (pdr as f32) / 100.0;
            Ok(())
        } else {
            Err(NetworkError::NodeIsNotDrone(drone_id))
        }
    }

    pub fn remove_edge(&mut self, node1_id: NodeId, node2_id: NodeId) -> Result<(), NetworkError> {
        if node1_id == node2_id {
            return Err(NetworkError::InvalidOperation(
                "Cannot remove an edge from a node to itself".to_string(),
            ));
        }

        if !self.adjacency.contains_key(&node1_id) || !self.adjacency.contains_key(&node2_id) {
            return Err(NetworkError::NodeNotFound(format!(
                "{} or {} not found",
                node1_id, node2_id
            )));
        }

        if !self.adjacency[&node1_id].contains(&node2_id)
            || !self.adjacency[&node2_id].contains(&node1_id)
        {
            return Err(NetworkError::EdgeNotFound(node1_id, node2_id));
        }

        self.adjacency
            .get_mut(&node1_id)
            .unwrap()
            .retain(|&id| id != node2_id);
        self.adjacency
            .get_mut(&node2_id)
            .unwrap()
            .retain(|&id| id != node1_id);

        Ok(())
    }

    pub fn add_edge(&mut self, node1_id: NodeId, node2_id: NodeId) -> Result<(), NetworkError> {
        if node1_id == node2_id {
            return Err(NetworkError::InvalidOperation(
                "Cannot add an edge from a node to itself".to_string(),
            ));
        }

        if !self.adjacency.contains_key(&node1_id) || !self.adjacency.contains_key(&node2_id) {
            return Err(NetworkError::NodeNotFound(format!(
                "{} or {} not found",
                node1_id, node2_id
            )));
        }

        if self.adjacency[&node1_id].contains(&node2_id)
            || self.adjacency[&node2_id].contains(&node1_id)
        {
            return Err(NetworkError::EdgeAlreadyExists(node1_id, node2_id));
        }

        self.adjacency.entry(node1_id).or_default().push(node2_id);
        self.adjacency.entry(node2_id).or_default().push(node1_id);

        Ok(())
    }

    pub fn add_drone(
        &mut self,
        node_id: NodeId,
        connected_node_ids: Vec<NodeId>,
        pdr: u32,
    ) -> Result<(), NetworkError> {
        if self.node_info.contains_key(&node_id) {
            return Err(NetworkError::InvalidOperation(format!(
                "Node {} already exists",
                node_id
            )));
        }

        self.adjacency
            .entry(node_id)
            .or_default()
            .extend(connected_node_ids.clone());

        for &nbr in &connected_node_ids {
            self.adjacency.entry(nbr).or_default().push(node_id);
        }

        self.node_info.insert(
            node_id,
            NodeMetadata::Drone(DroneMetadata {
                node_group: None,
                pdr: (pdr as f32) / 100.0,
            }),
        );

        Ok(())
    }

    pub fn get_next_node_id(&self) -> NodeId {
        let how_many = self.node_info.len() as NodeId;
        (1..)
            .find(|id| !self.node_info.contains_key(&(*id + how_many)))
            .unwrap()
            + how_many
    }
}
