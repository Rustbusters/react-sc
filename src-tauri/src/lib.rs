mod commands;
mod error;
mod listener;
mod network;
mod simulation;

use crate::commands::{send_add_sender_command, send_crash_command, send_set_pdr_command};
use commands::{get_config, load_config, start_network, stop_network};
use listener::Listener;
use network::state::NetworkState;
use tauri::State as TauriState;

use parking_lot::Mutex;
use std::sync::Arc;
use crate::commands::simulation::send_remove_sender_command;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = Arc::new(Mutex::new(NetworkState::new()));

    tauri::Builder::default()
        .setup({
            let state = Arc::clone(&state);
            move |app| {
                if cfg!(debug_assertions) {
                    app.handle().plugin(
                        tauri_plugin_log::Builder::default()
                            .level(log::LevelFilter::Info)
                            .build(),
                    )?;
                }

                let listener = Listener::new(state);
                listener.start();

                Ok(())
            }
        })
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            // commands/config
            load_config,
            get_config,
            // commands/network
            start_network,
            stop_network,
            // commands/simulation
            send_crash_command,
            send_set_pdr_command,
            send_add_sender_command,
            send_remove_sender_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
