import { createClient } from "@supabase/supabase-js";

const url = "https://jfuebqmltksyznovhlwa.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || (() => { throw new Error("SUPABASE_SERVICE_ROLE_KEY is required"); })();
const supabase = createClient(url, key);

async function clean() {
  const { data, error } = await supabase
    .from("hotpages")
    .select("id, slug, target_route")
    .eq("target_route", "null");

  if (error) {
    console.error("Error finding hotpages with target_route 'null':", error);
    return;
  }

  console.log(`Found ${data.length} hotpages with literal string "null"`);

  for (const item of data) {
    const { error: updateErr } = await supabase
      .from("hotpages")
      .update({ target_route: null })
      .eq("id", item.id);

    if (updateErr) {
      console.error(`Failed to update ${item.slug}:`, updateErr);
    } else {
      console.log(`Cleaned ${item.slug} -> target_route: null`);
    }
  }

  console.log("Database cleanup finished!");
}

clean();
