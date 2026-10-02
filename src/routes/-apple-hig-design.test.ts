import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('ONDA 5: AUDITORIA SILENCIOSA DE DESIGN APPLE HIG & RADIX UI', () => {
 const routesToCheck = [
 'src/routes/workspace.rh.ponto.tsx',
 'src/routes/_store.conta.colaborador.tsx',
 'src/routes/workspace.suporte.tsx',
 'src/routes/workspace.pdv.cozinha.tsx',
 'src/routes/_store.garcom.tsx',
 'src/routes/workspace.pedidos.expedicao.tsx',
 'src/routes/workspace.eventos.$id.subpaineis.tsx',
 'src/routes/workspace.configuracoes.pwa.tsx',
 'src/routes/workspace.automacoes.tsx',
    'src/routes/workspace.marketing.anuncios.tsx',
    'src/routes/workspace.cms.calendario.tsx',
    'src/routes/admin-master.botoes.tsx',
    'src/routes/admin-master.hubs.tsx',
 ];

 it('todas as rotas da Onda 5 devem existir no sistema de arquivos', () => {
 for (const routePath of routesToCheck) {
 const fullPath = path.resolve(routePath);
 expect(fs.existsSync(fullPath), `Arquivo não encontrado: ${routePath}`).toBe(true);
 }
 });

 it('todas as rotas devem usar TanStack Router createFileRoute', () => {
 for (const routePath of routesToCheck) {
 const content = fs.readFileSync(path.resolve(routePath), 'utf8');
 expect(content).toContain('createFileRoute');
 expect(content).not.toContain('react-router-dom');
 expect(content).not.toContain('BloesyTabs');
 }
 });

 it('devem impor touch targets mínimos de 44px para conformidade móvel Apple HIG', () => {
 for (const routePath of routesToCheck) {
 const content = fs.readFileSync(path.resolve(routePath), 'utf8');
 // Deve conter declarações explícitas de min-h-11 ou h-11 / h-14 / min-h-12 / min-h-[52px]
 const hasTouchTargetStandard = 
 content.includes('min-h-11') || 
 content.includes('min-h-12') || 
 content.includes('min-h-[52px]') || 
 content.includes('min-h-[56px]') ||
 content.includes('h-11') ||
 content.includes('h-12');
 
 expect(hasTouchTargetStandard, `${routePath} deve respeitar a diretriz de touch target mínimo 44px`).toBe(true);
 }
 });

 it('devem seguir a hierarquia de camadas Apple HIG (bg-card, rounded-lg/3xl, border-border)', () => {
 for (const routePath of routesToCheck) {
 const content = fs.readFileSync(path.resolve(routePath), 'utf8');
 expect(content).toContain('bg-card');
 expect(content).toContain('border-border');
 }
 });
});
