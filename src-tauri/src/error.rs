use serde::ser::{Serialize, Serializer};
use std::path::PathBuf;
use thiserror::Error;
use wg_2024::network::NodeId;

#[derive(Error, Debug)]
pub enum NetworkError {
    #[error("Failed to read config file: {0}")]
    ConfigFileReadError(#[from] std::io::Error),

    #[error("Failed to parse config file: {0}")]
    ConfigParseError(#[from] toml::de::Error),

    #[error("Network already running")]
    NetworkAlreadyRunning,

    #[error("Network is not running")]
    NetworkNotRunning,

    #[error("No configuration loaded")]
    NoConfigLoaded,

    #[error("Invalid configuration for path: {0}")]
    InvalidConfigPath(PathBuf),

    #[error("The selected drone does not exist")]
    DroneNotFound,

    #[error("The target drone does not exist")]
    TargetDroneNotFound,

    #[error("Drone and target can't be the same drone")]
    SameDroneTarget,

    #[error("Invalid packet drop rate: {0}")]
    InvalidPdr(u8),

    #[error("SendError: {0}")]
    SendError(String),

    #[error("Channel not found for node {0}")]
    ChannelNotFound(NodeId),
}

impl Serialize for NetworkError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
