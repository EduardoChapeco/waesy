import { describe, it, expect, vi } from 'vitest';
import { generateExperienceFromPrompt } from './ai-builder-generator';
import { exportStaticHtml, triggerDeployHook } from './builder-exporter';
import { HOME_TEMPLATES_LIBRARY } from '@/lib/home-templates-library';

describe('[FASE 8 AUDIT] AI Layout Generator, Niche Templates & 1-Click Exporter', () => {
 it('should infer tourism niche and generate a complete experience node tree', () => {
 const nodes = generateExperienceFromPrompt('Quero criar uma página para agência de turismo e viagens com pacotes para o Nordeste', {
 storeName: 'Nordeste Tours',
 });

 expect(nodes.length).toBeGreaterThanOrEqual(4);
 const sections = nodes.filter((n) => n.node_type === 'section');
 expect(sections.length).toBeGreaterThanOrEqual(2);

 const bento = nodes.find((n) => n.block_type === 'bento_grid');
 expect(bento).toBeDefined();
 expect(bento?.content?.title).toContain('Destinos');
 });

 it('should infer gastronomy niche and generate a culinary experience tree', () => {
 const nodes = generateExperienceFromPrompt('Montar um cardápio digital para restaurante italiano e pizzaria artesanal');
 expect(nodes.length).toBeGreaterThanOrEqual(4);
 const bento = nodes.find((n) => n.block_type === 'bento_grid');
 expect(bento?.content?.title).toContain('Cardápio');
 });

 it('should register all 5 niche presets in HOME_TEMPLATES_LIBRARY', () => {
 expect(HOME_TEMPLATES_LIBRARY['retail_omnichannel']).toBeDefined();
 expect(HOME_TEMPLATES_LIBRARY['tourism_travel_agency']).toBeDefined();
 expect(HOME_TEMPLATES_LIBRARY['gastronomy_restaurant']).toBeDefined();
 expect(HOME_TEMPLATES_LIBRARY['corporate_services']).toBeDefined();
 expect(HOME_TEMPLATES_LIBRARY['real_estate_luxury']).toBeDefined();

 // Verify nodes factory produces valid nodes
 const uid = () => 'test_id_' + Math.random().toString(36).substring(2, 7);
 const tourismNodes = HOME_TEMPLATES_LIBRARY['tourism_travel_agency'].nodesFactory(uid);
 expect(tourismNodes.length).toBeGreaterThanOrEqual(3);
 });

 it('should generate standalone HTML5 with SEO meta tags, Google Fonts and Tailwind CDN', () => {
 const dummyNodes = [
 { id: 's1', node_type: 'section', block_type: 'section', sort_order: 0 } as any,
 ];
 const html = exportStaticHtml(dummyNodes, {
 title: 'Portal Oficial',
 storeName: 'Waesy Turismo Premium',
 description: 'Experiência exclusiva de compras',
 });

 expect(html).toContain('<!DOCTYPE html>');
 expect(html).toContain('<html lang="pt-BR"');
 expect(html).toContain('Portal Oficial · Waesy Turismo Premium');
 expect(html).toContain('cdn.tailwindcss.com');
 expect(html).toContain('fonts.googleapis.com');
 expect(html).toContain('window.__WAESY_EXPERIENCE_NODES__');
 });

 it('should dispatch deploy hook with payload and handle responses', async () => {
 const fetchMock = vi.fn().mockResolvedValue({
 ok: true,
 status: 200,
 statusText: 'OK',
 });
 global.fetch = fetchMock;

 const result = await triggerDeployHook('vercel', 'https://api.vercel.com/v1/integrations/deploy/fake-hook', {
 branch: 'main',
 });

 expect(result.success).toBe(true);
 expect(result.statusCode).toBe(200);
 expect(fetchMock).toHaveBeenCalled();
 });
});
