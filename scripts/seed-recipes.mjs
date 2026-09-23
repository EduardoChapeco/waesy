import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf-8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(
  env.SUPABASE_URL || env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY
);

function generateTitleHash(title) {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

async function main() {
  const { data: existing, count } = await supabase
    .from('mined_raw_extractions')
    .select('id', { count: 'exact' })
    .eq('content_type', 'receitas');

  if (count && count > 0) {
    console.log(`Already have ${count} recipes in mined_raw_extractions!`);
    return;
  }

  const recipes = [
    {
      content_type: 'receitas',
      source_url: 'https://panelaterapia.com/cuca-tradicional-alema-de-banana',
      source_domain: 'panelaterapia.com',
      source_name: 'Panelaterapia Regional',
      raw_title: 'Cuca Tradicional Alemã de Banana com Farofa Crocante',
      title_hash: generateTitleHash('Cuca Tradicional Alemã de Banana com Farofa Crocante'),
      raw_lead: 'A clássica cuca do sul do Brasil com massa macia amanteigada, rodelas de banana e farofinha crocante com canela.',
      raw_body_text: 'Receita artesanal perfeita para acompanhar o café da tarde ou chimarrão.',
      cover_image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
      type_metadata: {
        prep_time: '20 min',
        cook_time: '40 min',
        total_time: '1h',
        recipe_yield: '12 porções',
        category: 'Doces & Sobremesas',
        cuisine: 'Sulista / Alemã',
        ingredients: [
          '3 xícaras de farinha de trigo',
          '1 e 1/2 xícara de açúcar',
          '3 ovos caipiras',
          '1/2 xícara de leite morno',
          '3 colheres (sopa) de manteiga sem sal',
          '1 colher (sopa) de fermento químico',
          '4 bananas prata maduras fatiadas',
          'Farofa: 1 xícara de trigo, 1 xícara de açúcar, 2 colheres de manteiga e 1 colher (café) de canela em pó'
        ],
        instructions: [
          'Em uma tigela grande, bata os ovos com o açúcar e a manteiga até obter um creme esbranquiçado.',
          'Adicione o leite e a farinha de trigo peneirada aos poucos, misturando com uma espátula.',
          'Por último, incorpore delicadamente o fermento químico em pó.',
          'Despeje a massa em forma untada e enfarinhada (aproximadamente 25x35cm).',
          'Distribua as fatias de banana por cima de toda a massa.',
          'Prepare a farofa misturando trigo, açúcar, manteiga e canela com a ponta dos dedos até formar gruminhos.',
          'Espalhe a farofa generosamente sobre as bananas e leve ao forno pré-aquecido a 180°C por cerca de 40 minutos.'
        ]
      }
    },
    {
      content_type: 'receitas',
      source_url: 'https://tudogostoso.com.br/receita/costela-desmanchando-com-mandioca',
      source_domain: 'tudogostoso.com.br',
      source_name: 'Receitas Campeiras',
      raw_title: 'Costela Bovina na Pressão com Mandioca e Cheiro Verde',
      title_hash: generateTitleHash('Costela Bovina na Pressão com Mandioca e Cheiro Verde'),
      raw_lead: 'Costela macia que desmancha do osso cozida na panela de pressão com mandioca amarela e caldo encorpado.',
      raw_body_text: 'O prato símbolo do domingo em família, feito sem complicação.',
      cover_image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
      type_metadata: {
        prep_time: '15 min',
        cook_time: '50 min',
        total_time: '1h 05min',
        recipe_yield: '6 porções',
        category: 'Pratos Principais',
        cuisine: 'Brasileira Campeira',
        ingredients: [
          '1,5 kg de costela bovina cortada em pedaços médios',
          '800g de mandioca amarela descascada em toletes',
          '2 cebolas grandes picadas em rodelas',
          '4 dentes de alho amassados',
          '2 tomates maduros picados',
          '1 colher (sopa) de colorau',
          'Sal grosso e pimenta-do-reino a gosto',
          'Cheiro-verde picadinho a gosto'
        ],
        instructions: [
          'Tempere a costela com sal grosso, alho amassado e pimenta-do-reino.',
          'No fundo da panela de pressão, faça uma cama com as rodelas de cebola.',
          'Acomode os pedaços de costela por cima com a parte do osso voltada para baixo.',
          'Cubra com o tomate picado e o colorau (não precisa adicionar água, a cebola soltará líquido).',
          'Tampe a panela e cozinhe por 35 minutos após pegar pressão.',
          'Retire a pressão com cuidado, adicione os toletes de mandioca e um pouco de água fervente se necessário.',
          'Feche novamente e cozinhe por mais 15 minutos até a mandioca amaciar.',
          'Finalize com bastante cheiro-verde fresco e sirva com arroz branco.'
        ]
      }
    },
    {
      content_type: 'receitas',
      source_url: 'https://cybercook.com.br/risoto-linguica-colonial-alho-poro',
      source_domain: 'cybercook.com.br',
      source_name: 'CyberCook',
      raw_title: 'Risoto de Linguiça Colonial Defumada e Alho-Poró',
      title_hash: generateTitleHash('Risoto de Linguiça Colonial Defumada e Alho-Poró'),
      raw_lead: 'Cremosidade italiana com o sabor rústico e marcante da linguiça artesanal do oeste catarinense.',
      raw_body_text: 'Prato sofisticado e rápido para jantares especiais.',
      cover_image_url: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=1200&q=80',
      type_metadata: {
        prep_time: '10 min',
        cook_time: '25 min',
        total_time: '35 min',
        recipe_yield: '4 porções',
        category: 'Massas & Risotos',
        cuisine: 'Italiana Regional',
        ingredients: [
          '2 xícaras de arroz arbóreo',
          '350g de linguiça colonial defumada sem pele esfarelada',
          '1 talo de alho-poró fatiado finamente',
          '1 taça de vinho branco seco (150ml)',
          '1,2 litro de caldo de legumes fervente',
          '3 colheres (sopa) de manteiga gelada',
          '1 xícara de queijo parmesão ralado na hora',
          'Pimenta-do-reino moída a gosto'
        ],
        instructions: [
          'Em uma panela de fundo grosso, doure a linguiça colonial esfarelada em fogo médio até soltar a gordura natural.',
          'Acrescente o alho-poró e refogue por 2 minutos até murchar.',
          'Junte o arroz arbóreo e mexa bem por 1 minuto para nacarar os grãos.',
          'Despeje o vinho branco seco e mexa até evaporar quase todo o álcool.',
          'Vá adicionando o caldo de legumes fervente concha por concha, mexendo sem parar, até o arroz ficar al dente (cerca de 18 min).',
          'Desligue o fogo, adicione a manteiga gelada e o queijo parmesão ralado.',
          'Tampe por 2 minutos e sirva imediatamente bem cremoso.'
        ]
      }
    }
  ];

  const { error } = await supabase.from('mined_raw_extractions').insert(recipes);
  if (error) {
    console.error('Error inserting seed recipes:', error.message);
  } else {
    console.log(`Successfully inserted ${recipes.length} recipes into mined_raw_extractions!`);
  }
}

main().catch(console.error);
