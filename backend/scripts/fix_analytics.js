const fs = require('fs');
let code = fs.readFileSync('src/routes/analytics.js', 'utf8');

const helper = `const callAiService = async (req, endpoint, data) => {
  return await axios.post(\`\${AI_SERVICE_URL}\${endpoint}\`, data, {
    headers: {
      cookie: req.headers.cookie || '',
      authorization: req.headers.authorization || '',
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET || ''
    }
  });
};`;

code = code.replace(/const AI_SERVICE_URL = [^\n]+\n/, match => match + '\n' + helper + '\n');
code = code.replace(/await axios\.post\(`\$\{AI_SERVICE_URL\}\/([^`]+)`, ([^\)]+)\)/g, "await callAiService(req, '/$1', $2)");

fs.writeFileSync('src/routes/analytics.js', code);
