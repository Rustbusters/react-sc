pub mod metrics_handler;

use common_utils::PacketTypeHeader;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;
use wg_2024::network::NodeId;
use wg_2024::packet::PacketType;

const ROLLING_WINDOW_SIZE: usize = 100;

#[derive(Debug, Default)]
pub struct Metrics {
    /// Global heatmap: (source, dest) -> packet sent.
    pub global_heatmap: HashMap<(NodeId, NodeId), u64>,

    pub drone_metrics: HashMap<NodeId, DroneMetrics>,

    pub host_metrics: HashMap<NodeId, HostMetrics>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DroneMetrics {
    /// Number of packets dropped by the drone
    pub drops: u64,

    pub current_pdr: f32,

    pub rolling_window: Vec<bool>,

    /// Number of shortcuts used by the drone
    pub shortcuts: u64,

    /// Count for each packet type sent by the drone
    pub packet_type_counts: HashMap<PacketTypeLabel, u64>,

    pub time_series: Vec<MetricsTimePoint>,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Eq, Hash)]
pub enum PacketTypeLabel {
    MsgFragment,
    Ack,
    Nack,
    FloodRequest,
    FloodResponse,
}

impl From<&PacketType> for crate::simulation::metrics::PacketTypeLabel {
    fn from(pt: &PacketType) -> Self {
        match pt {
            PacketType::MsgFragment(_) => crate::simulation::metrics::PacketTypeLabel::MsgFragment,
            PacketType::Ack(_) => crate::simulation::metrics::PacketTypeLabel::Ack,
            PacketType::Nack(_) => crate::simulation::metrics::PacketTypeLabel::Nack,
            PacketType::FloodRequest(_) => crate::simulation::metrics::PacketTypeLabel::FloodRequest,
            PacketType::FloodResponse(_) => crate::simulation::metrics::PacketTypeLabel::FloodResponse,
        }
    }
}

impl From<&PacketTypeHeader> for crate::simulation::metrics::PacketTypeLabel {
    fn from(pt: &PacketTypeHeader) -> Self {
        match pt {
            PacketTypeHeader::MsgFragment => crate::simulation::metrics::PacketTypeLabel::MsgFragment,
            PacketTypeHeader::Ack => crate::simulation::metrics::PacketTypeLabel::Ack,
            PacketTypeHeader::FloodRequest => {
                crate::simulation::metrics::PacketTypeLabel::FloodRequest
            }
            PacketTypeHeader::FloodResponse => {
                crate::simulation::metrics::PacketTypeLabel::FloodResponse
            }
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsTimePoint {
    pub timestamp: u64,
    pub sent: u64,
    pub dropped: u64,
}

#[derive(Debug, Default)]
pub struct HostMetrics {
    /// For each destination: (sent, acked)
    pub dest_stats: HashMap<NodeId, (u64, u64)>,
    /// Number of shortcuts used by the host
    pub shortcuts: u64,
    /// Count for each packet type sent by the host
    pub packet_type_counts: HashMap<crate::simulation::metrics::PacketTypeLabel, u64>,
    /// Latency for each message sent by the host. It could be used to compute number of Message sent
    pub latencies: Vec<Duration>,
    /// Time series for the number of packets sent and dropped
    pub time_series: Vec<HostMetricsTimePoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HostMetricsTimePoint {
    pub timestamp: u64,
    pub sent: u64,
    pub acked: u64,
}
