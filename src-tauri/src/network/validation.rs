use crate::network::state::GraphState;
use std::collections::HashSet;
use log::debug;
/*
Checks that should be performed on the network graph:
- The graph is connected
- The graph is bidirectional
- Clients have 1-2 connections to drones
- Servers have at least 2 connections to drones
- No duplicate node IDs
- Clients and servers are at the edges of the network: if all clients and servers are removed, the remaining graph is disconnected
- Clients and servers cannot have direct connections to other clients or servers
*/

/// Validates the network graph according to the specified constraints.
/// Ensures the graph is connected, bidirectional, has valid client/server connections,
/// no duplicate node IDs, and clients/servers are at the edges of the network.
///
/// # Parameters
/// - `graph`: The network graph represented as a `GraphState`.
///
/// # Returns
/// - `Ok(())` if the graph is valid.
/// - `Err(String)` with an error message if the graph is invalid.
pub fn validate_graph(graph: &GraphState) -> Result<(), String> {
    validate_connected_graph(graph)?;
    validate_bidirectionality(graph)?;
    validate_clients_and_servers(graph)?;
    validate_no_duplicate_ids(graph)?;
    validate_edge_nodes(graph)?;
    Ok(())
}

/// Ensures the graph is connected. A graph is connected if there is a path between any two nodes.
///
/// # Parameters
/// - `graph`: The network graph represented as a `GraphState`.
///
/// # Returns
/// - `Ok(())` if the graph is connected.
/// - `Err(String)` if the graph is disconnected.
fn validate_connected_graph(graph: &GraphState) -> Result<(), String> {
    let start_node = graph.adjacency.keys().next().ok_or("Graph is empty")?;
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
        Err("Graph is not connected".to_string())
    }
}

/// Ensures the graph is bidirectional. For every edge A -> B, there must be a corresponding edge B -> A.
///
/// # Parameters
/// - `graph`: The network graph represented as a `GraphState`.
///
/// # Returns
/// - `Ok(())` if the graph is bidirectional.
/// - `Err(String)` if any edge is missing its reverse counterpart.
fn validate_bidirectionality(graph: &GraphState) -> Result<(), String> {
    for (node, neighbors) in &graph.adjacency {
        for &neighbor in neighbors {
            if !graph
                .adjacency
                .get(&neighbor)
                .map_or(false, |n| n.contains(node))
            {
                return Err(format!(
                    "Graph is not bidirectional: {} -> {}",
                    node, neighbor
                ));
            }
        }
    }
    Ok(())
}

/// Validates the connections of clients and servers. Clients must have 1-2 connections to drones,
/// and servers must have at least 2 connections to drones.
///
/// # Parameters
/// - `graph`: The network graph represented as a `GraphState`.
///
/// # Returns
/// - `Ok(())` if all clients and servers have valid connections.
/// - `Err(String)` if any client or server has invalid connections.
fn validate_clients_and_servers(graph: &GraphState) -> Result<(), String> {
    for (node, meta) in &graph.node_info {
        match meta.node_type {
            crate::network::state::NodeType::Client => {
                debug!("Validating client {}", node);
                let neighbors = graph.adjacency.get(node).ok_or("Client has no neighbors")?;
                if neighbors.is_empty() || neighbors.len() > 2 {
                    debug!("Client {} has {} neighbors: {:?}", node, neighbors.len(), neighbors);
                    return Err(format!("Client {} must have 1-2 drone connections", node));
                }
            }
            crate::network::state::NodeType::Server => {
                debug!("Validating server {}", node);
                let neighbors = graph.adjacency.get(node).ok_or("Server has no neighbors")?;
                if neighbors.len() < 2 {
                    return Err(format!(
                        "Server {} must have at least 2 drone connections",
                        node
                    ));
                }
            }
            _ => {}
        }
    }
    Ok(())
}

/// Ensures there are no duplicate node IDs in the graph.
///
/// # Parameters
/// - `graph`: The network graph represented as a `GraphState`.
///
/// # Returns
/// - `Ok(())` if no duplicate IDs are found.
/// - `Err(String)` if duplicate IDs are detected.
fn validate_no_duplicate_ids(graph: &GraphState) -> Result<(), String> {
    let mut seen = HashSet::new();
    for node in graph.adjacency.keys() {
        if !seen.insert(node) {
            return Err(format!("Duplicate node ID detected: {}", node));
        }
    }
    Ok(())
}

/// Ensures that clients and servers are at the edges of the network.
/// Clients and servers cannot have direct connections to other clients or servers.
///
/// # Parameters
/// - `graph`: The network graph represented as a `GraphState`.
///
/// # Returns
/// - `Ok(())` if all clients and servers are at the network edges.
/// - `Err(String)` if any client or server is not at the edge.
fn validate_edge_nodes(graph: &GraphState) -> Result<(), String> {
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
                            return Err(format!(
                                "Client/Server {} is not at the edge of the network",
                                node
                            ));
                        }
                    }
                }
            }
            _ => {}
        }
    }
    Ok(())
}
