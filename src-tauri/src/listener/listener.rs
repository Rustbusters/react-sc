use crate::network::state::NetworkState;
use crate::utils::ControllerEvent;
use common_utils::HostEvent;
use log::{debug, error, info};
use parking_lot::Mutex;
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use wg_2024::controller::DroneEvent;
use wg_2024::network::NodeId;
use wg_2024::packet::{Packet, PacketType};

pub struct Listener {
    state: Arc<Mutex<NetworkState>>,
}

impl Listener {
    pub fn new(state: Arc<Mutex<NetworkState>>) -> Self {
        Self { state }
    }

    /// Starts the listener thread.
    pub fn start(self) {
        info!("Starting listener thread");
        thread::spawn(move || loop {
            let events_to_process = self.collect_events();

            for event in events_to_process {
                debug!("Received event: {:?}", event);
                self.process_event(event);
            }

            thread::sleep(Duration::from_millis(10)); // TODO: testare
        });
    }

    /// Collects all the events from the controller channels.
    fn collect_events(&self) -> Vec<ControllerEvent> {
        let mut events = Vec::new();
        let state_guard = self.state.lock();

        for (&node_id, (_, drone_receiver)) in state_guard.drones_controller_channels.iter() {
            if let Ok(event) = drone_receiver.try_recv() {
                events.push(ControllerEvent::Drone { node_id, event });
            }
        }

        for (&node_id, (_, client_receiver)) in state_guard.client_controller_channels.iter() {
            if let Ok(event) = client_receiver.try_recv() {
                events.push(ControllerEvent::Host { node_id, event });
            }
        }

        for (&node_id, (_, server_receiver)) in state_guard.server_controller_channels.iter() {
            if let Ok(event) = server_receiver.try_recv() {
                events.push(ControllerEvent::Host { node_id, event });
            }
        }

        events
    }

    /// Processes the event by updating the metrics or forwarding the packet if it's a shortcut.
    fn process_event(&self, event: ControllerEvent) {
        {
            let mut state = self.state.lock();
            state.received_messages.push(event.clone());
        }

        match event {
            ControllerEvent::Drone { node_id, event } => {
                self.handle_drone_event(node_id, event);
            }
            ControllerEvent::Host { node_id, event } => {
                self.handle_host_event(node_id, event);
            }
        }
    }

    /// Handles the events coming from the drones updating the metrics or forwarding the packet if it's a shortcut.
    fn handle_drone_event(&self, node_id: NodeId, event: DroneEvent) {
        let mut state = self.state.lock();
        match event {
            DroneEvent::PacketSent(packet) => {
                state.metrics.update_drone_packet_sent(node_id, &packet);
            }
            DroneEvent::PacketDropped(packet) => {
                state.metrics.update_drone_packet_dropped(node_id, &packet);
            }
            DroneEvent::ControllerShortcut(packet) => match packet.pack_type {
                PacketType::Ack(_) | PacketType::Nack(_) | PacketType::FloodResponse(_) => {
                    state.metrics.update_drone_packet_sent(node_id, &packet);
                    if let Some(drone_metric) = state.metrics.drone_metrics.get_mut(&node_id) {
                        drone_metric.record_shortcut();
                    }
                    drop(state); // TODO: check this
                    self.send_packet_to_destination(packet);
                }
                _ => {
                    error!(
                        "[LISTENER] - [DRONE {}] Unexpected packet received: {:?}",
                        node_id, packet
                    );
                }
            },
        }
    }

    /// Handles the events coming from the hosts updating the metrics or forwarding the packet if it's a shortcut.
    fn handle_host_event(&self, node_id: NodeId, event: HostEvent) {
        let mut state = self.state.lock();
        match event {
            HostEvent::HostMessageSent(destination, _message, duration) => {
                state
                    .metrics
                    .update_host_message_sent(node_id, destination, duration);
            }
            HostEvent::PacketSent(packet_header) => {
                state
                    .metrics
                    .update_host_packet_sent(node_id, packet_header);
            }
            HostEvent::ControllerShortcut(packet) => match packet.pack_type {
                PacketType::Ack(_) | PacketType::Nack(_) | PacketType::FloodResponse(_) => {
                    if let Some(host_metric) = state.metrics.host_metrics.get_mut(&node_id) {
                        host_metric.record_shortcut();
                    }
                    self.send_packet_to_destination(packet);
                }
                _ => {
                    error!(
                        "[LISTENER] - [HOST {}] Unexpected packet received: {:?}",
                        node_id, packet
                    );
                }
            },
        }
    }

    /// Sends the packet to the destination node.
    fn send_packet_to_destination(&self, packet: Packet) {
        if let Some(dest_id) = packet.routing_header.destination() {
            let state = self.state.lock();
            if let Some((sender, _)) = state.inter_node_channels.get(&dest_id) {
                if let Err(err) = sender.send(packet) {
                    error!(
                        "[LISTENER] Failed to send packet to destination {}: {:?}",
                        dest_id, err
                    );
                } else {
                    debug!("[LISTENER] Packet sent to destination {}", dest_id);
                }
            } else {
                error!(
                    "[LISTENER] Destination {} not found in inter_node_channels",
                    dest_id
                );
            }
        } else {
            error!("[LISTENER] No destination found in packet routing header");
        }
    }
}
