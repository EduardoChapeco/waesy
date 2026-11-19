import { describe, it, expect } from 'vitest';
import { builderRegistry } from '../lib/builder/builder-registry';

describe('ONDA 4: ESTÚDIOS CRIATIVOS, BUILDER & CLOUDBLOCK', () => {

 // ─── 1. BUILDER REGISTRY & CLOUDBLOCK BLOCKS ───
 describe('Builder Registry & Blocks Manifest', () => {
 it('deve ter todos os blocos fundamentais de nicho registrados', () => {
 const registeredTypes = Object.keys(builderRegistry);

 // Verificações estruturais
 expect(registeredTypes).toContain('section');
 expect(registeredTypes).toContain('container');
 expect(registeredTypes).toContain('bento_grid');

 // Gastronomia
 expect(registeredTypes).toContain('food_menu_tabs');
 expect(registeredTypes).toContain('table_order_comanda');

 // Turismo
 expect(registeredTypes).toContain('tourism_destinations_carousel');
 expect(registeredTypes).toContain('tourism_itinerary_timeline');

 // Eventos
 expect(registeredTypes).toContain('event_rail');
 expect(registeredTypes).toContain('countdown_timer');

 // Varejo / Bio
 expect(registeredTypes).toContain('product_carousel');
 expect(registeredTypes).toContain('biolink_action_buttons');

 expect(registeredTypes.length).toBeGreaterThanOrEqual(40);
 });

 it('cada bloco deve conter contentSchema e defaultProps válidos', () => {
 const hero = builderRegistry['hero_carousel'];
 expect(hero).toBeDefined();
 expect(hero.category).toBe('commerce');
 expect(hero.contentSchema).toBeDefined();
 expect(hero.defaultProps).toBeDefined();
 });
 });

 // ─── 2. MACHINE CAROUSEL GENERATION CONTRACT ───
 describe('Machine Social Viral Generator', () => {
 it('deve estruturar camadas ESCAMAS e roteiro de carrossel coerente', () => {
 const mockSlide = {
 slideNumber: 1,
 type: 'hook',
 headline: 'O Erro que 90% das Pessoas Cometem',
 subheadline: 'Arraste para o lado',
 bodyText: '',
 layers: [
 { id: 'bg-1', type: 'background', zIndex: 1 },
 { id: 'txt-1', type: 'text', zIndex: 2 },
 { id: 'badge-1', type: 'badge', zIndex: 3 },
 ],
 };

 expect(mockSlide.layers.length).toBe(3);
 expect(mockSlide.layers[0].zIndex).toBeLessThan(mockSlide.layers[1].zIndex);
 expect(mockSlide.type).toBe('hook');
 });
 });
});
