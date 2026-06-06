#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Linux: pin the X11 (XWayland) backend before any GTK/GDK init. Native Wayland breaks
  // this overlay — GDK aborts with "protocol error 71", and neither window positioning
  // (the bottom dock) nor the global cursor poll that drives click-through are supported
  // there. XWayland supports both. Respect an explicit user override if one is already set.
  #[cfg(target_os = "linux")]
  if std::env::var_os("GDK_BACKEND").is_none() {
    std::env::set_var("GDK_BACKEND", "x11");
  }

  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
