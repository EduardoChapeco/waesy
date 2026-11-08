const fs = require('fs');
const path = require('path');

const routesDir = path.resolve('src/routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

const findings = {
  emBreveOrTodo: [],
  localStateWithoutBff: [],
  routesWithoutLoader: [],
  noServerActionInForm: [],
  staticRoutes: []
};

files.forEach(f => {
  if (f.includes('.test.') || f.includes('__tests__') || f.startsWith('api.')) return;
  const filePath = path.join(routesDir, f);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check for "em breve", "desenvolvimento", "TODO", "mock"
  const todoRegex = /(em\s+breve|em\s+desenvolvimento|não\s+implementado|TODO|FIXME|stub|mock|fake|placeholder)/i;
  const matchTodo = content.match(todoRegex);
  if (matchTodo && !content.includes('// @ts-ignore')) {
    // Filter out common false positives like "placeholder=" in input fields
    const lines = content.split('\n');
    const matchedLines = [];
    lines.forEach((line, idx) => {
      if (/(em\s+breve|em\s+desenvolvimento|não\s+implementad|TODO|FIXME)/i.test(line)) {
        matchedLines.push({ line: idx + 1, text: line.trim() });
      }
    });
    if (matchedLines.length > 0) {
      findings.emBreveOrTodo.push({ file: f, matches: matchedLines });
    }
  }

  // Check for routes without loader
  const hasLoader = content.includes('loader:') || (content.includes('createFileRoute') && content.includes('loader'));
  if (!hasLoader && !content.includes('redirect(') && !content.includes('<Outlet')) {
    findings.routesWithoutLoader.push(f);
  }

  // Check for local useState with initial array of objects (typical mock data in local state)
  const useStateMock = /useState\s*\(\s*\[\s*\{/g;
  if (useStateMock.test(content)) {
    findings.localStateWithoutBff.push(f);
  }
});

fs.writeFileSync(
  path.resolve('.agents/teamwork/explorer_survey_1/static_and_todo_findings.json'),
  JSON.stringify(findings, null, 2),
  'utf8'
);

console.log('Routes with "Em breve" / "TODO" / "Não implementado":', findings.emBreveOrTodo.length);
console.log('Routes with useState initialized with array of objects (local state mock):', findings.localStateWithoutBff.length);
console.log('Content routes without loader:', findings.routesWithoutLoader.length);
