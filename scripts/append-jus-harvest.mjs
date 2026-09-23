import fs from 'fs';

const file = 'src/services/jus.functions.ts';
let content = fs.readFileSync(file, 'utf8');

const fnCode = `

/**
 * 22. Harvester DataJud CNJ: Mineração e sincronização de processo por número unificado CNJ
 */
export const harvestDataJudProcessFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      process_number: z.string().min(14, "Número de processo CNJ obrigatório"),
      store_id: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);

    const result = await harvestAndPersistDataJudProcess({
      processNumber: data.process_number,
      storeId: data.store_id,
      profileId: identity?.id,
    });

    if (!result.success) {
      throw new Error(result.error || "Falha ao minerar processo no DataJud");
    }

    return result;
  });
`;

fs.writeFileSync(file, content.trimEnd() + fnCode + '\n', 'utf8');
console.log('Appended harvestDataJudProcessFn successfully');
