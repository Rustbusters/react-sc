use serde::ser::{Serialize, Serializer};
use thiserror::Error;
use wg_2024::network::NodeId;

#[derive(Error, Debug)]
pub enum NetworkError {
    #[error("Failed to delete configuration file: {0}")]
    ConfigFileDeleteError(std::io::Error),

    #[error("Failed to read configuration file: {0}")]
    ConfigFileReadError(#[from] std::io::Error),

    #[error("Failed to parse configuration file: {0}")]
    ConfigParseError(#[from] toml::de::Error),

    #[error("The network is already running")]
    NetworkAlreadyRunning,

    #[error("The network is not running")]
    NetworkNotRunning,

    #[error("No configuration loaded")]
    NoConfigLoaded,

    #[error("The selected node does not exist: {0}")]
    NodeNotFound(String),

    #[error("The selected edge does not exist: {0} - {1}")]
    EdgeNotFound(NodeId, NodeId),

    #[error("The selected edge already exists: {0} - {1}")]
    EdgeAlreadyExists(NodeId, NodeId),

    #[error("The selected drone is not a drone: {0}")]
    NodeIsNotDrone(NodeId),

    #[error("Invalid Packet Drop Rate value: {0}")]
    InvalidPdr(u8),

    #[error("Error while sending the message: {0}")]
    SendError(String),

    #[error("Communication channel not found for node {0}")]
    ChannelNotFound(NodeId),

    #[error("The network is in an invalid state: {0}")]
    ValidationError(String),

    #[error("Error while sending command: {0}")]
    CommandSendError(String),

    #[error("Invalid operation: {0}")]
    InvalidOperation(String),

    #[error("Generic error: {0}")]
    Other(String),

    #[error("Thread join error: {0}")]
    ThreadJoinError(String),

    #[error("Path error: {0}")]
    PathError(String),
}

impl Serialize for NetworkError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
