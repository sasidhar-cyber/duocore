import React, { useState } from 'react';

function ChoiceLab({ prompt, options, correct, onComplete }) {
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-200">{prompt}</p>
      <div className="grid gap-2">
        {options.map((opt, i) => (
          <button
            key={opt}
            disabled={done}
            onClick={() => {
              setPicked(i);
              setDone(true);
              if (i === correct && onComplete) onComplete();
            }}
            className={`text-left px-3 py-2 rounded-xl border text-xs ${
              done && i === correct
                ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                : done && i === picked
                ? 'border-red-500 bg-red-950/40 text-red-200'
                : 'border-slate-800 bg-slate-950 text-slate-300'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function MatchLab({ pairs, onComplete }) {
  const [left, setLeft] = useState(null);
  const [matched, setMatched] = useState({});
  const rights = pairs.map((p) => p.right);

  function pickRight(r) {
    if (left == null) return;
    const ok = pairs[left].right === r;
    if (ok) {
      const next = { ...matched, [left]: r };
      setMatched(next);
      if (Object.keys(next).length === pairs.length && onComplete) onComplete();
    }
    setLeft(null);
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        {pairs.map((p, i) => (
          <button
            key={p.left}
            onClick={() => setLeft(i)}
            className={`w-full px-3 py-2 rounded-xl border text-xs ${
              matched[i] ? 'border-emerald-500 text-emerald-200' : left === i ? 'border-pink-500' : 'border-slate-800 text-slate-300'
            }`}
          >
            {p.left}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {rights.map((r) => (
          <button
            key={r}
            onClick={() => pickRight(r)}
            className="w-full px-3 py-2 rounded-xl border border-slate-800 text-xs text-slate-300"
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CyberLab({ levelNum, onComplete }) {
  switch (levelNum) {
    case 1:
      return (
        <ChoiceLab
          prompt="Classify: a customer database with SSN values is reachable on the public internet with no encryption."
          options={['Asset', 'Threat', 'Vulnerability', 'Control']}
          correct={2}
          onComplete={onComplete}
        />
      );
    case 2:
      return (
        <ChoiceLab
          prompt="An insider edits a payroll spreadsheet to hide an error. Which CIA pillar is broken?"
          options={['Confidentiality', 'Integrity', 'Availability', 'Authentication']}
          correct={1}
          onComplete={onComplete}
        />
      );
    case 3:
      return (
        <ChoiceLab
          prompt="A logged-in intern can open the CEO salary page. What failed?"
          options={['Authentication', 'Authorization / RBAC', 'Encryption', 'DNS']}
          correct={1}
          onComplete={onComplete}
        />
      );
    case 4:
      return (
        <ChoiceLab
          prompt="In 192.168.1.0/24, which address is the broadcast address?"
          options={['192.168.1.0', '192.168.1.1', '192.168.1.255', '192.168.1.254']}
          correct={2}
          onComplete={onComplete}
        />
      );
    case 5:
      return (
        <MatchLab
          pairs={[
            { left: 'SSH', right: 'TCP/22' },
            { left: 'HTTPS', right: 'TCP/443' },
            { left: 'DNS', right: 'UDP/53' },
            { left: 'HTTP', right: 'TCP/80' }
          ]}
          onComplete={onComplete}
        />
      );
    case 6:
      return (
        <ChoiceLab
          prompt="A router forwarding IPv4 packets operates primarily at which OSI layer?"
          options={['Layer 2', 'Layer 3', 'Layer 4', 'Layer 7']}
          correct={1}
          onComplete={onComplete}
        />
      );
    case 7:
      return (
        <ChoiceLab
          prompt="After a cache miss, which server type typically answers with the final A record?"
          options={['Root', 'TLD', 'Authoritative nameserver', 'DHCP']}
          correct={2}
          onComplete={onComplete}
        />
      );
    case 8:
      return (
        <ChoiceLab
          prompt="Which path is the student home directory in a typical Linux lab?"
          options={['/root', '/home/student', '/etc', '/var']}
          correct={1}
          onComplete={onComplete}
        />
      );
    case 9:
      return (
        <ChoiceLab
          prompt="Which mode is appropriate for a private SSH key?"
          options={['chmod 777', 'chmod 755', 'chmod 600', 'chmod 000']}
          correct={2}
          onComplete={onComplete}
        />
      );
    case 10:
      return (
        <ChoiceLab
          prompt="Which signal cannot be caught and is used as a last-resort kill?"
          options={['SIGTERM', 'SIGHUP', 'SIGKILL', 'SIGINT']}
          correct={2}
          onComplete={onComplete}
        />
      );
    case 11:
      return (
        <ChoiceLab
          prompt="Which technique is one-way and used for password storage?"
          options={['AES encryption', 'Base64 encoding', 'Hashing', 'URL encoding']}
          correct={2}
          onComplete={onComplete}
        />
      );
    case 12:
      return (
        <ChoiceLab
          prompt="AES is an example of:"
          options={['Asymmetric crypto', 'Symmetric crypto', 'Hashing', 'Encoding']}
          correct={1}
          onComplete={onComplete}
        />
      );
    case 13:
      return (
        <ChoiceLab
          prompt="Which key is shared publicly in RSA-style systems?"
          options={['Private key', 'Public key', 'Session cookie', 'Salt']}
          correct={1}
          onComplete={onComplete}
        />
      );
    case 14:
      return (
        <ChoiceLab
          prompt="A tiny change in input producing a totally different digest is called:"
          options={['Padding', 'Avalanche effect', 'Salting', 'Encoding']}
          correct={1}
          onComplete={onComplete}
        />
      );
    case 15:
      return (
        <ChoiceLab
          prompt="Why add a unique salt before hashing a password?"
          options={['To encrypt reversibly', 'To defeat rainbow tables', 'To speed up bcrypt', 'To replace HTTPS']}
          correct={1}
          onComplete={onComplete}
        />
      );
    case 16:
      return (
        <ChoiceLab
          prompt="Which HTTP method is designed to retrieve a resource without a body?"
          options={['POST', 'PUT', 'GET', 'PATCH']}
          correct={2}
          onComplete={onComplete}
        />
      );
    case 17:
      return (
        <ChoiceLab
          prompt="A JWT is typically stored client-side and verified using:"
          options={['A server session table only', 'A cryptographic signature', 'DNSSEC', 'ARP']}
          correct={1}
          onComplete={onComplete}
        />
      );
    case 18:
      return (
        <ChoiceLab
          prompt="The correct primary defense against SQL injection is:"
          options={['Blacklisting apostrophes', 'Parameterized queries', 'Hiding the database name', 'Using HTTP instead of HTTPS']}
          correct={1}
          onComplete={onComplete}
        />
      );
    case 19:
      return (
        <ChoiceLab
          prompt="Which cookie flag stops JavaScript from reading the session cookie?"
          options={['Secure', 'HttpOnly', 'Domain', 'Max-Age']}
          correct={1}
          onComplete={onComplete}
        />
      );
    case 20:
      return (
        <ChoiceLab
          prompt="SameSite=Strict cookies mainly help against:"
          options={['SQL injection', 'CSRF', 'SSH brute force', 'Disk encryption failures']}
          correct={1}
          onComplete={onComplete}
        />
      );
    case 21:
      return (
        <ChoiceLab
          prompt="Ransomware that encrypts files for payment is best classified as:"
          options={['Adware', 'Malware', 'A firewall', 'A hash']}
          correct={1}
          onComplete={onComplete}
        />
      );
    case 22:
      return (
        <ChoiceLab
          prompt="A fake login page emailed as “reset your vault now” is:"
          options={['A packet filter', 'Phishing', 'A hash collision', 'A DMZ']}
          correct={1}
          onComplete={onComplete}
        />
      );
    case 23:
      return (
        <ChoiceLab
          prompt="A default-deny firewall should:"
          options={['Allow all then block a few IPs', 'Deny by default and allow only required ports', 'Disable logging', 'Forward all 445/TCP']}
          correct={1}
          onComplete={onComplete}
        />
      );
    case 24:
      return (
        <ChoiceLab
          prompt="Placing public web servers in a DMZ is an example of:"
          options={['Network segmentation', 'Salting', 'Encoding', 'XSS']}
          correct={0}
          onComplete={onComplete}
        />
      );
    case 25:
      return (
        <ChoiceLab
          prompt="Which hardening step is safest for SSH?"
          options={['PermitRootLogin yes', 'PasswordAuthentication yes for internet', 'Disable root login and prefer keys', 'chmod 777 /etc/ssh']}
          correct={2}
          onComplete={onComplete}
        />
      );
    case 26:
      return (
        <ChoiceLab
          prompt="Which log is the first place to hunt failed SSH passwords on Linux?"
          options={['/var/log/auth.log', '/etc/hosts', '/home/student/notes.txt', '/proc/cpuinfo']}
          correct={0}
          onComplete={onComplete}
        />
      );
    case 27:
      return (
        <ChoiceLab
          prompt="SIEM correlation means:"
          options={['Deleting all alerts', 'Linking related events across sources', 'Encrypting disks', 'Changing DNS TTL']}
          correct={1}
          onComplete={onComplete}
        />
      );
    case 28:
      return (
        <ChoiceLab
          prompt="First IR priority after confirming an incident is usually:"
          options={['Write a press release', 'Contain the blast radius', 'Wipe all backups', 'Disable MFA']}
          correct={1}
          onComplete={onComplete}
        />
      );
    case 29:
      return (
        <ChoiceLab
          prompt="Preserving original evidence while analyzing a copy supports:"
          options={['Chain of custody', 'XSS', 'NAT', 'Salting']}
          correct={0}
          onComplete={onComplete}
        />
      );
    case 30:
      return (
        <ChoiceLab
          prompt="Capstone: an alert shows SQLi probes, failed SSH, then a new admin JWT. Best next simulated action?"
          options={['Ignore because labs are fake', 'Contain accounts, rotate credentials, review logs', 'Disable all logging', 'Open every firewall port']}
          correct={1}
          onComplete={onComplete}
        />
      );
    default:
      return <p className="text-xs text-slate-400">No simulator for this level.</p>;
  }
}
