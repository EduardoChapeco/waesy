import { createClient } from "@supabase/supabase-js";

const url = "https://jfuebqmltksyznovhlwa.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || (() => { throw new Error("SUPABASE_SERVICE_ROLE_KEY is required"); })();
const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase
    .from("hotpages")
    .select("id, slug, title, target_route, template_type, cover_image_url")
    .order("sort_order");

  if (error) {
    console.error("DB Query error:", error);
    return;
  }

  console.log("Current hotpages in DB:");
  data.forEach(h => {
    console.log(`- [${h.id}] slug: "${h.slug}" | title: "${h.title}" | target_route: "${h.target_route}" | cover: ${h.cover_image_url ? "YES" : "null"}`);
  });
}

main();
