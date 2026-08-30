export const CYBER_ROADMAP_LEVELS = [
  {
    "id": "cyber-01",
    "levelNum": 1,
    "stageGroup": "Foundations",
    "title": "Cyber World & Threat Landscape",
    "badge": "Threat Scout",
    "objective": "Understand the modern cyber threat landscape, the fundamental equation of risk, and how to classify assets, threats, and vulnerabilities.",
    "explanation": "In cybersecurity, defense begins by understanding what you are protecting (Assets), who wants to harm it (Threats), and the flaws in your armor (Vulnerabilities). Risk is calculated as: Risk = Likelihood (Threat) \u00d7 Impact (Vulnerability).",
    "explainSimply": "Imagine your house has expensive jewelry (Asset). A thief is walking outside in your neighborhood (Threat). You left your front window wide open (Vulnerability). Risk is how likely the thief will find your open window and take the jewelry.",
    "whyItMatters": "Without identifying your critical assets and vulnerabilities, you will waste security budgets defending low-value targets while leaving critical databases exposed.",
    "diagram": "[ ASSET: Customer DB ] --> (Exposed by) [ VULNERABILITY: Missing Patch ] --> (Exploited by) [ THREAT: Ransomware ] --> [ BUSINESS RISK ]",
    "connectedConcepts": [
      "Asset Management",
      "Threat Modeling",
      "Risk Scoring",
      "Attack Surface"
    ],
    "guidedChallenge": "Classify the scenario: 'A database contains unencrypted social security numbers on an open internet port.' Identify the vulnerability.",
    "hints": [
      "Think about which part represents a correctable technical weakness.",
      "The database is the asset, the attacker is the threat, and the open port is the flaw.",
      "The unencrypted configuration and open internet port is the Vulnerability."
    ],
    "quizQuestion": "Which security equation accurately models risk in cyber defense?",
    "quizOptions": [
      "Risk = Asset + Threat",
      "Risk = Likelihood (Threat) \u00d7 Impact (Vulnerability)",
      "Risk = Password Length \u00d7 Speed",
      "Risk = Number of Firewalls"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Risk is quantitatively evaluated as the likelihood of a threat occurring multiplied by the business impact of the exploited vulnerability.",
    "xpReward": 100
  },
  {
    "id": "cyber-02",
    "levelNum": 2,
    "stageGroup": "Foundations",
    "title": "The CIA Triad",
    "badge": "Triad Sentinel",
    "objective": "Master the three core pillars of security: Confidentiality, Integrity, and Availability.",
    "explanation": "The CIA Triad is the universal security benchmark. Confidentiality prevents unauthorized reading (encryption). Integrity prevents unauthorized tampering (hashes). Availability ensures systems remain reachable (uptime).",
    "explainSimply": "1. Confidentiality: Only you can read your diary. 2. Integrity: No one secretly tore out pages or edited words. 3. Availability: Your diary is on your desk when you need it.",
    "whyItMatters": "Every single security policy, firewall rule, and cryptographic standard exists to protect one or more pillars of the CIA Triad.",
    "diagram": "CONFIDENTIALITY (AES) <---> INTEGRITY (SHA-256) <---> AVAILABILITY (DDoS Defense)",
    "connectedConcepts": [
      "AES Encryption",
      "SHA-256 Hashes",
      "DDoS Mitigation",
      "Zero Trust"
    ],
    "guidedChallenge": "An employee modifies a financial spreadsheet to hide an accounting error. Which pillar of the CIA Triad has been compromised?",
    "hints": [
      "Was data made public, was it altered falsely, or was the service offline?",
      "The action involved altering and modifying financial truth.",
      "Integrity is violated when data is modified or tampered with by unauthorized parties."
    ],
    "quizQuestion": "When a malicious user modifies an audit log file to erase their intrusion tracks, which CIA principle is violated?",
    "quizOptions": [
      "Confidentiality",
      "Integrity",
      "Availability",
      "Speed"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Tampering with log entries alters historical records, directly destroying the Integrity of the forensic evidence.",
    "xpReward": 110
  },
  {
    "id": "cyber-03",
    "levelNum": 3,
    "stageGroup": "Foundations",
    "title": "Authentication & Authorization",
    "badge": "Access Enforcer",
    "objective": "Distinguish between verifying who you are (Authentication - AuthN) vs what you are permitted to do (Authorization - AuthZ).",
    "explanation": "Authentication (AuthN) proves your identity (passwords, MFA). Authorization (AuthZ) verifies your access privileges (Role-Based Access Control RBAC).",
    "explainSimply": "Your passport proves you are John (Authentication). But having a passport does not allow you into the cockpit of the airplane (Authorization).",
    "whyItMatters": "Confusing AuthN with AuthZ causes IDOR vulnerabilities, letting normal logged-in users view admin dashboards.",
    "diagram": "[ User: Alex ] --(Password + MFA)--> [ AuthN: Identity Verified ] --> [ Role: Student ] --> [ Read: ALLOW | Delete: DENY ]",
    "connectedConcepts": [
      "MFA / 2FA",
      "RBAC / ABAC",
      "OAuth 2.0",
      "IDOR Prevention"
    ],
    "guidedChallenge": "A logged-in normal user changes their URL parameter from /user/10 to /user/1 and views another user's private details. Is this an AuthN or AuthZ failure?",
    "hints": [
      "The user already successfully logged into the website.",
      "The server failed to verify whether this user has permission to access record #1.",
      "This is an Authorization (AuthZ) failure known as an Insecure Direct Object Reference (IDOR)."
    ],
    "quizQuestion": "Which of the following is an example of an Authorization failure rather than an Authentication failure?",
    "quizOptions": [
      "User enters an incorrect password three times",
      "User enters an expired MFA code",
      "A normal authenticated employee accesses the CEO's confidential salary spreadsheet",
      "User forgets their username"
    ],
    "correctOptionIndex": 2,
    "quizExplanation": "The employee is already authenticated, but the system failed to enforce authorization boundaries regarding what they are permitted to see.",
    "xpReward": 120
  },
  {
    "id": "cyber-04",
    "levelNum": 4,
    "stageGroup": "Networking",
    "title": "Networking Basics & Packets",
    "badge": "Subnet Scout",
    "objective": "Understand IP addresses, IPv4 subnets, broadcast, and packet headers.",
    "explanation": "In-depth cybersecurity guide for Networking Basics & Packets. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Networking Basics & Packets teaches you how to keep systems secure using ip a, tcpdump.",
    "whyItMatters": "Mastering Networking Basics & Packets is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: NETWORKING BASICS & PACKETS ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Networking Basics & Packets",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Networking Basics & Packets.",
    "hints": [
      "Review Networking Basics & Packets mechanics.",
      "Look at the diagram flow above.",
      "Consider how ip a, tcpdump protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Networking Basics & Packets?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 130
  },
  {
    "id": "cyber-05",
    "levelNum": 5,
    "stageGroup": "Networking",
    "title": "Ports & Protocols",
    "badge": "Port Master",
    "objective": "Common security ports: 22 (SSH), 53 (DNS), 80 (HTTP), 443 (HTTPS), 3306 (MySQL).",
    "explanation": "In-depth cybersecurity guide for Ports & Protocols. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Ports & Protocols teaches you how to keep systems secure using ss -tulpn.",
    "whyItMatters": "Mastering Ports & Protocols is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: PORTS & PROTOCOLS ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Ports & Protocols",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Ports & Protocols.",
    "hints": [
      "Review Ports & Protocols mechanics.",
      "Look at the diagram flow above.",
      "Consider how ss -tulpn protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Ports & Protocols?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 140
  },
  {
    "id": "cyber-06",
    "levelNum": 6,
    "stageGroup": "Networking",
    "title": "OSI & TCP/IP Models",
    "badge": "Packet Tracer",
    "objective": "The 7 OSI layers and 3-way TCP handshake (SYN -> SYN-ACK -> ACK).",
    "explanation": "In-depth cybersecurity guide for OSI & TCP/IP Models. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, OSI & TCP/IP Models teaches you how to keep systems secure using wireshark.",
    "whyItMatters": "Mastering OSI & TCP/IP Models is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: OSI & TCP/IP MODELS ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "OSI & TCP/IP Models",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify OSI & TCP/IP Models.",
    "hints": [
      "Review OSI & TCP/IP Models mechanics.",
      "Look at the diagram flow above.",
      "Consider how wireshark protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind OSI & TCP/IP Models?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 150
  },
  {
    "id": "cyber-07",
    "levelNum": 7,
    "stageGroup": "Networking",
    "title": "DNS Security & Resolution",
    "badge": "DNS Guardian",
    "objective": "Recursive DNS resolution, DNS records (A, AAAA, MX, TXT), and DNS spoofing.",
    "explanation": "In-depth cybersecurity guide for DNS Security & Resolution. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, DNS Security & Resolution teaches you how to keep systems secure using dig +short.",
    "whyItMatters": "Mastering DNS Security & Resolution is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: DNS SECURITY & RESOLUTION ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "DNS Security & Resolution",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify DNS Security & Resolution.",
    "hints": [
      "Review DNS Security & Resolution mechanics.",
      "Look at the diagram flow above.",
      "Consider how dig +short protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind DNS Security & Resolution?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 160
  },
  {
    "id": "cyber-08",
    "levelNum": 8,
    "stageGroup": "Linux",
    "title": "Linux Fundamentals for Security",
    "badge": "Kernel Sentry",
    "objective": "POSIX filesystem hierarchy (/etc, /var/log, /home), CLI administration.",
    "explanation": "In-depth cybersecurity guide for Linux Fundamentals for Security. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Linux Fundamentals for Security teaches you how to keep systems secure using ls -la /var/log.",
    "whyItMatters": "Mastering Linux Fundamentals for Security is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: LINUX FUNDAMENTALS FOR SECURITY ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Linux Fundamentals for Security",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Linux Fundamentals for Security.",
    "hints": [
      "Review Linux Fundamentals for Security mechanics.",
      "Look at the diagram flow above.",
      "Consider how ls -la /var/log protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Linux Fundamentals for Security?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 170
  },
  {
    "id": "cyber-09",
    "levelNum": 9,
    "stageGroup": "Linux",
    "title": "Linux Permissions & SUID",
    "badge": "Permission Enforcer",
    "objective": "Octal math (755, 644, 600) and SUID root binaries audit.",
    "explanation": "In-depth cybersecurity guide for Linux Permissions & SUID. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Linux Permissions & SUID teaches you how to keep systems secure using chmod 600.",
    "whyItMatters": "Mastering Linux Permissions & SUID is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: LINUX PERMISSIONS & SUID ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Linux Permissions & SUID",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Linux Permissions & SUID.",
    "hints": [
      "Review Linux Permissions & SUID mechanics.",
      "Look at the diagram flow above.",
      "Consider how chmod 600 protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Linux Permissions & SUID?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 180
  },
  {
    "id": "cyber-10",
    "levelNum": 10,
    "stageGroup": "Linux",
    "title": "Processes & Services Management",
    "badge": "Process Warden",
    "objective": "PID tree, background daemons, systemctl status, and SIGKILL (kill -9).",
    "explanation": "In-depth cybersecurity guide for Processes & Services Management. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Processes & Services Management teaches you how to keep systems secure using ps aux | grep.",
    "whyItMatters": "Mastering Processes & Services Management is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: PROCESSES & SERVICES MANAGEMENT ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Processes & Services Management",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Processes & Services Management.",
    "hints": [
      "Review Processes & Services Management mechanics.",
      "Look at the diagram flow above.",
      "Consider how ps aux | grep protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Processes & Services Management?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 190
  },
  {
    "id": "cyber-11",
    "levelNum": 11,
    "stageGroup": "Cryptography",
    "title": "Cryptography Fundamentals",
    "badge": "Cipher Novice",
    "objective": "Encoding (Base64) vs Hashing (SHA-256) vs Encryption (AES).",
    "explanation": "In-depth cybersecurity guide for Cryptography Fundamentals. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Cryptography Fundamentals teaches you how to keep systems secure using base64, sha256sum.",
    "whyItMatters": "Mastering Cryptography Fundamentals is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: CRYPTOGRAPHY FUNDAMENTALS ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Cryptography Fundamentals",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Cryptography Fundamentals.",
    "hints": [
      "Review Cryptography Fundamentals mechanics.",
      "Look at the diagram flow above.",
      "Consider how base64, sha256sum protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Cryptography Fundamentals?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 200
  },
  {
    "id": "cyber-12",
    "levelNum": 12,
    "stageGroup": "Cryptography",
    "title": "Symmetric Cryptography (AES)",
    "badge": "AES Keymaster",
    "objective": "AES-256 GCM authenticated encryption and IV nonce randomness.",
    "explanation": "In-depth cybersecurity guide for Symmetric Cryptography (AES). Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Symmetric Cryptography (AES) teaches you how to keep systems secure using openssl enc.",
    "whyItMatters": "Mastering Symmetric Cryptography (AES) is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: SYMMETRIC CRYPTOGRAPHY (AES) ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Symmetric Cryptography (AES)",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Symmetric Cryptography (AES).",
    "hints": [
      "Review Symmetric Cryptography (AES) mechanics.",
      "Look at the diagram flow above.",
      "Consider how openssl enc protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Symmetric Cryptography (AES)?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 210
  },
  {
    "id": "cyber-13",
    "levelNum": 13,
    "stageGroup": "Cryptography",
    "title": "Asymmetric Cryptography (RSA)",
    "badge": "RSA Architect",
    "objective": "Public key encryption & private key decryption, digital signatures.",
    "explanation": "In-depth cybersecurity guide for Asymmetric Cryptography (RSA). Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Asymmetric Cryptography (RSA) teaches you how to keep systems secure using ssh-keygen.",
    "whyItMatters": "Mastering Asymmetric Cryptography (RSA) is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: ASYMMETRIC CRYPTOGRAPHY (RSA) ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Asymmetric Cryptography (RSA)",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Asymmetric Cryptography (RSA).",
    "hints": [
      "Review Asymmetric Cryptography (RSA) mechanics.",
      "Look at the diagram flow above.",
      "Consider how ssh-keygen protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Asymmetric Cryptography (RSA)?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 220
  },
  {
    "id": "cyber-14",
    "levelNum": 14,
    "stageGroup": "Cryptography",
    "title": "Cryptographic Hashes & Integrity",
    "badge": "Hash Defender",
    "objective": "Avalanche effect, collision resistance, and verifying SHA-256 checksums.",
    "explanation": "In-depth cybersecurity guide for Cryptographic Hashes & Integrity. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Cryptographic Hashes & Integrity teaches you how to keep systems secure using sha256sum.",
    "whyItMatters": "Mastering Cryptographic Hashes & Integrity is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: CRYPTOGRAPHIC HASHES & INTEGRITY ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Cryptographic Hashes & Integrity",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Cryptographic Hashes & Integrity.",
    "hints": [
      "Review Cryptographic Hashes & Integrity mechanics.",
      "Look at the diagram flow above.",
      "Consider how sha256sum protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Cryptographic Hashes & Integrity?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 230
  },
  {
    "id": "cyber-15",
    "levelNum": 15,
    "stageGroup": "Cryptography",
    "title": "Password Security & Salts",
    "badge": "Entropy Guardian",
    "objective": "Salts, Bcrypt work factors, Argon2, and preventing rainbow table attacks.",
    "explanation": "In-depth cybersecurity guide for Password Security & Salts. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Password Security & Salts teaches you how to keep systems secure using bcrypt verify.",
    "whyItMatters": "Mastering Password Security & Salts is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: PASSWORD SECURITY & SALTS ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Password Security & Salts",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Password Security & Salts.",
    "hints": [
      "Review Password Security & Salts mechanics.",
      "Look at the diagram flow above.",
      "Consider how bcrypt verify protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Password Security & Salts?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 240
  },
  {
    "id": "cyber-16",
    "levelNum": 16,
    "stageGroup": "Web Security",
    "title": "Web Fundamentals & HTTP",
    "badge": "HTTP Inspector",
    "objective": "HTTP verbs (GET, POST), response status codes (200, 401, 403, 500).",
    "explanation": "In-depth cybersecurity guide for Web Fundamentals & HTTP. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Web Fundamentals & HTTP teaches you how to keep systems secure using curl -I.",
    "whyItMatters": "Mastering Web Fundamentals & HTTP is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: WEB FUNDAMENTALS & HTTP ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Web Fundamentals & HTTP",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Web Fundamentals & HTTP.",
    "hints": [
      "Review Web Fundamentals & HTTP mechanics.",
      "Look at the diagram flow above.",
      "Consider how curl -I protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Web Fundamentals & HTTP?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 250
  },
  {
    "id": "cyber-17",
    "levelNum": 17,
    "stageGroup": "Web Security",
    "title": "Web Authentication & JWT",
    "badge": "Token Marshall",
    "objective": "Stateless JSON Web Tokens (Header.Payload.Signature) and session cookies.",
    "explanation": "In-depth cybersecurity guide for Web Authentication & JWT. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Web Authentication & JWT teaches you how to keep systems secure using jwt.io.",
    "whyItMatters": "Mastering Web Authentication & JWT is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: WEB AUTHENTICATION & JWT ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Web Authentication & JWT",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Web Authentication & JWT.",
    "hints": [
      "Review Web Authentication & JWT mechanics.",
      "Look at the diagram flow above.",
      "Consider how jwt.io protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Web Authentication & JWT?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 260
  },
  {
    "id": "cyber-18",
    "levelNum": 18,
    "stageGroup": "Web Security",
    "title": "SQL Injection Concepts & Prevention",
    "badge": "SQLi Fortifier",
    "objective": "How ' OR '1'='1 works and why Parameterized Queries stop SQL injection.",
    "explanation": "In-depth cybersecurity guide for SQL Injection Concepts & Prevention. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, SQL Injection Concepts & Prevention teaches you how to keep systems secure using SELECT * FROM users WHERE id = ?.",
    "whyItMatters": "Mastering SQL Injection Concepts & Prevention is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: SQL INJECTION CONCEPTS & PREVENTION ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "SQL Injection Concepts & Prevention",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify SQL Injection Concepts & Prevention.",
    "hints": [
      "Review SQL Injection Concepts & Prevention mechanics.",
      "Look at the diagram flow above.",
      "Consider how SELECT * FROM users WHERE id = ? protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind SQL Injection Concepts & Prevention?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 270
  },
  {
    "id": "cyber-19",
    "levelNum": 19,
    "stageGroup": "Web Security",
    "title": "Cross-Site Scripting (XSS) Prevention",
    "badge": "DOM Shield",
    "objective": "Stored, Reflected, DOM XSS and context-aware HTML entity encoding.",
    "explanation": "In-depth cybersecurity guide for Cross-Site Scripting (XSS) Prevention. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Cross-Site Scripting (XSS) Prevention teaches you how to keep systems secure using htmlspecialchars().",
    "whyItMatters": "Mastering Cross-Site Scripting (XSS) Prevention is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: CROSS-SITE SCRIPTING (XSS) PREVENTION ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Cross-Site Scripting (XSS) Prevention",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Cross-Site Scripting (XSS) Prevention.",
    "hints": [
      "Review Cross-Site Scripting (XSS) Prevention mechanics.",
      "Look at the diagram flow above.",
      "Consider how htmlspecialchars() protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Cross-Site Scripting (XSS) Prevention?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 280
  },
  {
    "id": "cyber-20",
    "levelNum": 20,
    "stageGroup": "Web Security",
    "title": "CSRF & Browser Security",
    "badge": "Cookie Sentinel",
    "objective": "Cross-Site Request Forgery, SameSite=Strict cookies, Anti-CSRF tokens.",
    "explanation": "In-depth cybersecurity guide for CSRF & Browser Security. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, CSRF & Browser Security teaches you how to keep systems secure using SameSite=Lax.",
    "whyItMatters": "Mastering CSRF & Browser Security is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: CSRF & BROWSER SECURITY ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "CSRF & Browser Security",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify CSRF & Browser Security.",
    "hints": [
      "Review CSRF & Browser Security mechanics.",
      "Look at the diagram flow above.",
      "Consider how SameSite=Lax protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind CSRF & Browser Security?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 290
  },
  {
    "id": "cyber-21",
    "levelNum": 21,
    "stageGroup": "Defense",
    "title": "Malware Taxonomy & Analysis",
    "badge": "Malware Hunter",
    "objective": "Viruses, Worms, Trojans, Ransomware, and sandbox behavioral analysis.",
    "explanation": "In-depth cybersecurity guide for Malware Taxonomy & Analysis. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Malware Taxonomy & Analysis teaches you how to keep systems secure using virustotal.",
    "whyItMatters": "Mastering Malware Taxonomy & Analysis is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: MALWARE TAXONOMY & ANALYSIS ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Malware Taxonomy & Analysis",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Malware Taxonomy & Analysis.",
    "hints": [
      "Review Malware Taxonomy & Analysis mechanics.",
      "Look at the diagram flow above.",
      "Consider how virustotal protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Malware Taxonomy & Analysis?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 300
  },
  {
    "id": "cyber-22",
    "levelNum": 22,
    "stageGroup": "Defense",
    "title": "Phishing & Social Engineering",
    "badge": "Phish Buster",
    "objective": "Email spoofing, SPF/DKIM/DMARC records, and credential harvesting defense.",
    "explanation": "In-depth cybersecurity guide for Phishing & Social Engineering. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Phishing & Social Engineering teaches you how to keep systems secure using SPF verification.",
    "whyItMatters": "Mastering Phishing & Social Engineering is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: PHISHING & SOCIAL ENGINEERING ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Phishing & Social Engineering",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Phishing & Social Engineering.",
    "hints": [
      "Review Phishing & Social Engineering mechanics.",
      "Look at the diagram flow above.",
      "Consider how SPF verification protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Phishing & Social Engineering?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 310
  },
  {
    "id": "cyber-23",
    "levelNum": 23,
    "stageGroup": "Defense",
    "title": "Firewalls & Packet Filtering",
    "badge": "Firewall Engineer",
    "objective": "Stateful packet inspection, iptables, ufw default deny rules.",
    "explanation": "In-depth cybersecurity guide for Firewalls & Packet Filtering. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Firewalls & Packet Filtering teaches you how to keep systems secure using ufw default deny.",
    "whyItMatters": "Mastering Firewalls & Packet Filtering is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: FIREWALLS & PACKET FILTERING ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Firewalls & Packet Filtering",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Firewalls & Packet Filtering.",
    "hints": [
      "Review Firewalls & Packet Filtering mechanics.",
      "Look at the diagram flow above.",
      "Consider how ufw default deny protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Firewalls & Packet Filtering?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 320
  },
  {
    "id": "cyber-24",
    "levelNum": 24,
    "stageGroup": "Defense",
    "title": "Network Defense Architecture",
    "badge": "Defense Architect",
    "objective": "DMZ segmentation, bastion jump hosts, Snort IDS/IPS rules.",
    "explanation": "In-depth cybersecurity guide for Network Defense Architecture. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Network Defense Architecture teaches you how to keep systems secure using DMZ isolation.",
    "whyItMatters": "Mastering Network Defense Architecture is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: NETWORK DEFENSE ARCHITECTURE ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Network Defense Architecture",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Network Defense Architecture.",
    "hints": [
      "Review Network Defense Architecture mechanics.",
      "Look at the diagram flow above.",
      "Consider how DMZ isolation protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Network Defense Architecture?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 330
  },
  {
    "id": "cyber-25",
    "levelNum": 25,
    "stageGroup": "Defense",
    "title": "System Hardening & CIS Benchmarks",
    "badge": "Hardening Officer",
    "objective": "Disabling root SSH, Fail2ban brute-force banning, sysctl kernel hardening.",
    "explanation": "In-depth cybersecurity guide for System Hardening & CIS Benchmarks. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, System Hardening & CIS Benchmarks teaches you how to keep systems secure using sshd_config.",
    "whyItMatters": "Mastering System Hardening & CIS Benchmarks is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: SYSTEM HARDENING & CIS BENCHMARKS ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "System Hardening & CIS Benchmarks",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify System Hardening & CIS Benchmarks.",
    "hints": [
      "Review System Hardening & CIS Benchmarks mechanics.",
      "Look at the diagram flow above.",
      "Consider how sshd_config protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind System Hardening & CIS Benchmarks?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 340
  },
  {
    "id": "cyber-26",
    "levelNum": 26,
    "stageGroup": "Monitoring",
    "title": "Logs & Forensic Monitoring",
    "badge": "Log Detective",
    "objective": "Parsing /var/log/auth.log, syslog, grep, and anomaly detection.",
    "explanation": "In-depth cybersecurity guide for Logs & Forensic Monitoring. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Logs & Forensic Monitoring teaches you how to keep systems secure using tail -f /var/log/auth.log.",
    "whyItMatters": "Mastering Logs & Forensic Monitoring is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: LOGS & FORENSIC MONITORING ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Logs & Forensic Monitoring",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Logs & Forensic Monitoring.",
    "hints": [
      "Review Logs & Forensic Monitoring mechanics.",
      "Look at the diagram flow above.",
      "Consider how tail -f /var/log/auth.log protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Logs & Forensic Monitoring?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 350
  },
  {
    "id": "cyber-27",
    "levelNum": 27,
    "stageGroup": "Monitoring",
    "title": "SIEM & Alert Correlation",
    "badge": "SIEM Specialist",
    "objective": "Aggregating log streams, event correlation rules, and SOC triage.",
    "explanation": "In-depth cybersecurity guide for SIEM & Alert Correlation. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, SIEM & Alert Correlation teaches you how to keep systems secure using ELK / Wazuh.",
    "whyItMatters": "Mastering SIEM & Alert Correlation is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: SIEM & ALERT CORRELATION ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "SIEM & Alert Correlation",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify SIEM & Alert Correlation.",
    "hints": [
      "Review SIEM & Alert Correlation mechanics.",
      "Look at the diagram flow above.",
      "Consider how ELK / Wazuh protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind SIEM & Alert Correlation?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 360
  },
  {
    "id": "cyber-28",
    "levelNum": 28,
    "stageGroup": "Incident Response",
    "title": "Incident Response Lifecycle",
    "badge": "IR Commander",
    "objective": "NIST IR 6-phase framework: Preparation, Detection, Containment, Eradication, Recovery, Lessons Learned.",
    "explanation": "In-depth cybersecurity guide for Incident Response Lifecycle. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Incident Response Lifecycle teaches you how to keep systems secure using containment.",
    "whyItMatters": "Mastering Incident Response Lifecycle is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: INCIDENT RESPONSE LIFECYCLE ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Incident Response Lifecycle",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Incident Response Lifecycle.",
    "hints": [
      "Review Incident Response Lifecycle mechanics.",
      "Look at the diagram flow above.",
      "Consider how containment protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Incident Response Lifecycle?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 380
  },
  {
    "id": "cyber-29",
    "levelNum": 29,
    "stageGroup": "Forensics",
    "title": "Digital Forensics & Evidence",
    "badge": "Forensics Detective",
    "objective": "Chain of custody, live volatile memory dumps, and disk image integrity hashes.",
    "explanation": "In-depth cybersecurity guide for Digital Forensics & Evidence. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Digital Forensics & Evidence teaches you how to keep systems secure using dd if=/dev/sda.",
    "whyItMatters": "Mastering Digital Forensics & Evidence is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: DIGITAL FORENSICS & EVIDENCE ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Digital Forensics & Evidence",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Digital Forensics & Evidence.",
    "hints": [
      "Review Digital Forensics & Evidence mechanics.",
      "Look at the diagram flow above.",
      "Consider how dd if=/dev/sda protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Digital Forensics & Evidence?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 400
  },
  {
    "id": "cyber-30",
    "levelNum": 30,
    "stageGroup": "Final Mission",
    "title": "Final Cyber Defense Mission",
    "badge": "DUOCORE Grandmaster",
    "objective": "Full multi-stage enterprise attack investigation, containment, and system recovery.",
    "explanation": "In-depth cybersecurity guide for Final Cyber Defense Mission. Learn technical defense mechanics, defensive code architectures, and operational procedures.",
    "explainSimply": "In simple terms, Final Cyber Defense Mission teaches you how to keep systems secure using Full Defense Playbook.",
    "whyItMatters": "Mastering Final Cyber Defense Mission is critical for real-world enterprise cyber defense and threat mitigation.",
    "diagram": "[ INCOMING TRAFFIC ] --> [ DEFENSE LAYER: FINAL CYBER DEFENSE MISSION ] --> [ VERIFIED SECURE STATE ]",
    "connectedConcepts": [
      "Final Cyber Defense Mission",
      "Defense in Depth",
      "Principle of Least Privilege"
    ],
    "guidedChallenge": "Apply security defense principles to verify Final Cyber Defense Mission.",
    "hints": [
      "Review Final Cyber Defense Mission mechanics.",
      "Look at the diagram flow above.",
      "Consider how Full Defense Playbook protects the system."
    ],
    "quizQuestion": "What is the key defensive principle behind Final Cyber Defense Mission?",
    "quizOptions": [
      "Security through obscurity",
      "Defense in Depth and Least Privilege",
      "Disabling all firewall rules",
      "Sharing passwords with team"
    ],
    "correctOptionIndex": 1,
    "quizExplanation": "Defense in depth ensures multiple overlapping protective controls defend critical infrastructure.",
    "xpReward": 500
  }
];
