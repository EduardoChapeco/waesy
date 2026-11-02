-- Permite que itens da Home do CMS utilizem ícones vetoriais com image_url nula
ALTER TABLE public.home_section_items ALTER COLUMN image_url DROP NOT NULL;
UPDATE public.home_page_sections SET layout_variant = 'grid_2d' WHERE section_key = 'quick_categories_ifood';
