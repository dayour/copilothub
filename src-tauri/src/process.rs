//! Shared process lifecycle helpers used by long-lived child processes
//! (sidecars, language/extension hosts, etc.).
//!
//! These utilities were duplicated across `sidecar.rs` and `vscode.rs` and
//! have been extracted here so future managed processes share a single
//! implementation. Behavior is intentionally preserved: the Windows path
//! shells out to `tasklist` / `taskkill`, and the POSIX path uses
//! `kill -15` then `kill -9` with the same 500ms grace period.

use std::time::Duration;

/// Check whether a process with the given PID is still alive.
///
/// On Windows, this uses `tasklist` with CSV output and exact PID-column
/// matching to avoid false positives where the PID happens to appear inside
/// the memory or session columns (e.g. PID 24 colliding with "1,024 K").
///
/// On POSIX systems, signal 0 is used to test process existence without
/// actually delivering a signal.
pub fn is_process_alive(pid: u32) -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("tasklist")
            .args(["/FI", &format!("PID eq {}", pid), "/FO", "CSV", "/NH"])
            .output()
            .map(|o| {
                let stdout = String::from_utf8_lossy(&o.stdout);
                let target = format!("\"{}\"", pid);
                // CSV row: "ImageName","PID","SessionName","Session#","MemUsage"
                stdout.lines().any(|line| {
                    line.split(',')
                        .nth(1)
                        .map(|c| c.trim() == target)
                        .unwrap_or(false)
                })
            })
            .unwrap_or(false)
    }

    #[cfg(not(target_os = "windows"))]
    {
        unsafe { libc::kill(pid as i32, 0) == 0 }
    }
}

/// Attempt graceful shutdown of a process, falling back to a force kill
/// after a short grace period.
///
/// On Windows this is `taskkill /PID <pid>` followed by `taskkill /PID <pid> /F`.
/// On POSIX this is `kill -15` followed by `kill -9`. Both paths sleep
/// 500ms between attempts to give the target a chance to exit cleanly.
pub fn shutdown_process(pid: u32) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        let graceful = Command::new("taskkill")
            .args(["/PID", &pid.to_string()])
            .output();

        if let Ok(output) = graceful {
            if output.status.success() {
                std::thread::sleep(Duration::from_millis(500));
                if !is_process_alive(pid) {
                    return Ok(());
                }
            }
        }

        let forced = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F"])
            .output()
            .map_err(|e| format!("Failed to force-kill process {}: {}", pid, e))?;

        if forced.status.success() || !is_process_alive(pid) {
            Ok(())
        } else {
            Err(format!(
                "Force-kill returned non-zero for PID {}: {}",
                pid,
                String::from_utf8_lossy(&forced.stderr)
            ))
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        use std::process::Command;

        let _ = Command::new("kill")
            .args(["-15", &pid.to_string()])
            .output();

        std::thread::sleep(Duration::from_millis(500));

        if !is_process_alive(pid) {
            return Ok(());
        }

        let _ = Command::new("kill").args(["-9", &pid.to_string()]).output();

        if !is_process_alive(pid) {
            Ok(())
        } else {
            Err(format!("Failed to kill process {}", pid))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A PID that is essentially guaranteed not to belong to a real process.
    /// Both Windows and Linux PID limits are well below this value in practice.
    const UNLIKELY_PID: u32 = 4_000_000_000;

    #[test]
    fn is_process_alive_reports_false_for_unlikely_pid() {
        assert!(!is_process_alive(UNLIKELY_PID));
    }

    #[test]
    fn is_process_alive_reports_true_for_current_process() {
        let me = std::process::id();
        assert!(is_process_alive(me));
    }

    #[test]
    fn shutdown_process_returns_ok_when_target_does_not_exist() {
        // Target is already gone; the helper should treat this as success
        // because the post-condition (process not alive) is satisfied.
        assert!(shutdown_process(UNLIKELY_PID).is_ok());
    }
}
