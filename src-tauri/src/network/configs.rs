use serde::Serialize;
use wg_2024::config::Config;
use wg_2024::network::NodeId;

/// Wrapper struct that implements Serialize
#[derive(Serialize)]
pub struct SerializableConfig {
    drone: Vec<SerializableDrone>,
    client: Vec<SerializableClient>,
    server: Vec<SerializableServer>,
}

#[derive(Serialize)]
struct SerializableDrone {
    id: NodeId,
    connected_node_ids: Vec<NodeId>,
    pdr: f32,
}

#[derive(Serialize)]
struct SerializableClient {
    id: NodeId,
    connected_drone_ids: Vec<NodeId>,
}

#[derive(Serialize)]
struct SerializableServer {
    id: NodeId,
    connected_drone_ids: Vec<NodeId>,
}

/// Converts `Config` (non-serializable) into `SerializableConfig`
impl From<&Config> for SerializableConfig {
    fn from(config: &Config) -> Self {
        SerializableConfig {
            drone: config
                .drone
                .iter()
                .map(|d| SerializableDrone {
                    id: d.id, // Adjust if needed
                    connected_node_ids: d.connected_node_ids.clone(),
                    pdr: d.pdr,
                })
                .collect(),

            client: config
                .client
                .iter()
                .map(|c| SerializableClient {
                    id: c.id, // Adjust if needed
                    connected_drone_ids: c.connected_drone_ids.clone(),
                })
                .collect(),

            server: config
                .server
                .iter()
                .map(|s| SerializableServer {
                    id: s.id, // Adjust if needed
                    connected_drone_ids: s.connected_drone_ids.clone(),
                })
                .collect(),
        }
    }
}
