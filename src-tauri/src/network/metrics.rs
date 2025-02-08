use crate::network::state::NodeType;
use common_utils::PacketTypeHeader;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use wg_2024::network::NodeId;
use wg_2024::packet::{Packet, PacketType};

const ROLLING_WINDOW_SIZE: usize = 100;

// =============================================================================
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Eq, Hash)]
pub enum PacketTypeLabel {
    MsgFragment,
    Ack,
    Nack,
    FloodRequest,
    FloodResponse,
}

impl From<&PacketType> for PacketTypeLabel {
    fn from(pt: &PacketType) -> Self {
        match pt {
            PacketType::MsgFragment(_) => PacketTypeLabel::MsgFragment,
            PacketType::Ack(_) => PacketTypeLabel::Ack,
            PacketType::Nack(_) => PacketTypeLabel::Nack,
            PacketType::FloodRequest(_) => PacketTypeLabel::FloodRequest,
            PacketType::FloodResponse(_) => PacketTypeLabel::FloodResponse,
        }
    }
}

impl From<&PacketTypeHeader> for PacketTypeLabel {
    fn from(pt: &PacketTypeHeader) -> Self {
        match pt {
            PacketTypeHeader::MsgFragment => PacketTypeLabel::MsgFragment,
            PacketTypeHeader::Ack => PacketTypeLabel::Ack,
            PacketTypeHeader::FloodRequest => PacketTypeLabel::FloodRequest,
            PacketTypeHeader::FloodResponse => PacketTypeLabel::FloodResponse,
        }
    }
}

// =============================================================================
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsTimePoint {
    pub timestamp: u64,
    pub sent: u64,
    pub dropped: u64,
}

// =============================================================================
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

impl DroneMetrics {
    pub fn number_of_packets_sent(&self) -> u64 {
        self.packet_type_counts.values().sum()
    }

    pub fn number_of_msg_fragments_sent(&self) -> u64 {
        *self
            .packet_type_counts
            .get(&PacketTypeLabel::MsgFragment)
            .unwrap_or(&0)
    }

    pub fn update_pdr(&mut self, successful: bool) {
        // Add success/failure to rolling window
        self.rolling_window.push(successful);
        if self.rolling_window.len() > ROLLING_WINDOW_SIZE {
            self.rolling_window.remove(0);
        }

        // Compute PDR based on recent `ROLLING_WINDOW_SIZE` packets
        let failed = self.rolling_window.iter().filter(|&&s| !s).count() as f32;
        self.current_pdr = if self.rolling_window.is_empty() {
            0.0
        } else {
            failed / self.rolling_window.len() as f32
        };

        let sent = self.number_of_msg_fragments_sent();
        let dropped = self.drops;
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or_default();

        // Maintain rolling window for time series
        self.time_series.push(MetricsTimePoint {
            timestamp,
            sent,
            dropped,
        });
    }

    pub fn record_packet(&mut self, packet_type: PacketTypeLabel) {
        *self.packet_type_counts.entry(packet_type).or_insert(0) += 1;
        if packet_type == PacketTypeLabel::MsgFragment {
            self.update_pdr(true);
        }
    }

    pub fn record_shortcut(&mut self) {
        self.shortcuts += 1;
    }
}

// =============================================================================
// 5. Statistiche per gli host (client/server)
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HostMetricsTimePoint {
    pub timestamp: u64,
    pub sent: u64,
    pub acked: u64,
}

#[derive(Debug, Default)]
pub struct HostMetrics {
    /// For each destination: (sent, acked)
    pub dest_stats: HashMap<NodeId, (u64, u64)>,
    /// Number of shortcuts used by the host
    pub shortcuts: u64,
    /// Count for each packet type sent by the host
    pub packet_type_counts: HashMap<PacketTypeLabel, u64>,
    /// Latency for each message sent by the host. It could be used to compute number of Message sent
    pub latencies: Vec<Duration>,
    /// Time series for the number of packets sent and dropped
    pub time_series: Vec<HostMetricsTimePoint>,
}

impl HostMetrics {
    pub fn record_packet(&mut self, dest: NodeId, packet_type: PacketTypeLabel) {
        let entry = self.dest_stats.entry(dest).or_insert((0, 0));
        entry.0 += 1;
        *self.packet_type_counts.entry(packet_type).or_insert(0) += 1;

        if packet_type == PacketTypeLabel::MsgFragment {
            self.update_time_series();
        }
    }

    /// Record an ack received by the host from another host.
    pub fn record_ack(&mut self, src: NodeId) {
        let entry = self.dest_stats.entry(src).or_insert((0, 0));
        entry.1 += 1;

        self.update_time_series();
    }

    fn update_time_series(&mut self) {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or_default();
        let sent = self.dest_stats.values().map(|(s, _)| s).sum();
        let acked = self.dest_stats.values().map(|(_, a)| a).sum();
        self.time_series.push(HostMetricsTimePoint {
            timestamp,
            sent,
            acked,
        });
    }

    /// Record a shortcut used by the host.
    pub fn record_shortcut(&mut self) {
        self.shortcuts += 1;
    }

    /// Record the latency for a message sent by the host.
    pub fn record_latency(&mut self, latency: Duration) {
        self.latencies.push(latency);
    }

    pub fn number_of_packets_sent(&self) -> u64 {
        self.packet_type_counts.values().sum()
    }

    pub fn number_of_fragments_sent(&self) -> u64 {
        *self
            .packet_type_counts
            .get(&PacketTypeLabel::MsgFragment)
            .unwrap_or(&0)
    }

    pub fn number_of_messages_sent(&self) -> u64 {
        self.latencies.len() as u64
    }
}

// =============================================================================
// 6. Statistiche globali (Metrics)
// =============================================================================

#[derive(Debug, Default)]
pub struct Metrics {
    /// Global heatmap: (source, dest) -> packet sent.
    pub global_heatmap: HashMap<(NodeId, NodeId), u64>,

    pub drone_metrics: HashMap<NodeId, DroneMetrics>,

    pub host_metrics: HashMap<NodeId, HostMetrics>,
}

impl Metrics {
    pub fn insert_node(&mut self, node_id: NodeId, node_type: NodeType) {
        match node_type {
            NodeType::Drone => {
                self.drone_metrics.insert(node_id, DroneMetrics::default());
            }
            NodeType::Client | NodeType::Server => {
                self.host_metrics.insert(node_id, HostMetrics::default());
            }
        }
    }

    /// Update the metrics for a packet sent by a drone.
    pub fn update_drone_packet_sent(&mut self, node_id: NodeId, packet: &Packet) {
        let packet_type = PacketTypeLabel::from(&packet.pack_type);
        if let Some(drone_metrics) = self.drone_metrics.get_mut(&node_id) {
            drone_metrics.record_packet(packet_type);
        }

        // Update the global heatmap
        if packet_type == PacketTypeLabel::MsgFragment {
            if let Some(current_hop) = packet.routing_header.current_hop() {
                self.update_global_heatmap(node_id, current_hop);
            }
        } else if packet_type == PacketTypeLabel::Ack && packet.routing_header.is_last_hop() {
            if let Some(destination) = packet.routing_header.destination() {
                if let Some(metrics) = self.host_metrics.get_mut(&destination) {
                    if let Some(source) = packet.routing_header.source() {
                        metrics.record_ack(source);
                    }
                }
            }
        }
    }

    /// Update the metrics for a packet dropped by a drone.
    pub fn update_drone_packet_dropped(&mut self, node_id: NodeId, packet: &Packet) {
        let packet_type = PacketTypeLabel::from(&packet.pack_type);
        if let Some(drone_metrics) = self.drone_metrics.get_mut(&node_id) {
            drone_metrics.drops += 1;
            drone_metrics.update_pdr(false);
        }
    }

    /// Update the metrics for a message sent by a host (with latency).
    pub fn update_host_message_sent(
        &mut self,
        node_id: NodeId,
        destination: NodeId,
        latency: Duration,
    ) {
        if let Some(host_metrics) = self.host_metrics.get_mut(&node_id) {
            host_metrics.record_latency(latency);
        }
    }

    /// Update the metrics for a packet sent by a host
    pub fn update_host_packet_sent(
        &mut self,
        node_id: NodeId,
        packet_header: common_utils::PacketHeader,
    ) {
        if let Some(host_metrics) = self.host_metrics.get_mut(&node_id) {
            if let Some(destination) = packet_header.routing_header.destination() {
                let packet_type = PacketTypeLabel::from(&packet_header.pack_type);
                host_metrics.record_packet(destination, packet_type);
            }
        }

        if let Some(current_hop) = packet_header.routing_header.current_hop() {
            if matches!(packet_header.pack_type, PacketTypeHeader::MsgFragment) {
                self.update_global_heatmap(node_id, current_hop);
            }
        }
    }

    /// Update the global heatmap with a packet sent from `src` to `dest`.
    fn update_global_heatmap(&mut self, src: NodeId, dest: NodeId) {
        *self.global_heatmap.entry((src, dest)).or_insert(0) += 1;
    }
}
