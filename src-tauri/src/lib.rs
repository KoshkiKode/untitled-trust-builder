// Untitled Trust Builder — Tauri desktop shell.
// The app is 100% client-side; the shell simply hosts the built web frontend.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running Untitled Trust Builder");
}
