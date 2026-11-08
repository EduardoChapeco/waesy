import { deflateRawSync } from "node:zlib";

export interface ZipFileEntry {
  path: string;
  content: string | Buffer | Uint8Array;
  isExecutable?: boolean;
}

/**
 * Tabela pré-computada para cálculo rápido de CRC-32 (ISO 3309 / ITU-T V.42).
 */
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

/**
 * Calcula o checksum CRC-32 de um buffer de dados.
 */
export function calculateCrc32(buffer: Uint8Array | Buffer): number {
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

/**
 * Compacta múltiplos arquivos em memória gerando um arquivo ZIP (.zip) compatível com PKZIP 2.0.
 * Suporta subpastas, nomes UTF-8 e compressão Deflate sem dependências externas.
 */
export function createZipArchive(files: ZipFileEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let relativeOffset = 0;

  for (const file of files) {
    const rawData = Buffer.isBuffer(file.content)
      ? file.content
      : Buffer.from(file.content);

    // Normaliza caminhos para separador padrão POSIX do ZIP
    const normalizedPath = file.path.replace(/\\/g, "/").replace(/^\/+/, "");
    const nameBuffer = Buffer.from(normalizedPath, "utf-8");
    const crc = calculateCrc32(rawData);

    // Compressão Deflate segura
    let compData: Buffer;
    let compMethod = 0; // 0 = Store (sem compressão)

    if (rawData.length > 0) {
      try {
        const deflated = deflateRawSync(rawData);
        if (deflated.length < rawData.length) {
          compData = deflated;
          compMethod = 8; // 8 = Deflate
        } else {
          compData = rawData;
        }
      } catch {
        compData = rawData;
      }
    } else {
      compData = rawData;
    }

    // 1. Cabeçalho Local do Arquivo (Local File Header - 30 bytes + tamanho do nome)
    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Assinatura mágica
    localHeader.writeUInt16LE(20, 4); // Versão mínima necessária (2.0)
    localHeader.writeUInt16LE(0x0800, 6); // Flags: Bit 11 ativo = nomes e comentários em UTF-8
    localHeader.writeUInt16LE(compMethod, 8); // Método de compressão
    localHeader.writeUInt16LE(0, 10); // Horário de modificação padrão
    localHeader.writeUInt16LE(0x5221, 12); // Data de modificação padrão
    localHeader.writeUInt32LE(crc, 14); // Checksum CRC-32
    localHeader.writeUInt32LE(compData.length, 18); // Tamanho compactado
    localHeader.writeUInt32LE(rawData.length, 22); // Tamanho original descompactado
    localHeader.writeUInt16LE(nameBuffer.length, 26); // Tamanho do nome do arquivo
    localHeader.writeUInt16LE(0, 28); // Campo extra (0)
    nameBuffer.copy(localHeader, 30);

    localHeaders.push(localHeader, compData);

    // Permissões UNIX: 0644 para arquivos normais ou 0755 para executáveis/scripts
    const unixPermissions = file.isExecutable ? 0o100755 : 0o100644;
    const externalAttributes = (unixPermissions * 65536) >>> 0;

    // 2. Cabeçalho do Diretório Central (Central Directory Header - 46 bytes + tamanho do nome)
    const centralHeader = Buffer.alloc(46 + nameBuffer.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Assinatura mágica
    centralHeader.writeUInt16LE(20, 4); // Versão criada por
    centralHeader.writeUInt16LE(20, 6); // Versão necessária para descompactar
    centralHeader.writeUInt16LE(0x0800, 8); // Flags UTF-8
    centralHeader.writeUInt16LE(compMethod, 10); // Método de compressão
    centralHeader.writeUInt16LE(0, 12); // Horário
    centralHeader.writeUInt16LE(0x5221, 14); // Data
    centralHeader.writeUInt32LE(crc, 16); // Checksum CRC-32
    centralHeader.writeUInt32LE(compData.length, 20); // Tamanho compactado
    centralHeader.writeUInt32LE(rawData.length, 24); // Tamanho descompactado
    centralHeader.writeUInt16LE(nameBuffer.length, 28); // Tamanho do nome
    centralHeader.writeUInt16LE(0, 30); // Campo extra (0)
    centralHeader.writeUInt16LE(0, 32); // Comentário do arquivo (0)
    centralHeader.writeUInt16LE(0, 34); // Número do disco (0)
    centralHeader.writeUInt16LE(0, 36); // Atributos internos (0)
    centralHeader.writeUInt32LE(externalAttributes, 38); // Atributos externos UNIX
    centralHeader.writeUInt32LE(relativeOffset, 42); // Offset do cabeçalho local
    nameBuffer.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);
    relativeOffset += localHeader.length + compData.length;
  }

  const centralDirectoryOffset = relativeOffset;
  let centralDirectorySize = 0;
  for (const ch of centralHeaders) {
    centralDirectorySize += ch.length;
  }

  // 3. Fim do Diretório Central (End of Central Directory Record - 22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // Assinatura mágica EOCD
  eocd.writeUInt16LE(0, 4); // Número deste disco
  eocd.writeUInt16LE(0, 6); // Disco com início do diretório central
  eocd.writeUInt16LE(files.length, 8); // Número de entradas neste disco
  eocd.writeUInt16LE(files.length, 10); // Total de entradas no diretório central
  eocd.writeUInt32LE(centralDirectorySize, 12); // Tamanho do diretório central
  eocd.writeUInt32LE(centralDirectoryOffset, 16); // Offset de início do diretório central
  eocd.writeUInt16LE(0, 20); // Tamanho do comentário do arquivo ZIP (0)

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}
