/**
 * 🔊 Audio Chimes Engine — Sintetizador Nativo Web Audio API
 * 
 * Gera sons operacionais (Caixa Registradora, Novo Pedido, Notificação de Chat, Validação)
 * puramente via Web Audio API com envoltória ADSR e osciladores harmônicos.
 * Zero dependência de MP3 externos, 100% offline, imune a erros CORS ou 404.
 * 
 * Gerencia singleton de AudioContext para evitar vazamento de instâncias no navegador.
 */

let sharedAudioCtx: AudioContext | null = null;
let isAudioUnlocked = false;
let isMutedState = false;

// Recupera preferência de mudo salva localmente
if (typeof window !== "undefined") {
  try {
    isMutedState = localStorage.getItem("waesy_sound_muted") === "true";
  } catch {
    isMutedState = false;
  }
}

/**
 * Obtém ou inicializa o singleton de AudioContext.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      sharedAudioCtx = new AudioContextClass();
    }

    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }

    return sharedAudioCtx;
  } catch (err) {
    console.warn("[audio-chimes] Falha ao inicializar Web Audio Context:", err);
    return null;
  }
}

/**
 * Desbloqueia o contexto no primeiro gesto do usuário (requisito de autoplay dos navegadores).
 */
export function unlockAudioContext(): void {
  if (isAudioUnlocked) return;
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().then(() => {
      isAudioUnlocked = true;
    }).catch(() => {});
  } else if (ctx && ctx.state === "running") {
    isAudioUnlocked = true;
  }
}

// Escuta primeiro clique global para desbloquear silenciosamente
if (typeof window !== "undefined") {
  const handleFirstInteraction = () => {
    unlockAudioContext();
    window.removeEventListener("click", handleFirstInteraction);
    window.removeEventListener("keydown", handleFirstInteraction);
  };
  window.addEventListener("click", handleFirstInteraction, { once: true, passive: true });
  window.addEventListener("keydown", handleFirstInteraction, { once: true, passive: true });
}

/**
 * Ativa ou desativa os alertas sonoros globalmente.
 */
export function setSoundMuted(muted: boolean): void {
  isMutedState = muted;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("waesy_sound_muted", String(muted));
    } catch {}
  }
}

export function isSoundMuted(): boolean {
  return isMutedState;
}

// ─── Efeitos Sonoros Canônicos ───────────────────────────────────────────────

/**
 * 💰 Som de Caixa Registradora / Venda Finalizada (Cash Register Cha-Ching)
 * Acorde brilhante ascendente com timbre metálico e decaimento estendido.
 */
export function playCashRegisterSound(): void {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") return;

  try {
    const now = ctx.currentTime;

    // 1. Clique mecânico da gaveta (curto, tom grave)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = "triangle";
    clickOsc.frequency.setValueAtTime(140, now);
    clickOsc.frequency.exponentialRampToValueAtTime(40, now + 0.05);
    clickGain.gain.setValueAtTime(0.2, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.05);

    // 2. Sino brilhante 1 (Nota B5 ~ 987.77 Hz)
    const bell1Osc = ctx.createOscillator();
    const bell1Gain = ctx.createGain();
    bell1Osc.type = "sine";
    bell1Osc.frequency.setValueAtTime(987.77, now + 0.04);
    bell1Gain.gain.setValueAtTime(0.25, now + 0.04);
    bell1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    bell1Osc.connect(bell1Gain);
    bell1Gain.connect(ctx.destination);
    bell1Osc.start(now + 0.04);
    bell1Osc.stop(now + 0.45);

    // 3. Sino brilhante 2 (Nota E6 ~ 1318.51 Hz - harmônico de vitória)
    const bell2Osc = ctx.createOscillator();
    const bell2Gain = ctx.createGain();
    bell2Osc.type = "sine";
    bell2Osc.frequency.setValueAtTime(1318.51, now + 0.08);
    bell2Gain.gain.setValueAtTime(0.3, now + 0.08);
    bell2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    bell2Osc.connect(bell2Gain);
    bell2Gain.connect(ctx.destination);
    bell2Osc.start(now + 0.08);
    bell2Osc.stop(now + 0.6);
  } catch (err) {
    console.warn("[audio-chimes] Falha ao tocar som de caixa registradora:", err);
  }
}

/**
 * 🔔 Som de Novo Pedido Chegando (Gestor KDS / Cozinha / Delivery)
 * Sequência suave de dois tons amigáveis e perceptíveis em ambiente de balcão.
 */
export function playNewOrderAlert(): void {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") return;

  try {
    const now = ctx.currentTime;

    // Primeiro tom (D5: 587.33Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.28, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Segundo tom ascendente (A5: 880Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.14);
    gain2.gain.setValueAtTime(0.32, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.55);
  } catch (err) {
    console.warn("[audio-chimes] Falha ao tocar alerta de novo pedido:", err);
  }
}

/**
 * 💬 Som de Nova Mensagem de Atendimento (WhatsApp / Chat)
 */
export function playMessageChime(): void {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (err) {
    console.warn("[audio-chimes] Falha ao tocar chime de mensagem:", err);
  }
}

/**
 * ✅ Som de Validação / Check-in de Ingresso Sucesso
 */
export function playCheckinSuccessSound(): void {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1046.5, now); // C6
    osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.06); // E6
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (err) {
    console.warn("[audio-chimes] Falha ao tocar som de check-in:", err);
  }
}

/**
 * ⚠️ Som de Alerta / Cancelamento
 */
export function playWarningAlert(): void {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.2);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (err) {
    console.warn("[audio-chimes] Falha ao tocar alerta de aviso:", err);
  }
}
