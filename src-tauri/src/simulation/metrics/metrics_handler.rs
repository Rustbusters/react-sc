use crate::simulation::metrics::{
    DroneMetrics, HostMetrics, HostMetricsTimePoint, Metrics, MetricsTimePoint, PacketTypeLabel,
};
use common_utils::PacketTypeHeader;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use wg_2024::network::NodeId;
use wg_2024::packet::{NodeType, Packet};

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
    pub fn update_drone_packet_dropped(&mut self, node_id: NodeId, _packet: &Packet) {
        if let Some(drone_metrics) = self.drone_metrics.get_mut(&node_id) {
            drone_metrics.drops += 1;
            drone_metrics.update_pdr(false);
        }
    }

    /// Update the metrics for a message sent by a host (with latency).
    pub fn update_host_message_sent(
        &mut self,
        node_id: NodeId,
        _destination: NodeId,
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

impl crate::simulation::metrics::HostMetrics {
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

impl crate::simulation::metrics::DroneMetrics {
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
        if self.rolling_window.len() > crate::simulation::metrics::ROLLING_WINDOW_SIZE {
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
