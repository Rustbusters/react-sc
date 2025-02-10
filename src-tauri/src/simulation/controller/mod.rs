use crate::error::NetworkError;
use crate::simulation::controller::controller_commands::send_set_pdr_command;
use crate::simulation::state::SimulationState;
use crate::simulation::topology::validations::validate_graph;
use wg_2024::network::NodeId;

pub mod controller_commands;

pub fn crash_drone(state: &mut SimulationState, drone_id: NodeId) -> Result<(), NetworkError> {
    // Validation
    let mut new_graph = state.get_graph().clone();
    new_graph.crash_drone(drone_id)?;
    validate_graph(&new_graph, state.get_strict_mode())?;

    // Send RemoveSender command to neighbors
    for neighbor in state.get_graph().get_neighbors(drone_id) {
        crate::simulation::controller::controller_commands::send_remove_sender_command(
            state, drone_id, neighbor,
        )?;
        crate::simulation::controller::controller_commands::send_remove_sender_command(
            state, neighbor, drone_id,
        )?;
    }

    state.get_inter_node_channels_mut().remove(&drone_id);
    crate::simulation::controller::controller_commands::send_crash_command(state, drone_id)?;

    // Update the graph
    state.set_graph(new_graph);

    state.get_drone_controller_channels_mut().remove(&drone_id);

    // Join the drone thread
    match state
        .get_nodes_threads_mut()
        .remove(&drone_id)
        .unwrap()
        .join()
    {
        Ok(_) => Ok(()),
        Err(_) => Err(NetworkError::ThreadJoinError(drone_id.to_string())),
    }
}

pub fn set_pdr(state: &mut SimulationState, drone_id: NodeId, pdr: u8) -> Result<(), NetworkError> {
    if pdr > 100 {
        return Err(NetworkError::InvalidPdr(pdr));
    }

    send_set_pdr_command(&state, drone_id, pdr)?;

    state.get_graph_mut().set_pdr(drone_id, pdr)?;

    Ok(())
}

pub fn remove_edge(
    state: &mut SimulationState,
    node1_id: NodeId,
    node2_id: NodeId,
) -> Result<(), NetworkError> {
    if node1_id == node2_id {
        return Err(NetworkError::InvalidOperation(
            "Cannot remove an edge from a node to itself".to_string(),
        ));
    }

    // Validation
    let mut new_graph = state.get_graph().clone();
    new_graph.remove_edge(node1_id, node2_id)?;
    validate_graph(&new_graph, state.get_strict_mode())?;

    // Send RemoveSender command to neighbors
    crate::simulation::controller::controller_commands::send_remove_sender_command(
        &state, node1_id, node2_id,
    )?;
    crate::simulation::controller::controller_commands::send_remove_sender_command(
        &state, node2_id, node1_id,
    )?;

    // Update the graph
    state.set_graph(new_graph);

    Ok(())
}

pub fn add_edge(
    state: &mut SimulationState,
    node1_id: NodeId,
    node2_id: NodeId,
) -> Result<(), NetworkError> {
    if node1_id == node2_id {
        return Err(NetworkError::InvalidOperation(
            "Cannot add an edge from a node to itself".to_string(),
        ));
    }

    // Validation
    let mut new_graph = state.get_graph().clone();
    new_graph.add_edge(node1_id, node2_id)?;
    validate_graph(&new_graph, state.get_strict_mode())?;

    crate::simulation::controller::controller_commands::send_add_sender_command(
        state, node1_id, node2_id,
    )?;
    crate::simulation::controller::controller_commands::send_add_sender_command(
        state, node2_id, node1_id,
    )?;

    state.set_graph(new_graph);

    Ok(())
}

pub fn add_drone(
    state: &mut SimulationState,
    neighbors: Vec<NodeId>,
    pdr: u32,
) -> Result<(), NetworkError> {
    let mut new_graph = state.get_graph().clone();
    let node_id = new_graph.get_next_node_id();
    new_graph.add_drone(node_id, neighbors.clone(), pdr)?;

    validate_graph(&new_graph, state.get_strict_mode())?;

    state.set_graph(new_graph);

    crate::simulation::initializer::network_initializer::create_new_drone(
        state, node_id, neighbors, pdr,
    )?;

    Ok(())
}
