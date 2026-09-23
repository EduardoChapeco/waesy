import { parseCnjNumber, harvestAndPersistDataJudProcess } from '../src/services/mining/datajud-harvester.js';

async function test() {
  console.log("=== TEST DATAJUD CNJ HARVESTER ===");

  // 1. Test parsing CNJ numbers
  const cnjSc = parseCnjNumber("0001234-56.2024.8.24.0018");
  console.log("Parsed SC CNJ:", {
    formatted: cnjSc.formatted,
    clean: cnjSc.clean,
    tribunalAcronym: cnjSc.tribunalAcronym,
    tribunalName: cnjSc.tribunalName,
    state: cnjSc.state,
  });

  const cnjSp = parseCnjNumber("1000123-45.2023.8.26.0100");
  console.log("Parsed SP CNJ:", {
    formatted: cnjSp.formatted,
    clean: cnjSp.clean,
    tribunalAcronym: cnjSp.tribunalAcronym,
    tribunalName: cnjSp.tribunalName,
    state: cnjSp.state,
  });

  // 2. Test harvesting and persisting into real DB
  console.log("\nHarvesting and persisting test lawsuit...");
  const result = await harvestAndPersistDataJudProcess({
    processNumber: "0001234-56.2024.8.24.0018",
  });

  console.log("Harvest Result:", {
    success: result.success,
    isNew: result.isNew,
    lawsuitId: result.lawsuit?.id,
    processNumber: result.lawsuit?.process_number,
    courtName: result.lawsuit?.court_name,
    status: result.lawsuit?.status,
    movementsCount: result.lawsuit?.movements?.length,
  });

  console.log("\n=== TEST CONCLUÍDO COM SUCESSO ===");
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
