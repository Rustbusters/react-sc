mod commands;
mod error;
mod listener;
mod network;
mod simulation;

use crate::commands::simulation::send_remove_sender_command;
use crate::commands::{
    // config
    get_config,
    load_config,
    // simulation
    send_add_sender_command,
    send_crash_command,
    send_set_pdr_command,
    send_packet,
    // network
    start_network,
    stop_network,
    // stats
    get_network_stats,
    get_received_messages,
};
use crate::listener::Listener;
use crate::network::state::NetworkState;

use parking_lot::Mutex;
use std::sync::Arc;
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = Arc::new(Mutex::new(NetworkState::new()));

    tauri::Builder::default()
        .setup({
            let state = Arc::clone(&state);
            move |app| {
                // Enable logging plugin in debug mode
                if cfg!(debug_assertions) {
                    app.handle().plugin(
                        tauri_plugin_log::Builder::default()
                            .level(log::LevelFilter::Debug)
                            .build(),
                    )?;
                }

                // Attempt to load an initial config file (optional step)
                {
                    let mut net_state = state.lock();
                    if let Err(err) = net_state.load_config_from_file("../config.toml") {
                        log::error!("Failed to load config: {:?}", err);
                    }
                }

                // Start a listener thread for events, logs, etc.
                let listener = Listener::new(state);
                listener.start();

                Ok(())
            }
        })
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            // config commands
            load_config,
            get_config,
            // network commands
            start_network,
            stop_network,
            // simulation commands
            send_crash_command,
            send_set_pdr_command,
            send_add_sender_command,
            send_remove_sender_command,
            send_packet,
            // stats
            get_network_stats,
            get_received_messages,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
