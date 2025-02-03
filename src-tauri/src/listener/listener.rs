use crate::network::state::NetworkState;
use crate::utils::ControllerEvent;
use common_utils::HostEvent;
use crossbeam_channel::Receiver;
use log::{debug, error, info};
use parking_lot::Mutex;
use std::sync::Arc;
use std::thread;
use wg_2024::controller::DroneEvent;
use wg_2024::network::NodeId;
use wg_2024::packet::{Packet, PacketType, FRAGMENT_DSIZE};

pub struct Listener {
    state: Arc<Mutex<NetworkState>>,
}

impl Listener {
    pub fn new(state: Arc<Mutex<NetworkState>>) -> Self {
        Self { state }
    }

    pub fn start(self) {
        info!("Starting listener thread");

        thread::spawn(move || loop {
            let mut events_to_process = Vec::new();

            {
                let state_guard = self.state.lock();

                for (&node_id, (_, drone_receiver)) in state_guard.drones_controller_channels.iter()
                {
                    if let Ok(event) = drone_receiver.try_recv() {
                        events_to_process.push(ControllerEvent::Drone { node_id, event });
                    }
                }

                for (&node_id, (_, client_receiver)) in
                    state_guard.client_controller_channels.iter()
                {
                    if let Ok(event) = client_receiver.try_recv() {
                        events_to_process.push(ControllerEvent::Host { node_id, event });
                    }
                }

                for (&node_id, (_, server_receiver)) in
                    state_guard.server_controller_channels.iter()
                {
                    if let Ok(event) = server_receiver.try_recv() {
                        events_to_process.push(ControllerEvent::Host { node_id, event });
                    }
                }
            }

            let mut state_guard = self.state.lock();
            for event in events_to_process {
                match event {
                    ControllerEvent::Drone { node_id, event } => {
                        debug!(
                            "[LISTENER] DroneController received for drone {}: {:?}",
                            node_id, event
                        );
                        state_guard.received_messages.push(ControllerEvent::Drone {
                            node_id,
                            event: event.clone(),
                        });

                        match event {
                            DroneEvent::PacketSent(packet) => {
                                debug!("[LISTENER] - [DRONE {}] PacketSent: {:?}", node_id, packet);
                                state_guard.record_node_sent_packet(node_id);
                            }
                            DroneEvent::PacketDropped(packet) => {
                                debug!(
                                    "[LISTENER] - [DRONE {}] PacketDropped: {:?}",
                                    node_id, packet
                                );
                                state_guard.record_node_dropped_packet(node_id);
                            }
                            DroneEvent::ControllerShortcut(packet) => match packet.pack_type {
                                PacketType::Ack(_)
                                | PacketType::Nack(_)
                                | PacketType::FloodResponse(_) => {
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
                    ControllerEvent::Host { node_id, event } => {
                        debug!(
                            "[LISTENER] HostController received for host {}: {:?}",
                            node_id, event
                        );
                        state_guard.received_messages.push(ControllerEvent::Host {
                            node_id,
                            event: event.clone(),
                        });

                        match event {
                            HostEvent::HostMessageSent(packet) => {
                                debug!(
                                    "[LISTENER] - [HOST {}] HostMessageSent: {:?}",
                                    node_id, packet
                                );
                                state_guard.record_node_sent_packet(node_id);
                            }
                            HostEvent::HostMessageReceived(packet) => {
                                debug!(
                                    "[LISTENER] - [HOST {}] HostMessageReceived: {:?}",
                                    node_id, packet
                                );
                                // TODO: gestire questo caso
                            }
                            HostEvent::StatsResponse(stats) => {
                                debug!(
                                    "[LISTENER] - [HOST {}] StatsResponse: {:?}",
                                    node_id, stats
                                );
                                // TODO: gestire questo caso
                            }
                            HostEvent::ControllerShortcut(packet) => match packet.pack_type {
                                PacketType::Ack(_)
                                | PacketType::Nack(_)
                                | PacketType::FloodResponse(_) => {
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
                }
            }

            // thread::sleep(std::time::Duration::from_millis(10));
        });
    }

    fn send_packet_to_destination(&self, packet: Packet) {
        if let Some(dest_id) = packet.routing_header.destination() {
            if let Some((sender, _)) = self.state.lock().inter_node_channels.get(&dest_id) {
                if sender.send(packet).is_err() {
                    error!(
                        "[LISTENER] Failed to send packet to destination {}",
                        dest_id
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
