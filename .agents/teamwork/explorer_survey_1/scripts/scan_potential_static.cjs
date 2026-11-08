const fs = require('fs');
const path = require('path');

const routesDir = path.resolve('src/routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.tsx'));

const potentialStaticScreens = [];

files.forEach(f => {
  if (f.includes('.test.') || f.includes('__tests__')) return;
  const content = fs.readFileSync(path.join(routesDir, f), 'utf8');

  // Check if route has mutations or server actions
  const hasMutation = /useMutation|mutate|mutateAsync|handleSubmit|onSubmit/i.test(content);
  const hasServerFuncImport = /from\s+['"]@\/services\//i.test(content);
  const hasSupabase = /supabase/i.test(content);

  // Check if route has buttons with onClick that only do local state or toast
  const hasButton = /<Button\b/i.test(content);
  const localOnlyAction = /onClick=\{[^{}]*(?:toast\.|set[A-Z]\w*\(|console\.)[^{}]*\}/g;
  const matches = content.match(localOnlyAction) || [];

  // Check if route has hardcoded items rendered directly
  // e.g. const [items, setItems] = useState([ ... ]); or const items = [ ... ];
  const hardcodedArrayRegex = /const\s+([A-Za-z0-9_]+)\s*=\s*\[\s*\{\s*(?:id|title|name|label):/g;
  let hardcodedMatches = [];
  let m;
  while ((m = hardcodedArrayRegex.exec(content)) !== null) {
    // Exclude tabs, nav items, filter options, columns
    const varName = m[1].toLowerCase();
    if (!varName.includes('tab') && !varName.includes('nav') && !varName.includes('col') && !varName.includes('filter') && !varName.includes('step') && !varName.includes('crumb') && !varName.includes('metric')) {
      hardcodedMatches.push(m[1]);
    }
  }

  // Check if route has no server connection at all
  if (!hasServerFuncImport && !hasSupabase && !content.includes('redirect(') && !content.includes('<Outlet')) {
    potentialStaticScreens.push({
      file: f,
      type: 'NO_BACKEND_CONNECTION',
      reason: 'No imports from @/services/ and no supabase client referenced',
      hardcodedArrays: hardcodedMatches
    });
  } else if (hardcodedMatches.length > 0) {
    potentialStaticScreens.push({
      file: f,
      type: 'HARDCODED_DATA_ARRAY',
      reason: `Hardcoded data array(s) detected: ${hardcodedMatches.join(', ')}`,
      hardcodedArrays: hardcodedMatches
    });
  }
});

fs.writeFileSync(
  path.resolve('.agents/teamwork/explorer_survey_1/potential_static_screens.json'),
  JSON.stringify(potentialStaticScreens, null, 2),
  'utf8'
);

console.log('Potential static screens or screens with hardcoded arrays:', potentialStaticScreens.length);
potentialStaticScreens.forEach(s => {
  console.log(`[${s.type}] ${s.file}: ${s.reason}`);
});
