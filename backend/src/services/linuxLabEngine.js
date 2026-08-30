// Safe in-memory simulated virtual POSIX shell environment

const VIRTUAL_FS = {
  '/home/student': ['projects', 'notes.txt', '.bashrc', '.ssh'],
  '/home/student/projects': ['duocore.js', 'auth_service.py', 'firewall_rules.sh'],
  '/home/student/.ssh': ['id_rsa', 'id_rsa.pub', 'authorized_keys'],
  '/var/log': ['auth.log', 'syslog', 'nginx.log', 'ufw.log'],
  '/etc': ['passwd', 'shadow', 'hosts', 'os-release', 'ssh'],
  '/etc/ssh': ['sshd_config']
};

const VIRTUAL_FILES = {
  '/etc/os-release': `NAME="Ubuntu"
VERSION="24.04 LTS (Noble Numbat)"
ID=ubuntu
ID_LIKE=debian
PRETTY_NAME="Ubuntu 24.04 LTS"
VERSION_ID="24.04"
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"`,

  '/etc/passwd': `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
student:x:1000:1000:DUOCORE Student,,,:/home/student:/bin/bash
alex:x:1001:1001:Alex Cyber Specialist:/home/alex:/bin/bash
sam:x:1002:1002:Sam Linux Ninja:/home/sam:/bin/bash
sshd:x:105:65534::/run/sshd:/usr/sbin/nologin`,

  '/var/log/auth.log': `Aug 30 08:14:02 duocore-server sshd[14201]: Server listening on 0.0.0.0 port 22.
Aug 30 08:14:05 duocore-server sshd[14205]: Failed password for invalid user root from 192.168.1.100 port 49152 ssh2
Aug 30 08:14:08 duocore-server sshd[14207]: Failed password for invalid user admin from 192.168.1.100 port 49154 ssh2
Aug 30 08:14:12 duocore-server sshd[14210]: Failed password for student from 192.168.1.100 port 49158 ssh2
Aug 30 08:14:18 duocore-server sshd[14215]: Accepted publickey for student from 192.168.1.50 port 52310 ssh2: RSA SHA256:x9#K2
Aug 30 08:14:19 duocore-server systemd-logind[900]: New session 14 of user student.`,

  '/home/student/notes.txt': `DUOCORE Linux Study Notes:
1. Always audit SUID root binaries: find / -perm -4000
2. Restrict SSH keys: chmod 600 ~/.ssh/id_rsa
3. Default Deny on firewalls: sudo ufw default deny incoming`,

  '/etc/ssh/sshd_config': `Port 22
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300`
};

function executeVirtualCommand(rawCommand, currentCwd = '~') {
  const cmd = rawCommand.trim();
  if (!cmd) return { output: '', exitCode: 0, cwd: currentCwd };

  const parts = cmd.split(/\s+/);
  const base = parts[0];
  let cwd = currentCwd === '~' ? '/home/student' : currentCwd;

  // 1. pwd
  if (base === 'pwd') {
    return { output: cwd, exitCode: 0, cwd: currentCwd };
  }

  // 2. whoami / id
  if (base === 'whoami') {
    return { output: 'student', exitCode: 0, cwd: currentCwd };
  }
  if (base === 'id') {
    return { output: 'uid=1000(student) gid=1000(student) groups=1000(student),27(sudo),100(users)', exitCode: 0, cwd: currentCwd };
  }

  // 3. ls
  if (base === 'ls') {
    const isLa = cmd.includes('-la') || cmd.includes('-l') || cmd.includes('-a');
    if (isLa) {
      return {
        output: `total 32
drwxr-xr-x 4 student student 4096 Aug 30 08:14 .
drwxr-xr-x 3 root    root    4096 Aug 30 08:00 ..
-rw-r--r-- 1 student student  220 Aug 30 08:00 .bashrc
drwx------ 2 student student 4096 Aug 30 08:14 .ssh
drwxr-xr-x 2 student student 4096 Aug 30 08:10 projects
-rw-r--r-- 1 student student  256 Aug 30 08:12 notes.txt`,
        exitCode: 0,
        cwd: currentCwd
      };
    }
    const files = VIRTUAL_FS[cwd] || ['projects', 'notes.txt'];
    return { output: files.join('  '), exitCode: 0, cwd: currentCwd };
  }

  // 4. cd
  if (base === 'cd') {
    const target = parts[1] || '~';
    if (target === '~' || target === '/home/student') return { output: '', exitCode: 0, cwd: '~' };
    if (target === '..' && cwd !== '/') {
      const parent = cwd.substring(0, cwd.lastIndexOf('/')) || '/';
      return { output: '', exitCode: 0, cwd: parent };
    }
    if (target === '/var/log' || target === 'var/log') return { output: '', exitCode: 0, cwd: '/var/log' };
    if (target === '/etc' || target === 'etc') return { output: '', exitCode: 0, cwd: '/etc' };
    if (target === 'projects') return { output: '', exitCode: 0, cwd: '/home/student/projects' };
    return { output: '', exitCode: 0, cwd: target };
  }

  // 5. cat, head, tail
  if (base === 'cat' || base === 'head' || base === 'tail') {
    const filePath = parts[parts.length - 1];
    const fullPath = filePath.startsWith('/') ? filePath : `${cwd}/${filePath}`.replace('~', '/home/student');
    const content = VIRTUAL_FILES[fullPath] || VIRTUAL_FILES[filePath];

    if (content) {
      if (base === 'head') {
        return { output: content.split('\n').slice(0, 5).join('\n'), exitCode: 0, cwd: currentCwd };
      }
      if (base === 'tail') {
        return { output: content.split('\n').slice(-5).join('\n'), exitCode: 0, cwd: currentCwd };
      }
      return { output: content, exitCode: 0, cwd: currentCwd };
    }
    return { output: `cat: ${filePath}: No such file or directory`, exitCode: 1, cwd: currentCwd };
  }

  // 6. grep
  if (base === 'grep') {
    if (cmd.includes('Failed password') || cmd.includes('failed') || cmd.includes('auth.log')) {
      return {
        output: `Aug 30 08:14:05 duocore-server sshd[14205]: Failed password for invalid user root from 192.168.1.100 port 49152 ssh2
Aug 30 08:14:08 duocore-server sshd[14207]: Failed password for invalid user admin from 192.168.1.100 port 49154 ssh2
Aug 30 08:14:12 duocore-server sshd[14210]: Failed password for student from 192.168.1.100 port 49158 ssh2`,
        exitCode: 0,
        cwd: currentCwd
      };
    }
    if (cmd.includes('passwd') && cmd.includes('nologin')) {
      return {
        output: `root:x:0:0:root:/root:/bin/bash
student:x:1000:1000:DUOCORE Student,,,:/home/student:/bin/bash
alex:x:1001:1001:Alex Cyber Specialist:/home/alex:/bin/bash
sam:x:1002:1002:Sam Linux Ninja:/home/sam:/bin/bash`,
        exitCode: 0,
        cwd: currentCwd
      };
    }
    return { output: `grep: matches found in virtual stream`, exitCode: 0, cwd: currentCwd };
  }

  // 7. chmod / chown
  if (base === 'chmod') {
    const octal = parts[1] || '755';
    const target = parts[2] || 'file';
    return { output: `mode of '${target}' changed from 0644 to 0${octal}`, exitCode: 0, cwd: currentCwd };
  }
  if (base === 'chown') {
    return { output: `changed ownership of '${parts[2] || 'file'}' to ${parts[1] || 'student'}`, exitCode: 0, cwd: currentCwd };
  }

  // 8. find
  if (base === 'find') {
    if (cmd.includes('-perm -4000') || cmd.includes('4000')) {
      return {
        output: `/usr/bin/passwd
/usr/bin/sudo
/usr/bin/chsh
/usr/bin/newgrp
/bin/su
/bin/mount
/bin/umount`,
        exitCode: 0,
        cwd: currentCwd
      };
    }
    return { output: `/home/student/projects/duocore.js\n/home/student/notes.txt`, exitCode: 0, cwd: currentCwd };
  }

  // 9. ps aux
  if (base === 'ps') {
    return {
      output: `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.1 169344 13420 ?        Ss   08:00   0:01 /sbin/init
root       412  0.0  0.2  72100 18200 ?        Ss   08:00   0:00 /usr/sbin/sshd -D
student   1204  0.1  1.2 890124 95400 pts/0    Ss+  08:14   0:02 /bin/bash
student   1405  0.4  3.5 125430 189200 pts/0   Sl+  08:15   0:10 node /home/duocore/server.js
root      1920  0.0  0.1  14200  4200 ?        S    08:16   0:00 /usr/sbin/cron -f`,
      exitCode: 0,
      cwd: currentCwd
    };
  }

  // 10. ss -tulpn
  if (base === 'ss') {
    return {
      output: `Netid State  Recv-Q Send-Q  Local Address:Port   Peer Address:Port Process
tcp   LISTEN 0      128     0.0.0.0:22           0.0.0.0:*     users:(("sshd",pid=412,fd=3))
tcp   LISTEN 0      511     0.0.0.0:5000         0.0.0.0:*     users:(("node",pid=1405,fd=19))
tcp   LISTEN 0      128     127.0.0.1:5432       0.0.0.0:*     users:(("postgres",pid=502,fd=6))
udp   UNCONN 0      0       127.0.0.53%lo:53     0.0.0.0:*     users:(("systemd-resolve",pid=380,fd=13))`,
      exitCode: 0,
      cwd: currentCwd
    };
  }

  // 11. curl
  if (base === 'curl') {
    return {
      output: `{"status":"healthy","service":"DUOCORE Virtual Lab","uptimeSeconds":3600,"version":"2.6.0"}`,
      exitCode: 0,
      cwd: currentCwd
    };
  }

  // 12. df -h / du -sh
  if (base === 'df') {
    return {
      output: `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G   14G   34G  30% /
tmpfs           2.0G     0  2.0G   0% /dev/shm
/dev/sda2       100G   22G   73G  24% /var`,
      exitCode: 0,
      cwd: currentCwd
    };
  }
  if (base === 'du') {
    return { output: `128M    /home/student`, exitCode: 0, cwd: currentCwd };
  }

  // 13. systemctl
  if (base === 'systemctl') {
    return {
      output: `● duocore.service - DUOCORE Platform Background Worker
     Loaded: loaded (/etc/systemd/system/duocore.service; enabled; vendor preset: enabled)
     Active: active (running) since Sat 2026-08-30 08:15:00 UTC; 45min ago
   Main PID: 1405 (node)
      Tasks: 11 (limit: 4915)
     Memory: 189.2M
     CGroup: /system.slice/duocore.service
             └─1405 node /home/duocore/server.js`,
      exitCode: 0,
      cwd: currentCwd
    };
  }

  // 14. kill -9
  if (base === 'kill') {
    return { output: `[Process ${parts[parts.length - 1]} terminated successfully]`, exitCode: 0, cwd: currentCwd };
  }

  // 15. ip / ifconfig
  if (base === 'ip') {
    return {
      output: `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default
    inet 127.0.0.1/8 scope host lo
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default
    inet 192.168.1.5/24 brd 192.168.1.255 scope global eth0
    link/ether 52:54:00:12:34:56 brd ff:ff:ff:ff:ff:ff`,
      exitCode: 0,
      cwd: currentCwd
    };
  }

  // Generic fallback response for other educational commands
  return {
    output: `[Virtual Shell]: Executed '${rawCommand}' successfully (exit code 0).`,
    exitCode: 0,
    cwd: currentCwd
  };
}

module.exports = { executeVirtualCommand };
