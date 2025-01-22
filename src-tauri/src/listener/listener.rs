use crate::network::state::NetworkState;
use crossbeam_channel::Receiver;
use log::{debug, error, info};
use node::commands::HostEvent;
use parking_lot::Mutex;
use std::collections::HashMap;
use std::sync::Arc;
use std::thread;
use wg_2024::controller::DroneEvent;
use wg_2024::network::NodeId;
use wg_2024::packet::{Packet, PacketType, FRAGMENT_DSIZE};

pub struct Listener {
    // state: Arc<Mutex<NetworkState>>,
    drone_channels: HashMap<NodeId, Receiver<DroneEvent>>,
    client_channels: HashMap<NodeId, Receiver<HostEvent>>,
    server_channels: HashMap<NodeId, Receiver<HostEvent>>,
}

impl Listener {
    pub fn new(state: Arc<Mutex<NetworkState>>) -> Self {
        let state_guard = state.lock();
        let drone_channels = state_guard
            .simulation_controller_channels
            .iter()
            .map(|(&id, (_, receiver))| (id, receiver.clone()))
            .collect();
        let client_channels = state_guard
            .client_controller_channels
            .iter()
            .map(|(&id, (_, receiver))| (id, receiver.clone()))
            .collect();
        let server_channels = state_guard
            .server_controller_channels
            .iter()
            .map(|(&id, (_, receiver))| (id, receiver.clone()))
            .collect();

        drop(state_guard);

        Self {
            // state,
            drone_channels,
            client_channels,
            server_channels,
        }
    }

    pub fn start(self) {
        info!("Starting listener thread");
        thread::spawn(move || loop {
            // Process drone events
            for (&node_id, drone_receiver) in &self.drone_channels {
                if let Ok(event) = drone_receiver.try_recv() {
                    debug!(
                        "[LISTENER] DroneController received for drone {}: {:?}",
                        node_id, event
                    );
                    match event {
                        DroneEvent::PacketSent(packet) => {
                            if let Err(msg) = self.handle_drone_commands(packet) {
                                error!("{:?}", msg);
                            }
                        }
                        DroneEvent::PacketDropped(packet) => {
                            info!(
                                "[LISTENER] - [DRONE {}] PacketDropped: {:?}",
                                node_id, packet
                            );
                        }
                        DroneEvent::ControllerShortcut(_) => {}
                    }
                }
            }

            // Process client events
            for (&node_id, client_receiver) in &self.client_channels {
                if let Ok(event) = client_receiver.try_recv() {
                    info!("[LISTENER] - [CLIENT {}] : {:?}", node_id, event);
                }
            }

            // Process server events
            for (&node_id, server_receiver) in &self.server_channels {
                if let Ok(event) = server_receiver.try_recv() {
                    info!("[LISTENER] - [SERVER {}] : {:?}", node_id, event);
                }
            }

            thread::sleep(std::time::Duration::from_millis(10));
        });
    }

    fn handle_drone_commands(&self, packet: Packet) -> Result<(), String> {
        match &packet.pack_type {
            PacketType::MsgFragment(fragment) => {
                if fragment.fragment_index == 0
                    && fragment.total_n_fragments == 0
                    && fragment.length == 0
                {
                    /*let hunt_mode = Self::get_hunt_mode(&fragment.data);
                    self.handle_hunt_mode(hunt_mode)?;*/
                }
                Ok(())
            }
            _ => Ok(()),
        }
    }

    /*fn get_hunt_mode(data: &[u8; FRAGMENT_DSIZE]) -> HuntMode {
        let first_char = data[0] as char;
        match first_char {
            'n' => HuntMode::NormalShot(data[1]),
            'l' => HuntMode::LongShot(data[1]),
            'e' => HuntMode::EMPBlast,
            _ => HuntMode::EMPBlast,
        }
    }*/

    /*fn handle_hunt_mode(&self, hunt_mode: HuntMode) -> Result<(), String> {
        match hunt_mode {
            HuntMode::NormalShot(target_drone_id) => {
                info!("NormalShot targeting drone {}", target_drone_id);
                // Access or modify `self.state` as needed
            }
            HuntMode::LongShot(shot_range) => {
                info!("LongShot with range {}", shot_range);
                // Access or modify `self.state` as needed
            }
            HuntMode::EMPBlast => {
                info!("EMPBlast triggered");
                // Access or modify `self.state` as needed
            }
        }
        Ok(())
    }*/
}
