import type { BuilderAssetRef } from "@/lib/builder/asset-contract";

function safeUnsplashLink(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "unsplash.com" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function BuilderAssetCredits({ assets }: { assets?: BuilderAssetRef[] }) {
  const unsplashAssets = (assets ?? []).filter((asset) => asset.provider === "unsplash");
  const unique = new Map<string, BuilderAssetRef>();
  for (const asset of unsplashAssets) {
    const key = asset.source_asset_id || asset.asset_id;
    if (key) unique.set(key, asset);
  }
  const rows = [...unique.values()].flatMap((asset) => {
    const photoUrl = safeUnsplashLink(asset.source_page_url);
    const creatorUrl = safeUnsplashLink(asset.creator_profile_url);
    if (!photoUrl || !creatorUrl || !asset.creator) return [];
    return [{ asset, photoUrl, creatorUrl }];
  });

  if (rows.length === 0) return null;
  return (
    <div className="px-4 py-2 text-right text-xs leading-relaxed text-muted-foreground" aria-label="Créditos de imagens">
      {rows.map(({ asset, photoUrl, creatorUrl }) => (
        <span key={asset.asset_id} className="mr-2 inline-block">
          Foto por{" "}
          <a href={creatorUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            {asset.creator}
          </a>{" "}
          no{" "}
          <a href={photoUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            Unsplash
          </a>
        </span>
      ))}
    </div>
  );
}
