use crate::error::NetworkError;
use crate::network::state::GraphState;
use log::debug;
use std::collections::HashSet;

/// Validates the network graph according to the specified constraints.
/// Ensures the graph is connected, bidirectional, has valid client/server connections,
/// no duplicate node IDs, and clients/servers are at the edges of the network.
///
/// # Parameters
/// - `graph`: The network graph represented as a `GraphState`.
///
/// # Returns
/// - `Ok(())` if the graph is valid.
/// - `Err(NetworkError::ValidationError)` if the graph is invalid.
pub fn validate_graph(graph: &GraphState, strict: bool) -> Result<(), NetworkError> {
    validate_connected_graph(graph)?;
    validate_bidirectionality(graph)?;
    validate_no_multiple_connections(graph)?;
    validate_clients_and_servers(graph)?;
    validate_no_duplicate_ids(graph)?;
    validate_no_host_direct_connections(graph)?;
    if strict {
        validate_network_connected_without_hosts(graph)?;
    }
    Ok(())
}

/// Ensures the graph is connected. A graph is connected if there is a path between any two nodes.
fn validate_connected_graph(graph: &GraphState) -> Result<(), NetworkError> {
    let start_node = graph
        .adjacency
        .keys()
        .next()
        .ok_or_else(|| NetworkError::ValidationError("The graph is empty.".to_string()))?;

    let mut visited = HashSet::new();
    let mut stack = vec![*start_node];

    while let Some(node) = stack.pop() {
        if !visited.insert(node) {
            continue;
        }
        if let Some(neighbors) = graph.adjacency.get(&node) {
            stack.extend(neighbors);
        }
    }

    if visited.len() == graph.adjacency.len() {
        Ok(())
    } else {
        Err(NetworkError::ValidationError(
            "The graph is not fully connected.".to_string(),
        ))
    }
}

/// Ensures the graph is bidirectional. For every edge A -> B, there must be a corresponding edge B -> A.
fn validate_bidirectionality(graph: &GraphState) -> Result<(), NetworkError> {
    for (node, neighbors) in &graph.adjacency {
        for &neighbor in neighbors {
            if !graph
                .adjacency
                .get(&neighbor)
                .map_or(false, |n| n.contains(node))
            {
                return Err(NetworkError::ValidationError(format!(
                    "The graph is not bidirectional: {} -> {} exists, but not vice versa.",
                    node, neighbor
                )));
            }
        }
    }
    Ok(())
}

/// Check for multiple connections between nodes
fn validate_no_multiple_connections(graph: &GraphState) -> Result<(), NetworkError> {
    for (node, neighbors) in &graph.adjacency {
        let mut seen = HashSet::new();
        for &neighbor in neighbors {
            if !seen.insert(neighbor) {
                return Err(NetworkError::ValidationError(format!(
                    "Node {} has multiple connections to node {}.",
                    node, neighbor
                )));
            }
        }
    }
    Ok(())
}

/// Validates the connections of clients and servers. Clients must have 1-2 connections to drones,
/// and servers must have at least 2 connections to drones.
fn validate_clients_and_servers(graph: &GraphState) -> Result<(), NetworkError> {
    for (node, meta) in &graph.node_info {
        match meta.node_type {
            crate::network::state::NodeType::Client => {
                debug!("Validating client {}", node);
                let neighbors = graph.adjacency.get(node).ok_or_else(|| {
                    NetworkError::ValidationError(format!(
                        "Client {} has no valid connections.",
                        node
                    ))
                })?;

                if neighbors.is_empty() || neighbors.len() > 2 {
                    debug!(
                        "Client {} has {} connections: {:?}",
                        node,
                        neighbors.len(),
                        neighbors
                    );
                    return Err(NetworkError::ValidationError(format!(
                        "Client {} must have 1 or 2 connections to drones.",
                        node
                    )));
                }
            }
            crate::network::state::NodeType::Server => {
                debug!("Validating server {}", node);
                let neighbors = graph.adjacency.get(node).ok_or_else(|| {
                    NetworkError::ValidationError(format!(
                        "Server {} has no valid connections.",
                        node
                    ))
                })?;

                if neighbors.len() < 2 {
                    return Err(NetworkError::ValidationError(format!(
                        "Server {} must have at least 2 connections to drones.",
                        node
                    )));
                }
            }
            _ => {}
        }
    }
    Ok(())
}

/// Ensures there are no duplicate node IDs in the graph.
fn validate_no_duplicate_ids(graph: &GraphState) -> Result<(), NetworkError> {
    let mut seen = HashSet::new();
    for node in graph.adjacency.keys() {
        if !seen.insert(node) {
            return Err(NetworkError::ValidationError(format!(
                "Duplicate node ID found in the graph: {}",
                node
            )));
        }
    }
    Ok(())
}

/// Ensures that clients and servers are at the edges of the network.
/// Clients and servers cannot have direct connections to other clients or servers.
fn validate_no_host_direct_connections(graph: &GraphState) -> Result<(), NetworkError> {
    for (node, meta) in &graph.node_info {
        match &meta.node_type {
            crate::network::state::NodeType::Client | crate::network::state::NodeType::Server => {
                if let Some(neighbors) = graph.adjacency.get(node) {
                    for &neighbor in neighbors {
                        if matches!(
                            graph.node_info.get(&neighbor).map(|m| &m.node_type),
                            Some(
                                crate::network::state::NodeType::Client
                                    | crate::network::state::NodeType::Server
                            )
                        ) {
                            return Err(NetworkError::ValidationError(format!(
                                "Node {} (Client/Server) is directly connected to another Client/Server {}. Clients and Servers must be at the edges of the network.",
                                node, neighbor
                            )));
                        }
                    }
                }
            }
            _ => {}
        }
    }
    Ok(())
}

/// Ensures that the network remains connected when clients and servers are removed.
fn validate_network_connected_without_hosts(graph: &GraphState) -> Result<(), NetworkError> {
    // Find any drone node to start BFS
    let start_node = graph
        .node_info
        .iter()
        .find(|(_, meta)| matches!(meta.node_type, crate::network::state::NodeType::Drone))
        .map(|(&id, _)| id);

    if start_node.is_none() {
        return Err(NetworkError::ValidationError(
            "No drones found in the network. The core network must contain at least one drone."
                .to_string(),
        ));
    }
    let start_node = start_node.unwrap();

    // Perform BFS
    let mut visited = HashSet::new();
    let mut queue = vec![start_node];

    while let Some(node) = queue.pop() {
        if !visited.insert(node) {
            continue;
        }
        if let Some(neighbors) = graph.adjacency.get(&node) {
            for &neighbor in neighbors {
                // Ignore hosts (clients and servers)
                if matches!(graph.node_info.get(&neighbor), Some(m) if matches!(m.node_type, crate::network::state::NodeType::Drone))
                {
                    queue.push(neighbor);
                }
            }
        }
    }

    // Check if all drones were visited
    let drone_count = graph
        .node_info
        .values()
        .filter(|meta| matches!(meta.node_type, crate::network::state::NodeType::Drone))
        .count();

    if visited.len() == drone_count {
        Ok(())
    } else {
        Err(NetworkError::ValidationError(
            "The network is disconnected when clients and servers are removed. The drone network must remain connected.".to_string(),
        ))
    }
}
