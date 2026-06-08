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

  // Linux: WebKitGTK's DMABUF renderer produces a black/blank WebGL canvas on many GPU+driver
  // combos (notably NVIDIA) — exactly the "game doesn't render" symptom. Disabling it forces a
  // path that reliably presents the GL surface. Respect an explicit user override.
  #[cfg(target_os = "linux")]
  if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
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
