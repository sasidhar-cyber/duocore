const QUESTIONS = [
  {
    id: "q-c-01",
    subject_slug: "cybersecurity",
    topic_slug: "cyber-01",
    question_text: "Which security equation accurately models risk in cyber defense?",
    difficulty: "easy",
    options: [
      "Risk = Asset + Threat",
      "Risk = Likelihood (Threat) × Impact (Vulnerability)",
      "Risk = Password Length × Speed",
      "Risk = Number of Firewalls"
    ],
    correct_index: 1,
    explanation: "Risk is quantitatively evaluated as the likelihood of a threat occurring multiplied by the business impact of the exploited vulnerability."
  },
  {
    id: "q-c-02",
    subject_slug: "cybersecurity",
    topic_slug: "cyber-02",
    question_text: "When a malicious user modifies an audit log file to erase their intrusion tracks, which CIA principle is violated?",
    difficulty: "easy",
    options: ["Confidentiality", "Integrity", "Availability", "Speed"],
    correct_index: 1,
    explanation: "Tampering with log entries alters historical records, directly destroying the Integrity of the forensic evidence."
  },
  {
    id: "q-c-03",
    subject_slug: "cybersecurity",
    topic_slug: "cyber-03",
    question_text: "Which of the following is an example of an Authorization failure rather than an Authentication failure?",
    difficulty: "medium",
    options: [
      "User enters an incorrect password three times",
      "User enters an expired MFA code",
      "A normal authenticated employee accesses the CEO's confidential salary spreadsheet",
      "User forgets their username"
    ],
    correct_index: 2,
    explanation: "The employee is already authenticated, but the system failed to enforce authorization boundaries regarding what they are permitted to see."
  },
  {
    id: "q-c-04",
    subject_slug: "cybersecurity",
    topic_slug: "cyber-04",
    question_text: "In the subnet 192.168.1.0/24, what is the broadcast address used to send packets to all hosts?",
    difficulty: "easy",
    options: ["192.168.1.0", "192.168.1.1", "192.168.1.255", "192.168.1.254"],
    correct_index: 2,
    explanation: "In a /24 subnet (255.255.255.0), .0 is the network identifier and .255 is reserved as the broadcast address."
  },
  {
    id: "q-c-05",
    subject_slug: "cybersecurity",
    topic_slug: "cyber-05",
    question_text: "Which port and protocol combination is used for secure remote command-line administration?",
    difficulty: "easy",
    options: ["Port 23 / UDP", "Port 22 / TCP (SSH)", "Port 80 / TCP", "Port 53 / UDP"],
    correct_index: 1,
    explanation: "Port 22 over TCP is the universal standard for SSH (Secure Shell) encrypted administration."
  },
  {
    id: "q-c-06",
    subject_slug: "cybersecurity",
    topic_slug: "cyber-06",
    question_text: "At which OSI layer does an IP Router operate and make packet forwarding decisions?",
    difficulty: "easy",
    options: ["Layer 2 (Data Link)", "Layer 3 (Network)", "Layer 4 (Transport)", "Layer 7 (Application)"],
    correct_index: 1,
    explanation: "Routers operate at Layer 3 (Network Layer) inspecting IP packet headers."
  },
  {
    id: "q-c-18",
    subject_slug: "cybersecurity",
    topic_slug: "cyber-18",
    question_text: "What is the primary technical reason why Parameterized Queries (Prepared Statements) stop SQL Injection?",
    difficulty: "medium",
    options: [
      "They encrypt the user input with AES-256",
      "They pre-compile the SQL query syntax so user input is treated strictly as literal data, never executable code",
      "They block all apostrophe characters",
      "They run the query in a separate thread"
    ],
    correct_index: 1,
    explanation: "Prepared Statements separate query code from data. The database engine compiles the SQL execution plan first, guaranteeing user input cannot alter the query structure."
  },
  {
    id: "q-c-19",
    subject_slug: "cybersecurity",
    topic_slug: "cyber-19",
    question_text: "Which browser cookie attribute prevents malicious client-side JavaScript from accessing session cookies via XSS?",
    difficulty: "medium",
    options: ["Secure", "HttpOnly", "SameSite=Strict", "Domain"],
    correct_index: 1,
    explanation: "The HttpOnly flag instructs browsers that document.cookie cannot be read or modified by JavaScript, mitigating session hijacking via XSS."
  },
  {
    id: "q-l-01",
    subject_slug: "linux",
    topic_slug: "linux-01",
    question_text: "Which Linux command displays the current absolute working directory path?",
    difficulty: "easy",
    options: ["whoami", "pwd", "cd", "ls"],
    correct_index: 1,
    explanation: "pwd stands for Print Working Directory and outputs your current absolute path."
  },
  {
    id: "q-l-06",
    subject_slug: "linux",
    topic_slug: "linux-06",
    question_text: "What numerical octal permission value gives Owner Read/Write/Exec (rwx) and everyone else Read/Exec (r-x)?",
    difficulty: "easy",
    options: ["755", "644", "777", "600"],
    correct_index: 0,
    explanation: "Owner: 4(r)+2(w)+1(x) = 7. Group: 4(r)+0(w)+1(x) = 5. Others: 4(r)+0(w)+1(x) = 5. Total: 755."
  },
  {
    id: "q-l-10",
    subject_slug: "linux",
    topic_slug: "linux-10",
    question_text: "Which diagnostic command displays all listening TCP and UDP sockets with numeric port numbers and process PIDs?",
    difficulty: "easy",
    options: ["ping", "ss -tulpn", "cat /etc/hosts", "traceroute"],
    correct_index: 1,
    explanation: "ss -tulpn displays TCP (-t), UDP (-u), listening (-l), process/PID (-p), and numeric port numbers (-n)."
  }
];

const ACHIEVEMENTS = [
  { id: "ach-1", slug: "first_spark", title: "First Spark", description: "Complete your first cybersecurity level with your study partner.", icon: "Flame", category: "study", xp_reward: 50 },
  { id: "ach-2", slug: "triad_guardian", title: "CIA Triad Guardian", description: "Master the CIA Triad and Asset classification levels.", icon: "Shield", category: "cyber", xp_reward: 100 },
  { id: "ach-3", slug: "terminal_adept", title: "Terminal Adept", description: "Execute 10 commands in the Linux virtual terminal lab.", icon: "Terminal", category: "linux", xp_reward: 150 },
  { id: "ach-4", slug: "quiz_gladiator", title: "Quiz Gladiator", description: "Achieve 100% accuracy in a live 1v1 Quiz Arena duel.", icon: "Swords", category: "quiz", xp_reward: 200 },
  { id: "ach-5", slug: "duo_sync", title: "Two Minds Synced", description: "Maintain a 5-day consecutive synchronized study streak.", icon: "Sparkles", category: "social", xp_reward: 250 },
  { id: "ach-6", slug: "crypto_master", title: "Crypto Keymaster", description: "Master AES encryption, RSA keypairs, and password salts.", icon: "Lock", category: "cyber", xp_reward: 300 },
  { id: "ach-7", slug: "defense_architect", title: "Defense Architect", description: "Build and test a stateful firewall rule set.", icon: "Layers", category: "defense", xp_reward: 350 },
  { id: "ach-8", slug: "grandmaster", title: "DUOCORE Grandmaster", description: "Reach Level 10 and conquer the final cyber defense mission.", icon: "Award", category: "mastery", xp_reward: 500 }
];

module.exports = {
  QUESTIONS,
  ACHIEVEMENTS
};
