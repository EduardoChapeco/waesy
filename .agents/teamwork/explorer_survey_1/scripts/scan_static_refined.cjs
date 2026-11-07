const fs = require('fs');
const path = require('path');

const routesDir = path.resolve('src/routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

const findings = {
  emBreveOrEmDesenvolvimento: [],
  explicitTodo: [],
  routesWithoutLoader: [],
  emptyOrMockLoaders: [],
  localStateWithoutBff: []
};

files.forEach(f => {
  if (f.includes('.test.') || f.includes('__tests__') || f.startsWith('api.')) return;
  const filePath = path.join(routesDir, f);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check for "em breve", "em desenvolvimento", "não implementado"
  const lines = content.split('\n');
  const matchedEmBreve = [];
  const matchedTodo = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (/(em\s+breve|em\s+desenvolvimento|não\s+implementad|recurso\s+em\s+construção)/i.test(trimmed)) {
      matchedEmBreve.push({ line: idx + 1, text: trimmed });
    }
    if (/\b(TODO|FIXME|STUB)\b/.test(line)) {
      matchedTodo.push({ line: idx + 1, text: trimmed });
    }
  });

  if (matchedEmBreve.length > 0) {
    findings.emBreveOrEmDesenvolvimento.push({ file: f, matches: matchedEmBreve });
  }
  if (matchedTodo.length > 0) {
    findings.explicitTodo.push({ file: f, matches: matchedTodo });
  }

  // Check for routes without loader
  const hasLoader = content.includes('loader:') || (content.includes('createFileRoute') && content.includes('loader'));
  if (!hasLoader && !content.includes('redirect(') && !content.includes('<Outlet')) {
    findings.routesWithoutLoader.push(f);
  }

  // Check loaders returning mock/empty/static data
  // e.g. loader: () => ({ ... }), or loader: async () => { return { items: [] } } without any async call
  const loaderMatch = content.match(/loader\s*:\s*(async\s*)?\([^)]*\)\s*=>\s*(\{[\s\S]*?\n\s*\}\)|\{[\s\S]*?\n\s*\})/);
  if (loaderMatch) {
    const loaderCode = loaderMatch[0];
    if (
      !loaderCode.includes('await') && 
      !loaderCode.includes('Promise.all') && 
      !loaderCode.includes('supabase') && 
      !loaderCode.includes('get') &&
      !loaderCode.includes('fetch') &&
      !loaderCode.includes('list')
    ) {
      findings.emptyOrMockLoaders.push({ file: f, loaderSnippet: loaderCode.slice(0, 150) });
    }
  }

  // Check for local useState with initial array of objects (typical mock data in local state)
  const useStateMock = /useState\s*\(\s*\[\s*\{/g;
  if (useStateMock.test(content)) {
    findings.localStateWithoutBff.push(f);
  }
});

fs.writeFileSync(
  path.resolve('.agents/teamwork/explorer_survey_1/static_refined_findings.json'),
  JSON.stringify(findings, null, 2),
  'utf8'
);

console.log('Routes with "Em breve" / "Em desenvolvimento" / "Não implementado":', findings.emBreveOrEmDesenvolvimento.length);
console.log('Routes with explicit TODO / FIXME / STUB:', findings.explicitTodo.length);
console.log('Content routes without loader:', findings.routesWithoutLoader.length);
console.log('Empty / mock synchronous loaders:', findings.emptyOrMockLoaders.length);
console.log('Routes with useState initialized with array of objects:', findings.localStateWithoutBff.length);
