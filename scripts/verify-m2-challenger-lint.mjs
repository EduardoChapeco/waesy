import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { loadConfig, lintSource } from './design-lint.mjs';

const config = loadConfig();

const files = [
  'src/components/classifieds/catalog/classified-filter-sheet.tsx',
  'src/components/commerce/quick-create-modal.tsx',
  'src/components/common/action-auth-guard-modal.tsx',
  'src/components/common/share-modal.tsx',
  'src/components/location/location-master-pill.tsx',
  'src/components/navigation/native-mobile-header.tsx',
  'src/components/shell/app-shell.tsx',
  'src/components/shell/global-menu-hub.tsx',
  'src/components/shell/mobile-nav.tsx',
  'src/routes/_store.afiliados.tsx',
  'src/routes/_store.agenda.tsx',
  'src/routes/_store.agendar.index.tsx',
  'src/routes/_store.buscar.tsx',
  'src/routes/_store.conta.atividade.tsx',
  'src/routes/_store.conta.avaliacoes.tsx',
  'src/routes/_store.conta.classificados.index.tsx',
  'src/routes/_store.conta.entregador.tsx',
  'src/routes/_store.conta.ingressos.tsx',
  'src/routes/_store.conta.notificacoes.tsx',
  'src/routes/_store.conta.pedidos.$id.tsx',
  'src/routes/_store.diretorio.index.tsx',
  'src/routes/_store.empregos.index.tsx',
  'src/routes/_store.eventos.tsx',
  'src/routes/_store.faq.tsx',
  'src/routes/_store.recuperar-senha.tsx'
];

let totalOldP0 = 0, totalOldP1 = 0, totalOldAll = 0;
let totalNewP0 = 0, totalNewP1 = 0, totalNewAll = 0;
const fileDeltas = [];

for (const relFile of files) {
  const absPath = path.resolve(relFile);
  const currentContent = fs.readFileSync(absPath, 'utf8');
  const currentViolations = lintSource(currentContent, absPath, config);
  const currP0 = currentViolations.filter(v => v.severity === 'P0').length;
  const currP1 = currentViolations.filter(v => v.severity === 'P1').length;
  const currTotal = currentViolations.length;

  let oldContent = '';
  try {
    oldContent = execSync('git show 59f3a418~1:' + relFile, { encoding: 'utf8' });
  } catch (e) {
    oldContent = '';
  }

  const oldViolations = oldContent ? lintSource(oldContent, absPath, config) : [];
  const oldP0 = oldViolations.filter(v => v.severity === 'P0').length;
  const oldP1 = oldViolations.filter(v => v.severity === 'P1').length;
  const oldTotal = oldViolations.length;

  totalOldP0 += oldP0;
  totalOldP1 += oldP1;
  totalOldAll += oldTotal;
  totalNewP0 += currP0;
  totalNewP1 += currP1;
  totalNewAll += currTotal;

  fileDeltas.push({
    file: relFile,
    oldTotal, currTotal, deltaTotal: currTotal - oldTotal,
    oldP0, currP0, deltaP0: currP0 - oldP0,
    oldP1, currP1, deltaP1: currP1 - oldP1,
    newP0orP1: currentViolations.filter(cv => 
      (cv.severity === 'P0' || cv.severity === 'P1') &&
      !oldViolations.some(ov => ov.rule === cv.rule && ov.message === cv.message && ov.match === cv.match)
    )
  });
}

console.log('======================================================================');
console.log('SUMMARY ACROSS 25 CODE FILES MODIFIED IN COMMIT 59f3a418:');
console.log('======================================================================');
console.log(`Total Violations: ${totalOldAll} -> ${totalNewAll} (Net reduction: ${totalOldAll - totalNewAll})`);
console.log(`P0 Violations:    ${totalOldP0} -> ${totalNewP0} (Delta: ${totalNewP0 - totalOldP0})`);
console.log(`P1 Violations:    ${totalOldP1} -> ${totalNewP1} (Delta: ${totalNewP1 - totalOldP1})`);

const filesWithIncreasedP0P1 = fileDeltas.filter(f => f.deltaP0 > 0 || f.deltaP1 > 0);
console.log(`Files with increased P0/P1 count: ${filesWithIncreasedP0P1.length}`);

const filesWithBrandNewViolations = fileDeltas.filter(f => f.newP0orP1.length > 0);
console.log(`Files with brand-new P0/P1 violations: ${filesWithBrandNewViolations.length}`);
if (filesWithBrandNewViolations.length > 0) {
  console.log('DETAILS:', JSON.stringify(filesWithBrandNewViolations, null, 2));
}

console.log('\nPer file breakdown:');
for (const fd of fileDeltas) {
  console.log(`${fd.file}: total ${fd.oldTotal}->${fd.currTotal} (${fd.deltaTotal}), P0 ${fd.oldP0}->${fd.currP0}, P1 ${fd.oldP1}->${fd.currP1}`);
}
