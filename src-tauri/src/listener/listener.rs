use crate::network::state::NetworkState;
use crossbeam_channel::Receiver;
use log::{debug, error, info};
use parking_lot::Mutex;
use std::sync::Arc;
use std::thread;
use wg_2024::controller::DroneEvent;
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
                // Lock state immutably and collect events
                let state_guard = self.state.lock();

                // Collect drone events
                for (&node_id, (_, drone_receiver)) in state_guard.drones_controller_channels.iter()
                {
                    if let Ok(event) = drone_receiver.try_recv() {
                        events_to_process.push((node_id, event));
                    }
                }

                // Collect client events
                for (&node_id, (_, client_receiver)) in
                    state_guard.client_controller_channels.iter()
                {
                    if let Ok(event) = client_receiver.try_recv() {
                        // info!("[LISTENER] - [CLIENT {}] : {:?}", node_id, event);
                    }
                }

                // Collect server events
                for (&node_id, (_, server_receiver)) in
                    state_guard.server_controller_channels.iter()
                {
                    if let Ok(event) = server_receiver.try_recv() {
                        // info!("[LISTENER] - [SERVER {}] : {:?}", node_id, event);
                    }
                }
            }

            let mut state_guard = self.state.lock();
            for (node_id, event) in events_to_process {
                // info!("[LISTENER] DroneController received for drone {}: {:?}",node_id, event);

                state_guard.received_messages.push(event.clone());

                match event {
                    DroneEvent::PacketSent(packet) => {
                        /*debug!("[LISTENER] - [DRONE {}] PacketSent: {:?}", node_id, packet);
                        state_guard.record_drone_sent_packet(node_id);*/
                    }
                    DroneEvent::PacketDropped(packet) => {
                        /*debug!(
                            "[LISTENER] - [DRONE {}] PacketDropped: {:?}",
                            node_id, packet
                        );*/
                        state_guard.record_drone_dropped_packet(node_id);
                    }
                    DroneEvent::ControllerShortcut(packet) => {
                        match packet.pack_type {
                            PacketType::Ack(_)
                            | PacketType::Nack(_)
                            | PacketType::FloodResponse(_) => {
                                // Unlock before calling another function
                                self.send_packet_to_destination(packet);
                            }
                            _ => {
                                /*error!(
                                    "[LISTENER] - [DRONE {}] Unexpected packet received: {:?}",
                                    node_id, packet
                                );*/
                            }
                        }
                    }
                }
            }

            // drop(state_guard); // Explicit drop before sleeping (optional)
            // thread::sleep(std::time::Duration::from_millis(10)); // TODO: Make this configurable
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
