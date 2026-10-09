// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod ytdlp;

use commands::*;
use ytdlp::AppState;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            get_video_info,
            start_download,
            pause_download,
            resume_download,
            cancel_download,
            get_download_progress,
            play_downloaded_file,
            open_download_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
