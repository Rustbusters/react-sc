pub mod commands;
mod error;
pub mod simulation;
mod utils;

use crate::simulation::listener::Listener;
use crate::simulation::state::SimulationState;
use dotenv::dotenv;
use parking_lot::Mutex;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenv().ok();
    let state = Arc::new(Mutex::new(SimulationState::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup({
            let state = Arc::clone(&state);
            move |app| {
                // Enable logging plugin in debug mode
                if cfg!(debug_assertions) {
                    app.handle().plugin(
                        tauri_plugin_log::Builder::default()
                            .level(log::LevelFilter::Info)
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

                let listener = Listener::new(state);
                listener.start();

                Ok(())
            }
        })
        .manage(state)
        .manage(Arc::new(Mutex::new(None::<Arc<AtomicBool>>)))
        .invoke_handler(tauri::generate_handler![
            // config
            crate::commands::config::load_config,
            crate::commands::config::get_history_dir,
            crate::commands::config::get_history_configs,
            crate::commands::config::get_default_configs,
            crate::commands::config::delete_history_config,
            // controller
            crate::commands::controller::crash_drone, // TODO: rimuoverlo ex crash_command,
            crate::commands::controller::set_pdr,
            crate::commands::controller::send_packet,
            crate::commands::controller::start_repeated_sending,
            crate::commands::controller::stop_repeated_sending,
            // settings
            crate::commands::settings::set_discovery_interval,
            crate::commands::settings::get_discovery_interval,
            crate::commands::settings::get_strict_mode,
            crate::commands::settings::set_strict_mode,
            // simulation
            crate::commands::simulation::start_simulation,
            crate::commands::simulation::get_simulation_status,
            crate::commands::simulation::stop_simulation,
            // topology
            crate::commands::topology::remove_node,
            crate::commands::topology::remove_edge,
            // fix add_drone
            crate::commands::topology::add_edge,
            crate::commands::topology::get_graph, // da finire il refactoring
            crate::commands::topology::get_network_nodes, // da finire il refactoring
            // metrics
            crate::commands::metrics::get_new_messages,
            crate::commands::metrics::get_network_infos,
            crate::commands::metrics::get_node_info,
            crate::commands::metrics::get_overview_metrics,
            crate::commands::metrics::get_drone_metrics,
            crate::commands::metrics::get_host_metrics,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
