/**
 * Social Content Miner Engine
 * Ported with 100% fidelity from proprietary social-content-miner v1.0
 */

import { fetchWithRetry, normalizeUrl } from './scraper-utils';
import { extractOpenGraph } from './continuous-crawler.engine';

export type SocialPlatform = 'instagram' | 'youtube' | 'tiktok' | 'facebook' | 'linkedin' | 'unknown';

export interface SocialParsedUrl {
  platform: SocialPlatform;
  type: 'profile' | 'post' | 'video' | 'channel' | 'company' | 'unknown';
  handleOrId?: string;
  originalUrl: string;
}

export interface SocialProfileMetadata {
  platform: SocialPlatform;
  handleOrId?: string;
  title?: string;
  description?: string;
  avatarUrl?: string;
  canonicalUrl: string;
}

export const SOCIAL_PATTERNS = {
  instagram: {
    profile: /instagram\.com\/([^\/\?#]+)\/?$/i,
    post: /instagram\.com\/p\/([^\/\?#]+)/i,
    reel: /instagram\.com\/reel\/([^\/\?#]+)/i,
  },
  youtube: {
    channel: /youtube\.com\/(?:c|channel|user|@)\/([^\/\?#]+)/i,
    video: /youtube\.com\/watch\?v=([^&#]+)/i,
    shorts: /youtube\.com\/shorts\/([^\/\?#]+)/i,
  },
  tiktok: {
    profile: /tiktok\.com\/@([^\/\?#]+)/i,
    video: /tiktok\.com\/@[^\/]+\/video\/(\d+)/i,
  },
  facebook: {
    page: /facebook\.com\/([^\/\?#]+)\/?$/i,
    post: /facebook\.com\/[^\/]+\/posts\/([^\/\?#]+)/i,
  },
  linkedin: {
    company: /linkedin\.com\/company\/([^\/\?#]+)/i,
    profile: /linkedin\.com\/in\/([^\/\?#]+)/i,
  },
};

export function identifySocialUrl(rawUrl: string): SocialParsedUrl {
  const url = normalizeUrl(rawUrl);

  for (const [platformKey, patterns] of Object.entries(SOCIAL_PATTERNS)) {
    const platform = platformKey as SocialPlatform;
    for (const [typeKey, regex] of Object.entries(patterns)) {
      const match = url.match(regex);
      if (match && match[1]) {
        return {
          platform,
          type: typeKey as SocialParsedUrl['type'],
          handleOrId: match[1],
          originalUrl: url,
        };
      }
    }
  }

  return {
    platform: 'unknown',
    type: 'unknown',
    originalUrl: url,
  };
}

export async function extractSocialMetadata(rawUrl: string): Promise<SocialProfileMetadata> {
  const parsed = identifySocialUrl(rawUrl);
  const normalized = normalizeUrl(rawUrl);

  try {
    const response = await fetchWithRetry(normalized, { method: 'GET' });
    if (response.ok) {
      const html = await response.text();
      const og = extractOpenGraph(html);

      return {
        platform: parsed.platform,
        handleOrId: parsed.handleOrId,
        title: og.title,
        description: og.description,
        avatarUrl: og.image,
        canonicalUrl: normalized,
      };
    }
  } catch (err) {
    console.warn(`[SocialMiner] Falha ao extrair metadados sociais de ${normalized}:`, err);
  }

  return {
    platform: parsed.platform,
    handleOrId: parsed.handleOrId,
    canonicalUrl: normalized,
  };
}
