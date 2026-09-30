import postgres from "postgres";

const sql = postgres({
  host: "aws-0-sa-east-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  username: "postgres.jfuebqmltksyznovhlwa",
  password: "EEaR6399!@#2026",
  ssl: "require",
  max: 1,
});

async function main() {
  const buckets = await sql`SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'post-media'`;
  console.log("Bucket post-media current config:", buckets);

  // Ensure bucket exists, is public, has reasonable size limit (50MB for video/gif), and accepts videos and images
  await sql`
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'post-media',
      'post-media',
      true,
      52428800, -- 50MB
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = 52428800,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];
  `;

  console.log("Bucket post-media updated with video and image mime-types!");

  const updated = await sql`SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'post-media'`;
  console.log("Bucket updated config:", updated);

  await sql.end();
}

main().catch(console.error);
