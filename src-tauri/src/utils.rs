use common_utils::HostEvent;
use wg_2024::controller::DroneEvent;
use wg_2024::network::NodeId;

#[derive(Debug, Clone)]
pub enum ControllerEvent { // TODO: aggiungere il timestamp
    Drone { node_id: NodeId, event: DroneEvent },
    Host { node_id: NodeId, event: HostEvent },
}
