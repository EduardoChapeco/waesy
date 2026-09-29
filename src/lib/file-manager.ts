/**
 * File Manager & Batch Operations Domain Engine
 * 
 * Provides path safety verification, file taxonomy classification,
 * dry-run batch organization planning, collision-resistant renaming,
 * and canonical operational output formatting.
 * 
 * Reference: .agents/skills/file-manager/SKILL.md & docs/FILE_MANAGEMENT.md
 */

export type FileCategory =
  | 'Documents'
  | 'Images'
  | 'Videos'
  | 'Audio'
  | 'Archives'
  | 'Code'
  | 'Others';

export interface PathSafetyResult {
  isSafe: boolean;
  reason?: string;
}

export interface BatchMovePlanItem {
  sourceFile: string;
  targetFolder: string;
  category: FileCategory;
  extension: string;
  action: 'move' | 'skip';
  skipReason?: string;
}

export interface BatchOrganizationPlan {
  items: BatchMovePlanItem[];
  countsByCategory: Record<FileCategory, number>;
  totalMove: number;
  totalSkip: number;
}

export interface BulkRenameItem {
  originalName: string;
  newName: string;
  hasCollision: boolean;
}

export interface BulkRenamePlan {
  items: BulkRenameItem[];
  totalRenamed: number;
  hasCollisions: boolean;
}

export interface PostOperationResult {
  moved: number;
  skipped: number;
  errors: number;
  deleted?: number;
  created?: number;
}

const FORBIDDEN_SYSTEM_PATHS = [
  // Unix / Linux / macOS
  '/system',
  '/usr',
  '/bin',
  '/sbin',
  '/etc',
  '/dev',
  '/proc',
  '/sys',
  '/root',
  '/var/root',
  // Windows
  'c:\\windows',
  'c:\\program files',
  'c:\\program files (x86)',
  'c:\\system volume information',
  'c:\\recovery',
  'c:\\bootmgr',
];

const FORBIDDEN_FILE_PATTERNS = [
  /\.git([\\/]|$)/i,
  /^\.env(\.|$)/i,
  /\.(pem|key)$/i,
  /id_rsa/i,
];

/**
 * Validates whether a file or directory path is safe from forbidden system areas,
 * path traversal attacks (../), and sensitive repository secrets.
 */
export function validatePathSafety(targetPath: string): PathSafetyResult {
  if (!targetPath || typeof targetPath !== 'string' || targetPath.trim().length === 0) {
    return { isSafe: false, reason: 'Caminho não pode ser vazio.' };
  }

  const normalized = targetPath.replace(/\\/g, '/').trim();

  // Path traversal check
  if (normalized.includes('../') || normalized === '..' || targetPath.includes('..\\')) {
    return {
      isSafe: false,
      reason: 'Tentativa de path traversal detectada (sequência "../" não permitida).',
    };
  }

  const lower = normalized.toLowerCase();
  for (const forbidden of FORBIDDEN_SYSTEM_PATHS) {
    const normForbidden = forbidden.replace(/\\/g, '/').toLowerCase();
    if (lower.startsWith(normForbidden) || lower === normForbidden) {
      return {
        isSafe: false,
        reason: `Acesso proibido a diretório protegido do sistema: "${forbidden}".`,
      };
    }
  }

  // Check sensitive files
  const filename = normalized.split('/').pop() || '';
  for (const pattern of FORBIDDEN_FILE_PATTERNS) {
    if (pattern.test(filename) || pattern.test(normalized)) {
      return {
        isSafe: false,
        reason: `Operação proibida sobre arquivo crítico de repositório/segurança: "${filename}".`,
      };
    }
  }

  return { isSafe: true };
}

/**
 * Classifies a filename into its canonical folder category according to its file extension.
 */
export function categorizeFileByExtension(filename: string): FileCategory {
  const parts = filename.split('.');
  if (parts.length <= 1) {
    return 'Others';
  }

  const ext = (parts.pop() || '').toLowerCase();

  switch (ext) {
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
    case 'odt':
    case 'rtf':
    case 'xls':
    case 'xlsx':
    case 'csv':
    case 'ppt':
    case 'pptx':
    case 'epub':
      return 'Documents';

    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
    case 'bmp':
    case 'ico':
    case 'tiff':
    case 'heic':
      return 'Images';

    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
    case 'wmv':
    case 'flv':
    case 'webm':
    case 'm4v':
      return 'Videos';

    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
    case 'aac':
    case 'm4a':
    case 'wma':
      return 'Audio';

    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
    case 'bz2':
    case 'xz':
    case 'tgz':
      return 'Archives';

    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'json':
    case 'html':
    case 'css':
    case 'py':
    case 'sh':
    case 'sql':
    case 'yaml':
    case 'yml':
      return 'Code';

    default:
      return 'Others';
  }
}

/**
 * Plans a batch file organization into canonical categories (Dry-Run Generator).
 */
export function planBatchOrganization(filenames: string[]): BatchOrganizationPlan {
  const countsByCategory: Record<FileCategory, number> = {
    Documents: 0,
    Images: 0,
    Videos: 0,
    Audio: 0,
    Archives: 0,
    Code: 0,
    Others: 0,
  };

  const items: BatchMovePlanItem[] = [];
  let totalMove = 0;
  let totalSkip = 0;

  for (const file of filenames) {
    const category = categorizeFileByExtension(file);
    const parts = file.split('.');
    const ext = parts.length > 1 ? (parts.pop() || '').toLowerCase() : '';

    if (category === 'Others') {
      countsByCategory.Others++;
      totalSkip++;
      items.push({
        sourceFile: file,
        targetFolder: 'Others/',
        category: 'Others',
        extension: ext,
        action: 'skip',
        skipReason: 'unknown or rare file type',
      });
    } else {
      countsByCategory[category]++;
      totalMove++;
      items.push({
        sourceFile: file,
        targetFolder: `${category}/`,
        category,
        extension: ext,
        action: 'move',
      });
    }
  }

  return {
    items,
    countsByCategory,
    totalMove,
    totalSkip,
  };
}

/**
 * Plans a batch rename operation with pattern replacement and collision prevention.
 */
export function planBulkRename(
  filenames: string[],
  pattern: string | RegExp,
  replacement: string
): BulkRenamePlan {
  const items: BulkRenameItem[] = [];
  const allocatedNames = new Set<string>();
  let hasCollisions = false;

  for (const original of filenames) {
    const newName = original.replace(pattern, replacement);
    const isColliding = allocatedNames.has(newName) || (newName !== original && filenames.includes(newName));

    if (isColliding) {
      hasCollisions = true;
    }

    allocatedNames.add(newName);
    items.push({
      originalName: original,
      newName,
      hasCollision: isColliding,
    });
  }

  const totalRenamed = items.filter((i) => i.originalName !== i.newName && !i.hasCollision).length;

  return {
    items,
    totalRenamed,
    hasCollisions,
  };
}

/**
 * Formats canonical pre-operation preview text (Dry-Run Confirmation Manifesto).
 */
export function formatPreOperationPreview(plan: BatchOrganizationPlan): string {
  const lines: string[] = ['The following operations will be performed:'];

  if (plan.countsByCategory.Documents > 0) {
    lines.push(`- Move ${plan.countsByCategory.Documents} document files to Documents/`);
  }
  if (plan.countsByCategory.Images > 0) {
    lines.push(`- Move ${plan.countsByCategory.Images} image files to Images/`);
  }
  if (plan.countsByCategory.Videos > 0) {
    lines.push(`- Move ${plan.countsByCategory.Videos} video files to Videos/`);
  }
  if (plan.countsByCategory.Audio > 0) {
    lines.push(`- Move ${plan.countsByCategory.Audio} audio files to Audio/`);
  }
  if (plan.countsByCategory.Archives > 0) {
    lines.push(`- Move ${plan.countsByCategory.Archives} archive files to Archives/`);
  }
  if (plan.countsByCategory.Code > 0) {
    lines.push(`- Move ${plan.countsByCategory.Code} code files to Code/`);
  }
  if (plan.countsByCategory.Others > 0) {
    lines.push(`- Skip ${plan.countsByCategory.Others} files of unknown type`);
  }

  lines.push('');
  lines.push('Confirm?');

  return lines.join('\n');
}

/**
 * Formats canonical post-operation summary text.
 */
export function formatPostOperationSummary(result: PostOperationResult): string {
  const lines: string[] = ['✓ Complete'];

  lines.push(`  - Moved: ${result.moved} files`);
  lines.push(`  - Skipped: ${result.skipped} files`);
  lines.push(`  - Errors: ${result.errors}`);

  return lines.join('\n');
}
