import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env.local")) dotenv.config({ path: ".env.local" });
if (fs.existsSync(".env.secrets")) dotenv.config({ path: ".env.secrets" });
if (fs.existsSync(".env")) dotenv.config({ path: ".env" });

if (!process.env.VITE_SUPABASE_URL && process.env.SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = process.env.SUPABASE_URL;
}
if (!process.env.VITE_SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
}

import { harvestAndPersistPlaces } from "../src/services/mining/places-harvester";

async function run() {
  console.log("Executando harvestAndPersistPlaces para Chapecó...");
  const res = await harvestAndPersistPlaces({ query: "restaurante", city: "Chapecó", state: "SC" });
  console.log("Resultado:", {
    success: res.success,
    totalFound: res.totalFound,
    totalInserted: res.totalInserted,
    totalUpdated: res.totalUpdated,
    samplePlace: res.places?.[0] ? {
      name: res.places[0].businessName,
      cat: res.places[0].category,
      addr: res.places[0].address,
      coords: `${res.places[0].latitude}, ${res.places[0].longitude}`
    } : null
  });
}

run().catch(console.error);
