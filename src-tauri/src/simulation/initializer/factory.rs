use crossbeam_channel::Sender;
use std::collections::HashMap;
use wg_2024::controller::{DroneCommand, DroneEvent};
use wg_2024::drone::Drone;
use wg_2024::network::NodeId;
use wg_2024::packet::Packet;

/// A trait representing a generic drone implementation
/// that can be 'run' in its own thread. Because you call
/// `thread::spawn(move || { ... })`, this trait must be `Send` if
/// you want to move the drone object across threads.
pub trait DroneRunnable: Send {
    fn run(&mut self);
    fn drone_type(&self) -> &'static str;
}

/// Blanket impl: any `T` that implements `wg_2024::drone::Drone + Send`
/// automatically implements `DroneRunnable`.
impl<T: Drone + Send> DroneRunnable for T {
    fn run(&mut self) {
        <Self as Drone>::run(self);
    }

    /// Returns the type name of the drone implementation.
    fn drone_type(&self) -> &'static str {
        std::any::type_name::<T>()
            .split("::")
            .last()
            .unwrap_or("Unknown")
    }
}

/// Type alias for a factory function that produces a `Box<dyn DroneRunnable + Send>`.
pub type DroneFactory = Box<
    dyn Fn(
            NodeId,
            // The drone sends events back via this Sender<DroneEvent>
            Sender<DroneEvent>,
            // The drone receives commands from this Receiver<DroneCommand>
            crossbeam_channel::Receiver<DroneCommand>,
            // The drone receives incoming Packets
            crossbeam_channel::Receiver<Packet>,
            // A map of neighbor_id -> Sender<Packet>, used to send packets out
            HashMap<NodeId, Sender<Packet>>,
            // The PDR for this drone
            f32,
        ) -> Box<dyn DroneRunnable + Send>
        + Send
        + Sync,
>;

/// Macro that produces a vector of factory closures.
/// Each closure can instantiate a specific drone type that implements
/// `Drone + Send`.
#[macro_export]
macro_rules! drone_factories {
    ($($type_name:ty),* $(,)?) => {{
        vec![
            $(
                Box::new(
                    |id, evt_tx, cmd_rx, pkt_rx, pkt_send, pdr| -> Box<dyn DroneRunnable + Send> {
                        // Create an instance of <$type_name>, which must implement
                        // `wg_2024::drone::Drone + Send`.
                        // Because of the blanket impl, it automatically works as `DroneRunnable + Send`.
                        Box::new(<$type_name>::new(id, evt_tx, cmd_rx, pkt_rx, pkt_send, pdr))
                    }
                ) as DroneFactory
            ),*
        ]
    }};
}
