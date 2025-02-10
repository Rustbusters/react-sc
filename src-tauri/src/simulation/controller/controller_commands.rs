use crate::error::NetworkError;
use crate::simulation::state::SimulationState;
use crate::simulation::topology::NodeMetadata;
use common_utils::HostCommand;
use wg_2024::controller::DroneCommand;
use wg_2024::network::NodeId;

pub fn send_remove_sender_command(
    state: &SimulationState,
    source: NodeId,
    target: NodeId,
) -> Result<(), NetworkError> {
    match state
        .get_graph()
        .node_info
        .get(&source)
        .ok_or_else(|| NetworkError::NodeNotFound(source.to_string()))?
    {
        NodeMetadata::Drone(_) => {
            if let Some(channel) = state.get_drone_controller_channels().get(&source) {
                channel
                    .0
                    .send(DroneCommand::RemoveSender(target))
                    .map_err(|e| NetworkError::CommandSendError(e.to_string()))?;
            } else {
                return Err(NetworkError::ChannelNotFound(source));
            }
        }
        NodeMetadata::Client => {
            if let Some(channel) = state.get_client_controller_channels().get(&source) {
                channel
                    .0
                    .send(HostCommand::RemoveSender(target))
                    .map_err(|e| NetworkError::CommandSendError(e.to_string()))?;
            } else {
                return Err(NetworkError::ChannelNotFound(source));
            }
        }
        NodeMetadata::Server => {
            if let Some(channel) = state.get_server_controller_channels().get(&source) {
                channel
                    .0
                    .send(HostCommand::RemoveSender(target))
                    .map_err(|e| NetworkError::CommandSendError(e.to_string()))?;
            } else {
                return Err(NetworkError::ChannelNotFound(source));
            }
        }
    }
    Ok(())
}

pub fn send_add_sender_command(
    state: &SimulationState,
    source: NodeId,
    target: NodeId,
) -> Result<(), NetworkError> {
    let target_sender = state
        .get_inter_node_channels()
        .get(&target)
        .ok_or(NetworkError::ChannelNotFound(target))?
        .0
        .clone();

    match state
        .get_graph()
        .node_info
        .get(&source)
        .ok_or_else(|| NetworkError::NodeNotFound(source.to_string()))?
    {
        NodeMetadata::Drone(_) => {
            if let Some(channel) = state.get_drone_controller_channels().get(&source) {
                channel
                    .0
                    .send(DroneCommand::AddSender(target, target_sender))
                    .map_err(|e| NetworkError::CommandSendError(e.to_string()))?;
            } else {
                return Err(NetworkError::ChannelNotFound(source));
            }
        }
        NodeMetadata::Client => {
            if let Some(channel) = state.get_client_controller_channels().get(&source) {
                channel
                    .0
                    .send(HostCommand::AddSender(target, target_sender))
                    .map_err(|e| NetworkError::CommandSendError(e.to_string()))?;
            } else {
                return Err(NetworkError::ChannelNotFound(source));
            }
        }
        NodeMetadata::Server => {
            if let Some(channel) = state.get_server_controller_channels().get(&source) {
                channel
                    .0
                    .send(HostCommand::AddSender(target, target_sender))
                    .map_err(|e| NetworkError::CommandSendError(e.to_string()))?;
            } else {
                return Err(NetworkError::ChannelNotFound(source));
            }
        }
    }
    Ok(())
}

pub fn send_crash_command(state: &SimulationState, drone_id: NodeId) -> Result<(), NetworkError> {
    if let Some(channel) = state.get_drone_controller_channels().get(&drone_id) {
        channel
            .0
            .send(DroneCommand::Crash)
            .map_err(|e| NetworkError::CommandSendError(e.to_string()))?;
    } else {
        return Err(NetworkError::ChannelNotFound(drone_id));
    }
    Ok(())
}

pub fn send_set_pdr_command(
    state: &SimulationState,
    drone_id: NodeId,
    pdr: u8,
) -> Result<(), NetworkError> {
    if let Some(channel) = state.get_drone_controller_channels().get(&drone_id) {
        channel
            .0
            .send(DroneCommand::SetPacketDropRate((pdr as f32) / 100.0))
            .map_err(|e| NetworkError::CommandSendError(e.to_string()))?;
    } else {
        return Err(NetworkError::ChannelNotFound(drone_id));
    }
    Ok(())
}
