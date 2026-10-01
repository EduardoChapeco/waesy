import fs from 'node:fs';

const prompts = JSON.parse(fs.readFileSync('scripts/last_user_prompts.json', 'utf8'));
console.log('Total prompts:', prompts.length);
for (let i = 60; i < prompts.length; i++) {
  const p = prompts[i];
  const content = p.content || '';
  const cleaned = content.replace(/<USER_REQUEST>|<\/USER_REQUEST>/g, '').trim().replace(/\r?\n/g, ' ');
  const preview = cleaned.slice(0, 160);
  console.log(`Prompt #${p.num} [step: ${p.step_index}] (${p.created_at}): ${preview}`);
}
