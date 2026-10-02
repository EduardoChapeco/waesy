import fs from 'fs';
import path from 'path';

function countFiles(dir, recursive = true) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (recursive) {
        count += countFiles(path.join(dir, entry.name), recursive);
      }
    } else {
      count++;
    }
  }
  return count;
}

function countFilesInRoot(dir) {
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.filter(e => !e.isDirectory()).length;
}

function countFolders(dir) {
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).length;
}

const root = process.cwd();

const routesTotal = countFiles(path.join(root, 'src', 'routes'), true);
const routesRoot = countFilesInRoot(path.join(root, 'src', 'routes'));
const routesFolders = countFolders(path.join(root, 'src', 'routes'));

const servicesTotal = countFiles(path.join(root, 'src', 'services'), true);
const servicesRoot = countFilesInRoot(path.join(root, 'src', 'services'));

const libTotal = countFiles(path.join(root, 'src', 'lib'), true);
const libRoot = countFilesInRoot(path.join(root, 'src', 'lib'));

const componentsTotal = countFiles(path.join(root, 'src', 'components'), true);
const componentsFolders = countFolders(path.join(root, 'src', 'components'));

const typesTotal = countFiles(path.join(root, 'src', 'types'), true);
const hooksTotal = countFiles(path.join(root, 'src', 'hooks'), true);
const registriesTotal = countFiles(path.join(root, 'src', 'registries'), true);
const configTotal = countFiles(path.join(root, 'src', 'config'), true);

const migrationsTotal = countFiles(path.join(root, 'supabase', 'migrations'), false);
const edgeFunctionsTotal = countFiles(path.join(root, 'supabase', 'functions'), true);

const workflowsExists = fs.existsSync(path.join(root, '.github', 'workflows'));
const workflowsCount = workflowsExists ? countFiles(path.join(root, '.github', 'workflows'), true) : 0;

const docsTotal = countFiles(path.join(root, 'docs'), true);
const docsRootMd = fs.existsSync(path.join(root, 'docs'))
  ? fs.readdirSync(path.join(root, 'docs')).filter(f => f.endsWith('.md')).length
  : 0;

const parallelDirs = ['auditoria', 'ia', 'melhoria', 'reparo', 'legacy_quarantine', 'scratch'];
const parallelStats = {};
for (const p of parallelDirs) {
  const pPath = path.join(root, p);
  parallelStats[p] = {
    exists: fs.existsSync(pPath),
    files: countFiles(pPath, true)
  };
}

const errorCaptureExists = fs.existsSync(path.join(root, 'src', 'lib', 'error-capture.ts'));
const errorCaptureLines = errorCaptureExists
  ? fs.readFileSync(path.join(root, 'src', 'lib', 'error-capture.ts'), 'utf8').split('\n').length
  : 0;

const result = {
  measuredAt: new Date().toISOString(),
  metrics: {
    routes: { total: routesTotal, rootOnly: routesRoot, subfolders: routesFolders },
    services: { total: servicesTotal, rootOnly: servicesRoot },
    lib: { total: libTotal, rootOnly: libRoot },
    components: { total: componentsTotal, domainFolders: componentsFolders },
    types: typesTotal,
    hooks: hooksTotal,
    registries: registriesTotal,
    config: configTotal,
    migrations: migrationsTotal,
    edgeFunctions: edgeFunctionsTotal,
    ciWorkflows: { exists: workflowsExists, count: workflowsCount },
    docs: { total: docsTotal, rootMd: docsRootMd },
    parallelDirs: parallelStats,
    errorCapture: { exists: errorCaptureExists, lines: errorCaptureLines }
  }
};

console.log(JSON.stringify(result, null, 2));
