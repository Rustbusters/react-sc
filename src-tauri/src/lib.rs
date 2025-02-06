mod commands;
mod error;
mod listener;
mod network;
mod simulation;
mod utils;

use crate::commands::{
    add_neighbor, delete_history_config, get_all_drones_statistics,
    get_config, get_default_configs, get_default_configs_dir, get_drone_statistics,
    get_global_statistics, get_graph, get_history_configs, get_history_dir, get_host_stats,
    get_network_infos, get_network_status, get_new_messages, get_node_info, load_config,
    remove_neighbor, save_config_to_history, crash_command, send_packet, send_set_pdr_command,
    start_network, stop_network,
};
use crate::listener::Listener;
use crate::network::state::NetworkState;

use dotenv::dotenv;
use parking_lot::Mutex;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenv().ok();
    let state = Arc::new(Mutex::new(NetworkState::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup({
            let state = Arc::clone(&state);
            move |app| {
                // Enable logging plugin in debug mode
                if cfg!(debug_assertions) {
                    app.handle().plugin(
                        tauri_plugin_log::Builder::default()
                            .level(log::LevelFilter::Off)
                            // .filter(|metadata| metadata.target().starts_with("reactsc"))
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

                let app_handle = app.handle().clone();
                let listener = Listener::new(state, app_handle);
                listener.start();

                Ok(())
            }
        })
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            // config commands
            load_config,
            get_config,
            get_history_configs,
            save_config_to_history,
            delete_history_config,
            get_default_configs_dir,
            get_default_configs,
            get_history_dir,
            // network commands
            start_network,
            stop_network,
            get_network_status,
            // simulation commands
            crash_command,
            send_set_pdr_command,
            send_packet,
            remove_neighbor,
            add_neighbor,
            get_graph,
            // stats
            get_drone_statistics,
            get_all_drones_statistics,
            get_global_statistics,
            get_new_messages,
            get_network_infos,
            get_node_info,
            get_host_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
