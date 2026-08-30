/**
 * Tests that the AI engine answers distinct questions differently.
 * Requires the backend on PORT (default 5000).
 */
const questions = [
  'what is DNS?',
  'why do we need DNS?',
  'how does DNS work?',
  'explain Linux chmod',
  'why is chmod 755 used?',
  'what is hashing?',
  'hashing vs encryption',
  'explain SQL injection simply',
  'what is a firewall?',
  'linux lo chmod 755 enduku use chestham?',
  'Hi',
  'Tell me a joke.',
  'What is 25 + 25?'
];

async function main() {
  const base = process.env.API_BASE || 'http://127.0.0.1:5000';
  const loginRes = await fetch(`${base}/api/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'alex' })
  });
  const login = await loginRes.json();
  if (!login.token) {
    console.error('Login failed', login);
    process.exit(1);
  }

  const answers = [];
  for (const q of questions) {
    const res = await fetch(`${base}/api/ai/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${login.token}`
      },
      body: JSON.stringify({ question: q })
    });
    const data = await res.json();
    answers.push({ q, answer: data.answer || data.error || '' });
    console.log('\nQ:', q);
    console.log('A:', String(data.answer || data.error || '').slice(0, 280));
  }

  const dnsAnswers = answers.filter((a) => /dns/i.test(a.q)).map((a) => a.answer);
  const uniqueDns = new Set(dnsAnswers);
  console.log('\n--- uniqueness ---');
  console.log('DNS-related answers unique count:', uniqueDns.size, 'of', dnsAnswers.length);
  const joke = answers.find((a) => /joke/i.test(a.q));
  console.log('Joke looks like joke:', /joke|why |because|knock/i.test(joke?.answer || '') || (joke?.answer || '').length > 20);
  const math = answers.find((a) => /25 \+ 25/.test(a.q));
  console.log('25+25 contains 50:', /50/.test(math?.answer || ''));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
