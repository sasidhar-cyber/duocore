export const LINUX_ROADMAP_LEVELS = [
  {
    "id": "linux-01",
    "levelNum": 1,
    "title": "Terminal Rookie & Shell Anatomy",
    "badge": "Shell Recruit",
    "objective": "Understand the Linux terminal prompt, current directory location, and who you are.",
    "commands": [
      {
        "cmd": "pwd",
        "purpose": "Print Working Directory",
        "syntax": "pwd",
        "example": "pwd -> /home/student",
        "expected": "/home/student",
        "mistake": "Typing 'pwd /home' (pwd takes no arguments)."
      },
      {
        "cmd": "whoami",
        "purpose": "Print Effective Username",
        "syntax": "whoami",
        "example": "whoami -> student",
        "expected": "student",
        "mistake": "Confusing with 'id' which gives UID/GID."
      }
    ],
    "explanation": "The Linux shell prompt shows [user]@[hostname]:[current directory][$]. The pwd command tells you where you are in the filesystem hierarchy.",
    "guidedTask": "Run 'pwd' to verify your current location, then run 'whoami' to inspect your active user identity.",
    "targetCommands": [
      "pwd",
      "whoami"
    ],
    "hints": [
      "Type 'pwd' and hit Enter.",
      "Next type 'whoami' and hit Enter.",
      "Notice the prompt changes based on your location."
    ],
    "xpReward": 80
  },
  {
    "id": "linux-02",
    "levelNum": 2,
    "title": "File Explorer & Path Traversal",
    "badge": "Pathfinder",
    "objective": "Master listing directory contents, hidden dotfiles, absolute vs relative paths, and navigating with cd.",
    "commands": [
      {
        "cmd": "ls",
        "purpose": "List directory contents",
        "syntax": "ls [options] [path]",
        "example": "ls -la /var/log",
        "expected": "drwxr-xr-x ...",
        "mistake": "Forgetting -a hides dotfiles like .bashrc."
      },
      {
        "cmd": "cd",
        "purpose": "Change Directory",
        "syntax": "cd [path]",
        "example": "cd .. or cd ~",
        "expected": "(changes directory)",
        "mistake": "Typing 'cd folder' when inside a different path."
      }
    ],
    "explanation": "Everything in Linux is a file starting from the root directory /. Relative paths start from where you are; absolute paths start from the root /.",
    "guidedTask": "Run 'ls -la' to see hidden files and permissions, then navigate to '/var/log' using 'cd /var/log'.",
    "targetCommands": [
      "ls -la",
      "cd /var/log"
    ],
    "hints": [
      "Run 'ls -la'.",
      "Type 'cd /var/log' to jump to system log files.",
      "Verify with 'pwd'."
    ],
    "xpReward": 90
  },
  {
    "id": "linux-03",
    "levelNum": 3,
    "title": "Reading & Inspecting Files",
    "badge": "Content Reader",
    "objective": "Inspect file contents without opening a heavy text editor using cat, head, tail, and less.",
    "commands": [
      {
        "cmd": "cat",
        "purpose": "Concatenate and print file",
        "syntax": "cat <file>",
        "example": "cat /etc/os-release",
        "expected": "NAME=\"Ubuntu\" ...",
        "mistake": "Running cat on giant log files freezes terminal."
      },
      {
        "cmd": "tail",
        "purpose": "Output the last part of files",
        "syntax": "tail -n <N> <file>",
        "example": "tail -n 20 /var/log/auth.log",
        "expected": "Last 20 log entries",
        "mistake": "Forgetting -f flag for live streaming logs."
      }
    ],
    "explanation": "Use cat for small configuration files, head -n 5 for header rows, and tail -n 5 for recent security log entries.",
    "guidedTask": "Inspect the OS release file by executing 'cat /etc/os-release', then view the last lines of '/var/log/auth.log' using 'tail -n 5 /var/log/auth.log'.",
    "targetCommands": [
      "cat /etc/os-release",
      "tail -n 5 /var/log/auth.log"
    ],
    "hints": [
      "Type 'cat /etc/os-release'.",
      "Run 'tail -n 5 /var/log/auth.log'.",
      "Look at the structured distribution output."
    ],
    "xpReward": 100
  },
  {
    "id": "linux-04",
    "levelNum": 4,
    "title": "Searching Files & Text (find & grep)",
    "badge": "Log Hunter",
    "objective": "Master practical operations for Searching Files & Text (find & grep).",
    "commands": [
      {
        "cmd": "grep",
        "purpose": "Core command for Searching Files & Text (find & grep)",
        "syntax": "grep \"Failed password\" [options]",
        "example": "grep \"Failed password\"",
        "expected": "Command execution output",
        "mistake": "Incorrect flags or missing path."
      }
    ],
    "explanation": "In-depth Linux system administration tutorial covering Searching Files & Text (find & grep) with real-world server diagnostic examples.",
    "guidedTask": "Execute the target diagnostic command: 'grep \"Failed password\"'",
    "targetCommands": [
      "grep \"Failed password\"",
      "find / -name \"*.log\""
    ],
    "hints": [
      "Run 'grep \"Failed password\"'.",
      "Examine the output fields in the terminal window.",
      "Observe how Linux kernel status changes."
    ],
    "xpReward": 140
  },
  {
    "id": "linux-05",
    "levelNum": 5,
    "title": "Text Processing Pipelines (awk, sed, sort, uniq)",
    "badge": "Data Wrangler",
    "objective": "Master practical operations for Text Processing Pipelines (awk, sed, sort, uniq).",
    "commands": [
      {
        "cmd": "awk",
        "purpose": "Core command for Text Processing Pipelines (awk, sed, sort, uniq)",
        "syntax": "awk -F: '{print $1}' /etc/passwd [options]",
        "example": "awk -F: '{print $1}' /etc/passwd",
        "expected": "Command execution output",
        "mistake": "Incorrect flags or missing path."
      }
    ],
    "explanation": "In-depth Linux system administration tutorial covering Text Processing Pipelines (awk, sed, sort, uniq) with real-world server diagnostic examples.",
    "guidedTask": "Execute the target diagnostic command: 'awk -F: '{print $1}' /etc/passwd'",
    "targetCommands": [
      "awk -F: '{print $1}' /etc/passwd",
      "sort | uniq -c"
    ],
    "hints": [
      "Run 'awk -F: '{print $1}' /etc/passwd'.",
      "Examine the output fields in the terminal window.",
      "Observe how Linux kernel status changes."
    ],
    "xpReward": 150
  },
  {
    "id": "linux-06",
    "levelNum": 6,
    "title": "Linux Permissions & SUID Auditing (chmod, chown)",
    "badge": "Permission Enforcer",
    "objective": "Master practical operations for Linux Permissions & SUID Auditing (chmod, chown).",
    "commands": [
      {
        "cmd": "chmod",
        "purpose": "Core command for Linux Permissions & SUID Auditing (chmod, chown)",
        "syntax": "chmod 755 [options]",
        "example": "chmod 755",
        "expected": "Command execution output",
        "mistake": "Incorrect flags or missing path."
      }
    ],
    "explanation": "In-depth Linux system administration tutorial covering Linux Permissions & SUID Auditing (chmod, chown) with real-world server diagnostic examples.",
    "guidedTask": "Execute the target diagnostic command: 'chmod 755'",
    "targetCommands": [
      "chmod 755",
      "chmod 600",
      "find / -perm -4000"
    ],
    "hints": [
      "Run 'chmod 755'.",
      "Examine the output fields in the terminal window.",
      "Observe how Linux kernel status changes."
    ],
    "xpReward": 160
  },
  {
    "id": "linux-07",
    "levelNum": 7,
    "title": "Users, Groups & Privilege (/etc/passwd, id, sudo)",
    "badge": "User Marshal",
    "objective": "Master practical operations for Users, Groups & Privilege (/etc/passwd, id, sudo).",
    "commands": [
      {
        "cmd": "id",
        "purpose": "Core command for Users, Groups & Privilege (/etc/passwd, id, sudo)",
        "syntax": "id [options]",
        "example": "id",
        "expected": "Command execution output",
        "mistake": "Incorrect flags or missing path."
      }
    ],
    "explanation": "In-depth Linux system administration tutorial covering Users, Groups & Privilege (/etc/passwd, id, sudo) with real-world server diagnostic examples.",
    "guidedTask": "Execute the target diagnostic command: 'id'",
    "targetCommands": [
      "id",
      "cat /etc/passwd"
    ],
    "hints": [
      "Run 'id'.",
      "Examine the output fields in the terminal window.",
      "Observe how Linux kernel status changes."
    ],
    "xpReward": 170
  },
  {
    "id": "linux-08",
    "levelNum": 8,
    "title": "Process Lifecycle & Monitoring (ps, top, kill -9)",
    "badge": "Process Master",
    "objective": "Master practical operations for Process Lifecycle & Monitoring (ps, top, kill -9).",
    "commands": [
      {
        "cmd": "ps",
        "purpose": "Core command for Process Lifecycle & Monitoring (ps, top, kill -9)",
        "syntax": "ps aux [options]",
        "example": "ps aux",
        "expected": "Command execution output",
        "mistake": "Incorrect flags or missing path."
      }
    ],
    "explanation": "In-depth Linux system administration tutorial covering Process Lifecycle & Monitoring (ps, top, kill -9) with real-world server diagnostic examples.",
    "guidedTask": "Execute the target diagnostic command: 'ps aux'",
    "targetCommands": [
      "ps aux",
      "kill -9"
    ],
    "hints": [
      "Run 'ps aux'.",
      "Examine the output fields in the terminal window.",
      "Observe how Linux kernel status changes."
    ],
    "xpReward": 180
  },
  {
    "id": "linux-09",
    "levelNum": 9,
    "title": "Systemd Services & Logs (systemctl, journalctl)",
    "badge": "Service Manager",
    "objective": "Master practical operations for Systemd Services & Logs (systemctl, journalctl).",
    "commands": [
      {
        "cmd": "systemctl",
        "purpose": "Core command for Systemd Services & Logs (systemctl, journalctl)",
        "syntax": "systemctl status [options]",
        "example": "systemctl status",
        "expected": "Command execution output",
        "mistake": "Incorrect flags or missing path."
      }
    ],
    "explanation": "In-depth Linux system administration tutorial covering Systemd Services & Logs (systemctl, journalctl) with real-world server diagnostic examples.",
    "guidedTask": "Execute the target diagnostic command: 'systemctl status'",
    "targetCommands": [
      "systemctl status",
      "journalctl -u"
    ],
    "hints": [
      "Run 'systemctl status'.",
      "Examine the output fields in the terminal window.",
      "Observe how Linux kernel status changes."
    ],
    "xpReward": 190
  },
  {
    "id": "linux-10",
    "levelNum": 10,
    "title": "Networking Diagnostics (ip a, ss -tulpn, curl)",
    "badge": "Network Scout",
    "objective": "Master practical operations for Networking Diagnostics (ip a, ss -tulpn, curl).",
    "commands": [
      {
        "cmd": "ss",
        "purpose": "Core command for Networking Diagnostics (ip a, ss -tulpn, curl)",
        "syntax": "ss -tulpn [options]",
        "example": "ss -tulpn",
        "expected": "Command execution output",
        "mistake": "Incorrect flags or missing path."
      }
    ],
    "explanation": "In-depth Linux system administration tutorial covering Networking Diagnostics (ip a, ss -tulpn, curl) with real-world server diagnostic examples.",
    "guidedTask": "Execute the target diagnostic command: 'ss -tulpn'",
    "targetCommands": [
      "ss -tulpn",
      "curl http://localhost:5000/api/health"
    ],
    "hints": [
      "Run 'ss -tulpn'.",
      "Examine the output fields in the terminal window.",
      "Observe how Linux kernel status changes."
    ],
    "xpReward": 200
  },
  {
    "id": "linux-11",
    "levelNum": 11,
    "title": "Archives & Backup Compression (tar, gzip)",
    "badge": "Archive Master",
    "objective": "Master practical operations for Archives & Backup Compression (tar, gzip).",
    "commands": [
      {
        "cmd": "tar",
        "purpose": "Core command for Archives & Backup Compression (tar, gzip)",
        "syntax": "tar -czvf [options]",
        "example": "tar -czvf",
        "expected": "Command execution output",
        "mistake": "Incorrect flags or missing path."
      }
    ],
    "explanation": "In-depth Linux system administration tutorial covering Archives & Backup Compression (tar, gzip) with real-world server diagnostic examples.",
    "guidedTask": "Execute the target diagnostic command: 'tar -czvf'",
    "targetCommands": [
      "tar -czvf",
      "tar -xzvf"
    ],
    "hints": [
      "Run 'tar -czvf'.",
      "Examine the output fields in the terminal window.",
      "Observe how Linux kernel status changes."
    ],
    "xpReward": 210
  },
  {
    "id": "linux-12",
    "levelNum": 12,
    "title": "Shell Scripting Automation (Bash, loops, conditionals)",
    "badge": "Bash Automator",
    "objective": "Master practical operations for Shell Scripting Automation (Bash, loops, conditionals).",
    "commands": [
      {
        "cmd": "bash",
        "purpose": "Core command for Shell Scripting Automation (Bash, loops, conditionals)",
        "syntax": "bash script.sh [options]",
        "example": "bash script.sh",
        "expected": "Command execution output",
        "mistake": "Incorrect flags or missing path."
      }
    ],
    "explanation": "In-depth Linux system administration tutorial covering Shell Scripting Automation (Bash, loops, conditionals) with real-world server diagnostic examples.",
    "guidedTask": "Execute the target diagnostic command: 'bash script.sh'",
    "targetCommands": [
      "bash script.sh",
      "chmod +x"
    ],
    "hints": [
      "Run 'bash script.sh'.",
      "Examine the output fields in the terminal window.",
      "Observe how Linux kernel status changes."
    ],
    "xpReward": 220
  },
  {
    "id": "linux-13",
    "levelNum": 13,
    "title": "Environment Variables & Configuration (export, PATH)",
    "badge": "Env Architect",
    "objective": "Master practical operations for Environment Variables & Configuration (export, PATH).",
    "commands": [
      {
        "cmd": "export",
        "purpose": "Core command for Environment Variables & Configuration (export, PATH)",
        "syntax": "export [options]",
        "example": "export",
        "expected": "Command execution output",
        "mistake": "Incorrect flags or missing path."
      }
    ],
    "explanation": "In-depth Linux system administration tutorial covering Environment Variables & Configuration (export, PATH) with real-world server diagnostic examples.",
    "guidedTask": "Execute the target diagnostic command: 'export'",
    "targetCommands": [
      "export",
      "echo $PATH"
    ],
    "hints": [
      "Run 'export'.",
      "Examine the output fields in the terminal window.",
      "Observe how Linux kernel status changes."
    ],
    "xpReward": 230
  },
  {
    "id": "linux-14",
    "levelNum": 14,
    "title": "Security Logs & Forensic Auditing (auth.log, syslog)",
    "badge": "Audit Detective",
    "objective": "Master practical operations for Security Logs & Forensic Auditing (auth.log, syslog).",
    "commands": [
      {
        "cmd": "tail",
        "purpose": "Core command for Security Logs & Forensic Auditing (auth.log, syslog)",
        "syntax": "tail -n 20 /var/log/auth.log [options]",
        "example": "tail -n 20 /var/log/auth.log",
        "expected": "Command execution output",
        "mistake": "Incorrect flags or missing path."
      }
    ],
    "explanation": "In-depth Linux system administration tutorial covering Security Logs & Forensic Auditing (auth.log, syslog) with real-world server diagnostic examples.",
    "guidedTask": "Execute the target diagnostic command: 'tail -n 20 /var/log/auth.log'",
    "targetCommands": [
      "tail -n 20 /var/log/auth.log"
    ],
    "hints": [
      "Run 'tail -n 20 /var/log/auth.log'.",
      "Examine the output fields in the terminal window.",
      "Observe how Linux kernel status changes."
    ],
    "xpReward": 240
  },
  {
    "id": "linux-15",
    "levelNum": 15,
    "title": "Linux Server Hardening (SSH config, UFW, Fail2ban)",
    "badge": "Server Fortifier",
    "objective": "Master practical operations for Linux Server Hardening (SSH config, UFW, Fail2ban).",
    "commands": [
      {
        "cmd": "sudo",
        "purpose": "Core command for Linux Server Hardening (SSH config, UFW, Fail2ban)",
        "syntax": "sudo ufw status [options]",
        "example": "sudo ufw status",
        "expected": "Command execution output",
        "mistake": "Incorrect flags or missing path."
      }
    ],
    "explanation": "In-depth Linux system administration tutorial covering Linux Server Hardening (SSH config, UFW, Fail2ban) with real-world server diagnostic examples.",
    "guidedTask": "Execute the target diagnostic command: 'sudo ufw status'",
    "targetCommands": [
      "sudo ufw status",
      "cat /etc/ssh/sshd_config"
    ],
    "hints": [
      "Run 'sudo ufw status'.",
      "Examine the output fields in the terminal window.",
      "Observe how Linux kernel status changes."
    ],
    "xpReward": 250
  },
  {
    "id": "linux-16",
    "levelNum": 16,
    "title": "Linux Final Mission: Live Incident Containment",
    "badge": "Linux Grandmaster",
    "objective": "Master practical operations for Linux Final Mission: Live Incident Containment.",
    "commands": [
      {
        "cmd": "ss",
        "purpose": "Core command for Linux Final Mission: Live Incident Containment",
        "syntax": "ss -tulpn [options]",
        "example": "ss -tulpn",
        "expected": "Command execution output",
        "mistake": "Incorrect flags or missing path."
      }
    ],
    "explanation": "In-depth Linux system administration tutorial covering Linux Final Mission: Live Incident Containment with real-world server diagnostic examples.",
    "guidedTask": "Execute the target diagnostic command: 'ss -tulpn'",
    "targetCommands": [
      "ss -tulpn",
      "kill -9",
      "chmod 600"
    ],
    "hints": [
      "Run 'ss -tulpn'.",
      "Examine the output fields in the terminal window.",
      "Observe how Linux kernel status changes."
    ],
    "xpReward": 260
  }
];
