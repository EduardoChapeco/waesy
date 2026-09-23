import fs from 'fs';

// 1. Fix _store.conta.classificados.index.tsx (missing cn)
{
  const file = 'src/routes/_store.conta.classificados.index.tsx';
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('import { cn }')) {
    content = "import { cn } from '@/lib/utils';\n" + content;
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed cn import in _store.conta.classificados.index.tsx');
  }
}

// 2. Fix mining-dashboard.tsx
{
  const file = 'src/components/mining/mining-dashboard.tsx';
  let content = fs.readFileSync(file, 'utf8');

  // Fix batch import message
  content = content.replace(
    'toast.success(res.message);',
    'toast.success(`${res.importedCount || 0} produtos importados com sucesso!`);'
  );

  // Fix runScraperFn res as any
  content = content.replace(
    'const res = await runScraperFn({',
    'const res = (await runScraperFn({'
  ).replace(
    'cnpj: extraParams?.cnpj,\n        },\n      });',
    'cnpj: extraParams?.cnpj,\n        },\n      })) as any;'
  );

  // Fix stats.minedArticles
  content = content.replace(
    '(stats?.minedArticles.total ?? 0)',
    '(stats?.minedArticles?.total ?? 0)'
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed type errors in mining-dashboard.tsx');
}
