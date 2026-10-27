/**
 * @fileoverview crop-image.ts — Renderizador Físico de Imagens via Offscreen HTML5 Canvas.
 * 
 * Regra Mandatória: Zero-Drift.
 * O recorte NÃO salva apenas metadados ou coordenadas CSS flexíveis (object-position / transform).
 * Ele renderiza e grava pixel-a-pixel via Canvas a imagem final na proporção exata e dimensões
 * canônicas físicas de saída, eliminando qualquer dependência de reposicionamento CSS no frontend.
 */

export interface CanonicalDimensions {
  width: number;
  height: number;
}

export type TargetPlatform = "mobile" | "desktop" | "universal";

/**
 * Retorna as dimensões canônicas físicas de saída em pixels conforme a proporção e plataforma.
 */
export function getCanonicalDimensions(
  aspectRatio: number | undefined,
  targetPlatform: TargetPlatform = "universal"
): CanonicalDimensions {
  if (!aspectRatio) {
    return { width: 1200, height: 900 };
  }

  // 1. Banner Slim / iFood (28:9 ou 21:9)
  // Mobile: 1080x463px | Desktop: 1920x617px
  if (Math.abs(aspectRatio - 28 / 9) < 0.1 || Math.abs(aspectRatio - 21 / 9) < 0.1) {
    return targetPlatform === "mobile"
      ? { width: 1080, height: 463 }
      : { width: 1920, height: 617 };
  }

  // 2. Banner Clássico (16:9)
  // Mobile: 1080x608px | Desktop: 1920x1080px
  if (Math.abs(aspectRatio - 16 / 9) < 0.05) {
    return targetPlatform === "mobile"
      ? { width: 1080, height: 608 }
      : { width: 1920, height: 1080 };
  }

  // 3. Card / Capa (4:3) -> 1200x900px
  if (Math.abs(aspectRatio - 4 / 3) < 0.05) {
    return { width: 1200, height: 900 };
  }

  // 4. Quadrado (1:1) -> 1080x1080px
  if (Math.abs(aspectRatio - 1) < 0.05) {
    return { width: 1080, height: 1080 };
  }

  // 5. Stories / Retrato (9:16) -> 1080x1920px
  if (Math.abs(aspectRatio - 9 / 16) < 0.05) {
    return { width: 1080, height: 1920 };
  }

  // 6. Post Threads / Retrato Compacto (4:5) -> 1080x1350px
  if (Math.abs(aspectRatio - 4 / 5) < 0.05) {
    return { width: 1080, height: 1350 };
  }

  // 7. Capa de Loja Panorâmica (3:1)
  if (Math.abs(aspectRatio - 3) < 0.05) {
    return targetPlatform === "mobile"
      ? { width: 1080, height: 360 }
      : { width: 1920, height: 640 };
  }

  // Fallback proporcional de alta densidade
  const baseWidth = targetPlatform === "desktop" ? 1920 : 1080;
  return {
    width: baseWidth,
    height: Math.max(1, Math.round(baseWidth / aspectRatio)),
  };
}

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Renderiza o recorte de forma física e definitiva em um Offscreen HTML5 Canvas,
 * gerando um Blob binário (canvas.toBlob) com anti-aliasing e escala de alta fidelidade.
 */
export async function getCroppedCanvasBlob(
  imageSrc: string,
  pixelCrop: PixelCrop,
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  outputFormat: "image/png" | "image/webp" | "image/jpeg" = "image/png",
  canonicalDimensions?: CanonicalDimensions
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Não foi possível inicializar o contexto 2D do Canvas.");
  }

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.clearRect(0, 0, bBoxWidth, bBoxHeight);
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");

  if (!croppedCtx) {
    throw new Error("Não foi possível inicializar o Canvas final de recorte.");
  }

  // Dimensões físicas finais: usa as canônicas se fornecidas; caso contrário, as do recorte
  const outWidth = canonicalDimensions?.width || Math.round(pixelCrop.width);
  const outHeight = canonicalDimensions?.height || Math.round(pixelCrop.height);

  croppedCanvas.width = outWidth;
  croppedCanvas.height = outHeight;

  // Habilita interpolação bicúbica de alta qualidade para zero degradação de pixels
  croppedCtx.imageSmoothingEnabled = true;
  croppedCtx.imageSmoothingQuality = "high";
  croppedCtx.clearRect(0, 0, outWidth, outHeight);

  // Renderiza o corte diretamente nas dimensões físicas finais
  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outWidth,
    outHeight
  );

  return new Promise<Blob>((resolve, reject) => {
    croppedCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Falha ao gerar o Blob físico no Canvas."));
          return;
        }
        resolve(blob);
      },
      outputFormat,
      outputFormat === "image/jpeg" || outputFormat === "image/webp" ? 0.95 : undefined
    );
  });
}

/**
 * getCroppedImg — Retorna a representação Base64 do recorte pré-renderizado.
 * Mantém retrocompatibilidade total com chamadas existentes no ecossistema.
 */
export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  outputFormat: "image/png" | "image/webp" | "image/jpeg" = "image/png",
  minOutputWidth = 0,
  canonicalDimensions?: CanonicalDimensions
): Promise<string> {
  const blob = await getCroppedCanvasBlob(
    imageSrc,
    pixelCrop,
    rotation,
    flip,
    outputFormat,
    canonicalDimensions || (minOutputWidth > 0 ? { width: minOutputWidth, height: Math.round(minOutputWidth * (pixelCrop.height / pixelCrop.width)) } : undefined)
  );

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
