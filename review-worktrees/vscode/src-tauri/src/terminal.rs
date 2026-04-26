use serde::Serialize;
use std::{
    env,
    ffi::OsString,
    path::{Path, PathBuf},
};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalShellCatalogEntry {
    r#type: String,
    available: bool,
    command: Option<String>,
    args: Vec<String>,
    unavailable_reason: Option<String>,
}

fn is_windows() -> bool {
    cfg!(target_os = "windows")
}

fn candidate_extensions() -> Vec<OsString> {
    if !is_windows() {
        return vec![OsString::new()];
    }

    env::var_os("PATHEXT")
        .map(|value| {
            env::split_paths(&value)
                .map(|path| path.as_os_str().to_os_string())
                .collect::<Vec<_>>()
        })
        .filter(|extensions| !extensions.is_empty())
        .unwrap_or_else(|| {
            vec![
                OsString::from(".COM"),
                OsString::from(".EXE"),
                OsString::from(".BAT"),
                OsString::from(".CMD"),
            ]
        })
}

fn has_executable_extension(path: &Path) -> bool {
    path.extension().is_some()
}

fn resolve_existing_path(path: PathBuf) -> Option<String> {
    if path.is_file() {
        return Some(path.to_string_lossy().to_string());
    }

    None
}

fn find_command_on_path(candidates: &[&str]) -> Option<String> {
    for candidate in candidates {
        let candidate_path = Path::new(candidate);

        if candidate_path.components().count() > 1 {
            if let Some(path) = resolve_existing_path(candidate_path.to_path_buf()) {
                return Some(path);
            }

            if is_windows() && !has_executable_extension(candidate_path) {
                for extension in candidate_extensions() {
                    let mut with_extension = candidate_path.as_os_str().to_os_string();
                    with_extension.push(extension);

                    if let Some(path) = resolve_existing_path(PathBuf::from(with_extension)) {
                        return Some(path);
                    }
                }
            }

            continue;
        }

        let path_value = match env::var_os("PATH") {
            Some(value) => value,
            None => continue,
        };

        for directory in env::split_paths(&path_value) {
            let base_path = directory.join(candidate);

            if let Some(path) = resolve_existing_path(base_path.clone()) {
                return Some(path);
            }

            if is_windows() && !has_executable_extension(Path::new(candidate)) {
                for extension in candidate_extensions() {
                    let mut with_extension = base_path.as_os_str().to_os_string();
                    with_extension.push(extension.clone());

                    if let Some(path) = resolve_existing_path(PathBuf::from(with_extension)) {
                        return Some(path);
                    }
                }
            }
        }
    }

    None
}

fn find_windows_git_bash() -> Option<String> {
    let mut candidate_paths: Vec<PathBuf> = Vec::new();

    for env_key in ["ProgramFiles", "ProgramFiles(x86)", "LocalAppData"] {
        if let Some(root) = env::var_os(env_key) {
            let root_path = PathBuf::from(root);
            candidate_paths.push(root_path.join("Git").join("bin").join("bash.exe"));
            candidate_paths.push(
                root_path
                    .join("Programs")
                    .join("Git")
                    .join("bin")
                    .join("bash.exe"),
            );
        }
    }

    for candidate in candidate_paths {
        if let Some(path) = resolve_existing_path(candidate) {
            return Some(path);
        }
    }

    find_command_on_path(&["git-bash.exe"])
}

fn shell_entry(
    shell_type: &str,
    available: bool,
    command: Option<String>,
    args: &[&str],
    unavailable_reason: Option<&str>,
) -> TerminalShellCatalogEntry {
    TerminalShellCatalogEntry {
        r#type: shell_type.to_string(),
        available,
        command,
        args: args.iter().map(|value| (*value).to_string()).collect(),
        unavailable_reason: unavailable_reason.map(|value| value.to_string()),
    }
}

fn build_terminal_shell_catalog() -> Vec<TerminalShellCatalogEntry> {
    if is_windows() {
        let powershell_command =
            find_command_on_path(&["powershell.exe", "pwsh.exe", "powershell", "pwsh"]);
        let command_prompt =
            env::var("ComSpec").ok().or_else(|| find_command_on_path(&["cmd.exe", "cmd"]));
        let git_bash_command = find_windows_git_bash();
        let wsl_command = find_command_on_path(&["wsl.exe", "wsl"]);

        return vec![
            shell_entry(
                "powershell",
                powershell_command.is_some(),
                powershell_command,
                &["-NoLogo", "-NoProfile"],
                Some("PowerShell executable was not found on PATH."),
            ),
            shell_entry(
                "command-prompt",
                command_prompt.is_some(),
                command_prompt,
                &[],
                Some("cmd.exe was not found on PATH."),
            ),
            shell_entry(
                "git-bash",
                git_bash_command.is_some(),
                git_bash_command,
                &["--login", "-i"],
                Some("Git Bash was not found in common install locations or PATH."),
            ),
            shell_entry(
                "wsl",
                wsl_command.is_some(),
                wsl_command,
                &[],
                Some("wsl.exe was not found. Install or enable Windows Subsystem for Linux first."),
            ),
            shell_entry(
                "bash",
                false,
                None,
                &[],
                Some("Use Git Bash or WSL for Linux-style shells on Windows."),
            ),
        ];
    }

    let bash_command = find_command_on_path(&["bash"]);
    let powershell_command = find_command_on_path(&["pwsh", "pwsh.exe"]);

    vec![
        shell_entry(
            "powershell",
            powershell_command.is_some(),
            powershell_command,
            &["-NoLogo", "-NoProfile"],
            Some("PowerShell Core (pwsh) was not found on PATH."),
        ),
        shell_entry(
            "command-prompt",
            false,
            None,
            &[],
            Some("Command Prompt is only available on Windows hosts."),
        ),
        shell_entry(
            "git-bash",
            false,
            None,
            &[],
            Some("Git Bash is only supported on Windows hosts."),
        ),
        shell_entry(
            "wsl",
            false,
            None,
            &[],
            Some("WSL is only available on Windows hosts."),
        ),
        shell_entry(
            "bash",
            bash_command.is_some(),
            bash_command,
            &["--login", "-i"],
            Some("bash was not found on PATH."),
        ),
    ]
}

#[tauri::command]
pub fn terminal_shell_catalog() -> Vec<TerminalShellCatalogEntry> {
    build_terminal_shell_catalog()
}
