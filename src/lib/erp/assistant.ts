import type { Row } from "./types";
import { isoDate } from "./format";
import { outstanding, weOwe } from "./register";

/**
 * Financial assistant: turns a sentence such as "আজ জমির মালিককে ৫ লাখ টাকা দিয়েছি" or
 * "Paid the landowner 5 lakh today" into a DRAFT register entry. It never posts anything:
 * the owner reviews, edits and approves the draft, and only then are the balances updated.
 * Rule-based and deterministic (no external model), so it cannot invent amounts or accounts.
 */

export type Draft = {
  itemId: string;
  txnType: "Increase" | "Settlement";
  amount: number;
  date: string;
  notes: string;
  direction: "paid" | "received";
  matchedLabel: string;
  confidence: "high" | "medium" | "low";
  explanation: string;
  warnings: string[];
};

export type ParseResult = { ok: true; draft: Draft } | { ok: false; error: string };

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

export function toLatinDigits(s: string): string {
  return s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

const UNITS: [RegExp, number][] = [
  [/^(কোটি|crore|crores|cr)$/i, 10_000_000],
  [/^(লাখ|লক্ষ|lakh|lakhs|lac|lacs)$/i, 100_000],
  [/^(হাজার|হাজা|hajar|hazar|thousand|k)$/i, 1_000],
];

/** Find the amount in BDT: "5 lakh", "৫ লাখ", "2.5 crore", "50,000 taka", "1200". */
export function extractAmount(text: string): number | null {
  const t = toLatinDigits(text).replace(/\d{4}-\d{2}-\d{2}/g, " ");
  const re =
    /(\d[\d,]*(?:\.\d+)?)\s*(কোটি|crores?|cr|লাখ|লক্ষ|lakhs?|lacs?|হাজার|hajar|hazar|thousand|k)?(?![a-z])/gi;
  let best: { value: number; score: number } | null = null;
  for (const m of t.matchAll(re)) {
    const base = Number((m[1] ?? "").replace(/,/g, ""));
    if (!Number.isFinite(base) || base <= 0) continue;
    const unit = m[2] ? (UNITS.find(([r]) => r.test(m[2] ?? ""))?.[1] ?? 1) : 1;
    const after = t
      .slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 12)
      .toLowerCase();
    const money = /^\s*(টাকা|taka|tk|bdt|৳)/.test(after) || (m[2] ? true : false);
    const score = (money ? 2 : 0) + (unit > 1 ? 1 : 0);
    if (!best || score > best.score) best = { value: base * unit, score };
  }
  return best ? best.value : null;
}

const OUT_WORDS = [
  "paid",
  "pay ",
  "gave",
  "give ",
  "sent",
  "repaid",
  "lent",
  "দিয়েছি",
  "দিলাম",
  "দিয়ে দিয়েছি",
  "পরিশোধ",
  "শোধ",
  "পাঠিয়েছি",
  "ধার দিয়েছি",
  "লোন দিয়েছি",
];
const IN_WORDS = [
  "received",
  "receive",
  "got ",
  "collected",
  "borrowed",
  "পেয়েছি",
  "পেলাম",
  "আদায়",
  "ফেরত পেয়েছি",
  "ধার নিয়েছি",
  "লোন নিয়েছি",
  "নিয়েছি",
];

function lastIndex(text: string, words: string[], bangla: boolean): number {
  const idx = words
    .map((w) => (bangla ? text.lastIndexOf(w) : text.indexOf(w)))
    .filter((i) => i >= 0);
  if (idx.length === 0) return -1;
  return bangla ? Math.max(...idx) : Math.min(...idx);
}

function direction(text: string): "paid" | "received" | null {
  const bangla = /[ঀ-৿]/.test(text);
  const o = lastIndex(text, OUT_WORDS, bangla);
  const i = lastIndex(text, IN_WORDS, bangla);
  if (o < 0 && i < 0) return null;
  if (i < 0) return "paid";
  if (o < 0) return "received";
  return bangla ? (o > i ? "paid" : "received") : o < i ? "paid" : "received";
}

/** Words that mean the same thing in English and Bangla, so either language finds the account. */
const ALIASES: string[][] = [
  ["landowner", "land owner", "জমির মালিক", "জমির মালিক", "জমিদাতা"],
  ["investor", "বিনিয়োগকারী"],
  ["bank", "ব্যাংক", "ব্যাঙ্ক"],
  ["credit card", "ক্রেডিট কার্ড", "card", "কার্ড"],
  ["brother", "ভাই"],
  ["friend", "বন্ধু"],
  ["tenant", "ভাড়াটিয়া"],
  ["supplier", "সরবরাহকারী", "সাপ্লায়ার"],
  ["loan", "ঋণ", "লোন"],
];

function keysFor(item: Row): string[] {
  const hay = `${item.party ?? ""} ${item.title ?? ""}`.toLowerCase();
  const keys = new Set<string>();
  // Names the owner added for matching, e.g. the Bangla spelling of an English party name.
  for (const a of String(item.partyAlias ?? "")
    .toLowerCase()
    .split(/[,;\n]+/)) {
    const k = a.trim();
    if (k.length >= 2) keys.add(k);
  }
  for (const tok of hay.split(/[^\p{L}\p{M}\p{N}]+/u)) if (tok.length >= 3) keys.add(tok);
  for (const group of ALIASES)
    if (group.some((g) => hay.includes(g))) group.forEach((g) => keys.add(g));
  // Generic words alone must not decide a match.
  for (const generic of [
    "the",
    "and",
    "for",
    "personal",
    "company",
    "loan",
    "ঋণ",
    "লোন",
    "payable",
    "receivable",
  ])
    keys.delete(generic);
  return [...keys];
}

function parseDate(text: string, today: string): string {
  const iso = /\d{4}-\d{2}-\d{2}/.exec(toLatinDigits(text));
  if (iso) return iso[0];
  const [y, m, d] = today.split("-").map(Number);
  const back = (n: number) => isoDate(new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) - n));
  if (/গতকাল|yesterday/i.test(text)) return back(1);
  return today;
}

export function parseEntry(input: string, items: Row[], txns: Row[], today: string): ParseResult {
  const text = toLatinDigits(input).trim().toLowerCase();
  if (!text)
    return {
      ok: false,
      error: "Type what happened, for example “Paid the landowner 5 lakh today”.",
    };

  const amount = extractAmount(input);
  if (amount === null)
    return {
      ok: false,
      error: "I could not find an amount. Include it, for example “5 lakh” or “৫০,০০০ টাকা”.",
    };
  const dir = direction(text);
  if (!dir)
    return {
      ok: false,
      error:
        "I could not tell whether you paid or received money. Use words like paid / received or দিয়েছি / পেয়েছি.",
    };

  const active = items.filter((i) => i.status !== "Closed");
  const scored = active
    .map((item) => {
      const hits = keysFor(item).filter((k) => text.includes(k));
      return { item, score: hits.reduce((s, k) => s + k.length, 0), hits };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const warnings: string[] = [];
  const top = scored[0];
  const tie = scored.length > 1 && scored[1] && scored[1].score === top?.score;
  if (tie)
    warnings.push(
      `More than one account matches (${scored
        .slice(0, 3)
        .map((s) => s.item.title)
        .join(", ")}). Check the account before approving.`,
    );
  if (!top)
    warnings.push(
      "No existing account matches. Choose the account, or create it in Accounts first.",
    );

  // Paying a liability settles it; paying a receivable/loan-given account lends more (and vice versa).
  const owe = top ? weOwe(top.item.kind) : false;
  const settles = top ? (dir === "paid" ? owe : !owe) : dir === "paid";
  const txnType: Draft["txnType"] = settles ? "Settlement" : "Increase";

  if (top && txnType === "Settlement") {
    const bal = outstanding(top.item, txns);
    if (amount > bal)
      warnings.push(
        `The amount is more than the outstanding balance of ${bal.toLocaleString("en-BD")}.`,
      );
  }

  const confidence: Draft["confidence"] = !top ? "low" : tie ? "medium" : "high";
  const who = top ? String(top.item.party ?? top.item.title) : "unmatched account";
  return {
    ok: true,
    draft: {
      itemId: top?.item.id ?? "",
      txnType,
      amount,
      date: parseDate(input, today),
      notes: input.trim(),
      direction: dir,
      matchedLabel: top ? `${top.item.title} · ${who}` : "",
      confidence,
      explanation: top
        ? `You ${dir} ${amount.toLocaleString("en-BD")} ${dir === "paid" ? "to" : "from"} ${who}; this ${txnType === "Settlement" ? "settles part of" : "adds to"} “${top.item.title}”.`
        : `You ${dir} ${amount.toLocaleString("en-BD")}. Pick the account this belongs to.`,
      warnings,
    },
  };
}
