use crate::error::NetworkError;
use crate::network::network_node::{initialize_clients, initialize_drones, initialize_servers};
use crossbeam_channel::{Receiver, Sender};
use log::error;
use node::commands::{HostCommand, HostEvent};
use std::cmp::Ordering;
use std::collections::HashMap;
use wg_2024::config::{Client, Config, Drone, Server};
use wg_2024::controller::{DroneCommand, DroneEvent};
use wg_2024::network::NodeId;
use wg_2024::packet::Packet;

pub struct NetworkState {
    pub config: Option<Config>,
    pub handles: Vec<std::thread::JoinHandle<()>>,
    pub intra_node_channels: HashMap<NodeId, (Sender<Packet>, Receiver<Packet>)>,
    pub simulation_controller_channels:
        HashMap<NodeId, (Sender<DroneCommand>, Receiver<DroneEvent>)>,
    pub client_controller_channels: HashMap<NodeId, (Sender<HostCommand>, Receiver<HostEvent>)>,
    pub server_controller_channels: HashMap<NodeId, (Sender<HostCommand>, Receiver<HostEvent>)>,
}

impl NetworkState {
    pub fn new() -> Self {
        NetworkState {
            config: None,
            handles: Vec::new(),
            intra_node_channels: HashMap::new(),
            simulation_controller_channels: HashMap::new(),
            client_controller_channels: HashMap::new(),
            server_controller_channels: HashMap::new(),
        }
    }

    pub fn get_drones(&self) -> Option<Vec<Drone>> {
        self.config.as_ref().map(|config| config.drone.clone())
    }

    pub fn get_clients(&self) -> Option<Vec<Client>> {
        self.config.as_ref().map(|config| config.client.clone())
    }

    pub fn get_servers(&self) -> Option<Vec<Server>> {
        self.config.as_ref().map(|config| config.server.clone())
    }

    pub fn send_crash_command(&mut self, drone_id: NodeId) -> Result<(), String> {
        // Check if the drone exists in the config
        if let Some(config) = &mut self.config {
            if let Some(drone_index) = config.drone.iter().position(|d| d.id == drone_id) {
                // Send the Crash command to the drone
                if let Some((sender, _)) = self.simulation_controller_channels.get(&drone_id) {
                    sender.send(DroneCommand::Crash).unwrap();
                }

                // Remove the drone from internal state maps
                self.simulation_controller_channels.remove(&drone_id);
                self.intra_node_channels.remove(&drone_id);

                // Remove the drone's thread handle if applicable
                // Note: You might need to store handles in a way that you can identify them by drone_id

                // Remove the drone from the config
                config.drone.remove(drone_index);

                // Remove the crashed drone from other drones' connected_node_ids
                for drone in &mut config.drone {
                    drone.connected_node_ids.retain(|&id| id != drone_id);
                }

                Ok(())
            } else {
                error!("The selected drone does not exist in config");
                Err("Please type a valid drone id".to_string())
            }
        } else {
            error!("No configuration loaded");
            Err("No configuration loaded".to_string())
        }
    }

    pub fn send_set_pdr_command(&self, drone_id: NodeId, pdr: u8) -> Result<(), String> {
        let drones = self.get_drones().unwrap_or_default();
        match drones.iter().position(|drone| drone.id == drone_id) {
            Some(_) => {
                if pdr > 100 {
                    error!("The PDR selected is out of range");
                    Err(format!(
                        "Wrong drop rate inserted, expected a value between 0 and 100, got {}",
                        pdr
                    ))
                } else {
                    let (sender, _) = self.simulation_controller_channels.get(&drone_id).unwrap();
                    sender
                        .send(DroneCommand::SetPacketDropRate((pdr as f32) / 100.0))
                        .unwrap();
                    Ok(())
                }
            }
            None => {
                error!("The selected drone does not exist");
                Err("Please type a valid drone id".to_string())
            }
        }
    }

    pub fn send_add_sender_command( // FIXME: Aggiungere la gestione di tutti i nodi (anche client e server)
        &mut self,
        drone_id: NodeId,
        target_id: NodeId,
    ) -> Result<(), String> {
        if drone_id == target_id {
            error!("Drone index and target index are the same");
            return Err("Drone and target can't be the same drone".to_string());
        }

        if let Some(config) = &mut self.config {
            // Find indices of the drones
            let drone_index = config.drone.iter().position(|d| d.id == drone_id);
            let target_index = config.drone.iter().position(|d| d.id == target_id);

            match (drone_index, target_index) {
                (Some(drone_idx), Some(target_idx)) => {
                    let (drone_ref, target_ref) = match drone_idx.cmp(&target_idx) {
                        Ordering::Less => {
                            let (left, right) = config.drone.split_at_mut(target_idx);
                            (&mut left[drone_idx], &mut right[0])
                        }
                        Ordering::Greater => {
                            let (left, right) = config.drone.split_at_mut(drone_idx);
                            (&mut right[0], &mut left[target_idx])
                        }
                        Ordering::Equal => {
                            error!("Drone and target indices are the same");
                            return Err("Drone and target can't be the same drone".to_string());
                        }
                    };

                    // Send AddSender command to the drone
                    let target_sender = self.intra_node_channels.get(&target_id).unwrap().0.clone();
                    let controller_sender = self
                        .simulation_controller_channels
                        .get(&drone_id)
                        .unwrap()
                        .0
                        .clone();
                    controller_sender
                        .send(DroneCommand::AddSender(target_id, target_sender))
                        .unwrap();

                    // Update connected_node_ids in config for both drones
                    if !drone_ref.connected_node_ids.contains(&target_id) {
                        drone_ref.connected_node_ids.push(target_id);
                    }
                    if !target_ref.connected_node_ids.contains(&drone_id) {
                        target_ref.connected_node_ids.push(drone_id);
                    }

                    Ok(())
                }
                _ => {
                    error!("One or both drones do not exist in config");
                    Err("One or both drones do not exist".to_string())
                }
            }
        } else {
            error!("No configuration loaded");
            Err("No configuration loaded".to_string())
        }
    }

    pub fn send_remove_sender_command( // FIXME: Aggiungere la gestione di tutti i nodi (anche client e server)
        &mut self,
        drone_id: NodeId,
        target_id: NodeId,
    ) -> Result<(), String> {
        if drone_id == target_id {
            error!("Drone index and target index are the same");
            return Err("Drone and target can't be the same drone".to_string());
        }

        // Ensure both drones exist in the config
        if let Some(config) = &mut self.config {
            // Find indices of the drones
            let drone_index = config.drone.iter().position(|d| d.id == drone_id);
            let target_index = config.drone.iter().position(|d| d.id == target_id);

            match (drone_index, target_index) {
                (Some(drone_idx), Some(target_idx)) => {
                    let (drone_ref, target_ref) = match drone_idx.cmp(&target_idx) {
                        Ordering::Less => {
                            let (left, right) = config.drone.split_at_mut(target_idx);
                            (&mut left[drone_idx], &mut right[0])
                        }
                        Ordering::Greater => {
                            let (left, right) = config.drone.split_at_mut(drone_idx);
                            (&mut right[0], &mut left[target_idx])
                        }
                        Ordering::Equal => {
                            error!("Drone and target indices are the same");
                            return Err("Drone and target can't be the same drone".to_string());
                        }
                    };

                    // Send RemoveSender command to the drone
                    let controller_sender = self
                        .simulation_controller_channels
                        .get(&drone_id)
                        .unwrap()
                        .0
                        .clone();
                    controller_sender
                        .send(DroneCommand::RemoveSender(target_id))
                        .unwrap();

                    // Update connected_node_ids in config for both drones
                    drone_ref.connected_node_ids.retain(|&id| id != target_id);
                    target_ref.connected_node_ids.retain(|&id| id != drone_id);

                    Ok(())
                }
                _ => {
                    error!("One or both drones do not exist in config");
                    Err("One or both drones do not exist".to_string())
                }
            }
        } else {
            error!("No configuration loaded");
            Err("No configuration loaded".to_string())
        }
    }

    pub fn load_config(&mut self, config: Config) -> Result<(), NetworkError> {
        // Clear existing configuration if any
        self.handles.clear();
        self.intra_node_channels.clear();
        self.simulation_controller_channels.clear();
        self.client_controller_channels.clear();
        self.server_controller_channels.clear();

        // Store the configuration
        self.config = Some(config);

        Ok(())
    }

    pub fn initialize_network(&mut self) -> Result<(), NetworkError> {
        let config = self.config.as_ref().ok_or(NetworkError::NoConfigLoaded)?;

        self.intra_node_channels.clear();
        self.simulation_controller_channels.clear();
        self.client_controller_channels.clear();
        self.server_controller_channels.clear();

        // initialize intra_node_channels
        for drone in &config.drone {
            let (sender, receiver) = crossbeam_channel::unbounded();
            self.intra_node_channels
                .insert(drone.id, (sender, receiver));
        }

        for client in &config.client {
            let (sender, receiver) = crossbeam_channel::unbounded();
            self.intra_node_channels
                .insert(client.id, (sender, receiver));
        }

        for server in &config.server {
            let (sender, receiver) = crossbeam_channel::unbounded();
            self.intra_node_channels
                .insert(server.id, (sender, receiver));
        }

        initialize_drones(self)?;
        initialize_clients(self)?;
        initialize_servers(self)?;

        Ok(())
    }
}
