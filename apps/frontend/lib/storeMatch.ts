/**
 * Genel Arşiv toplu yükleme — dosya adını mağaza adı/koduyla eşleştirme.
 * Sunucuya gitmez, tamamen istemci tarafında çalışır (mağaza listesi bir kez
 * çekilip index'lenir, ardından her yüklenen dosya için skorlanır).
 */
import type { Store } from "@/services/stores";

export type MatchTier = "high" | "medium" | "none";

export type StoreMatch = {
  store: Store | null;
  score: number;
  tier: MatchTier;
};

export type IndexedStore = {
  store: Store;
  nameNorm: string;
  nameTokens: string[];
  nameCompact: string;
  codeNorm: string;
};

const TR_FOLD: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", i: "i", ö: "o", ş: "s", ü: "u",
};

// NFD sonrası kalan birleşik aksan işaretleri (U+0300–U+036F). Kaynak dosyaya
// görünmez/birleşik karakter gömülmemesi için aralık, kod noktalarından
// (String.fromCharCode) üretilir.
const DIACRITIC_MARKS_RE = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  "g",
);

/** Türkçe karakter, büyük/küçük harf, boşluk/tire/alt çizgi ve uzantı farklarını normalize eder. */
export function normalizeForMatch(input: string): string {
  const lowered = input.toLocaleLowerCase("tr-TR");
  const folded = lowered.replace(/[çğıiöşü]/g, (ch) => TR_FOLD[ch] ?? ch);
  return folded
    .normalize("NFD")
    .replace(DIACRITIC_MARKS_RE, "")
    .replace(/\.[a-z0-9]{2,5}$/i, "") // dosya uzantısını at
    .replace(/[-_]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(norm: string): string[] {
  return norm.split(" ").filter((t) => t.length > 1);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp: number[] = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prevDiag = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prevDiag
        : 1 + Math.min(dp[j], dp[j - 1], prevDiag);
      prevDiag = temp;
    }
  }
  return dp[b.length];
}

function similarityRatio(a: string, b: string): number {
  if (!a.length && !b.length) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

/** Mağaza listesini bir kez normalize edip index'ler — her dosya için tekrar hesaplanmasın diye. */
export function buildStoreIndex(stores: Store[]): IndexedStore[] {
  return stores.map((store) => {
    const nameNorm = normalizeForMatch(store.name);
    return {
      store,
      nameNorm,
      nameTokens: tokenize(nameNorm),
      nameCompact: nameNorm.replace(/ /g, ""),
      codeNorm: store.project_no ? normalizeForMatch(store.project_no).replace(/ /g, "") : "",
    };
  });
}

function scoreStore(fileNorm: string, fileTokens: string[], fileCompact: string, entry: IndexedStore): number {
  let score = 0;

  // 1) Mağaza kodu dosya adında geçiyor mu — en güçlü sinyal.
  if (entry.codeNorm.length >= 3 && fileCompact.includes(entry.codeNorm)) {
    score = Math.max(score, 0.9);
  }

  // 2) Mağaza adının tamamı dosya adı içinde bitişik geçiyor mu.
  if (entry.nameCompact.length >= 4 && fileCompact.includes(entry.nameCompact)) {
    score = Math.max(score, 0.95);
  }

  // 3) Kelime örtüşmesi (mağaza adındaki kelimelerin kaçı dosya adında var).
  if (entry.nameTokens.length > 0) {
    const matched = entry.nameTokens.filter((t) => fileTokens.includes(t) || fileCompact.includes(t));
    score = Math.max(score, (matched.length / entry.nameTokens.length) * 0.85);
  }

  // 4) Genel yazım benzerliği (typo toleransı) — zayıf bir taban sinyal.
  score = Math.max(score, similarityRatio(fileNorm, entry.nameNorm) * 0.6);

  return Math.min(1, score);
}

/** Verilen dosya adı için en iyi mağaza eşleşmesini döner. Eşleşme net değilse store: null (tier: "none"). */
export function findBestStoreMatch(fileName: string, index: IndexedStore[]): StoreMatch {
  const fileNorm = normalizeForMatch(fileName);
  const fileTokens = tokenize(fileNorm);
  const fileCompact = fileNorm.replace(/ /g, "");

  let best: IndexedStore | null = null;
  let bestScore = 0;
  for (const entry of index) {
    const s = scoreStore(fileNorm, fileTokens, fileCompact, entry);
    if (s > bestScore) {
      bestScore = s;
      best = entry;
    }
  }

  const tier: MatchTier = bestScore >= 0.7 ? "high" : bestScore >= 0.45 ? "medium" : "none";
  return { store: tier === "none" ? null : best?.store ?? null, score: bestScore, tier };
}
