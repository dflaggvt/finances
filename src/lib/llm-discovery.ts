import OpenAI from "openai";
import type { BillFrequency, BillCategory, BillType } from "./types";

interface TransactionForDiscovery {
  date: string;
  amount: number;
  description: string;
  category: string | null;
}

export interface DiscoveredBillRaw {
  name: string;
  amount: number;
  due_day: number;
  frequency: string;
  category: string;
  bill_type: string;
  match_pattern: string;
  confidence: number;
  sample_transactions: string[];
}

const VALID_FREQUENCIES: BillFrequency[] = [
  "monthly",
  "quarterly",
  "annual",
  "one_time",
];
const VALID_CATEGORIES: BillCategory[] = [
  "mortgage_rent",
  "car_payment",
  "insurance",
  "utilities",
  "groceries",
  "gas",
  "subscriptions",
  "taxes",
  "medical",
  "childcare",
  "other",
];
const VALID_BILL_TYPES: BillType[] = [
  "fixed",
  "variable",
  "subscription",
  "irregular",
];

export const DEFAULT_DISCOVERY_PROMPT = `You are a financial analyst. Analyze these bank transactions and identify recurring charges that appear to be bills, subscriptions, or regular payments.

Rules:
- Look for transactions from the same merchant or similar descriptions appearing multiple times
- Estimate the typical amount (use the most recent or most common amount)
- Estimate the day of month the charge typically occurs (1-31)
- Determine frequency: monthly, quarterly, annual, or one_time
- Categorize each into one of: mortgage_rent, car_payment, insurance, utilities, groceries, gas, subscriptions, taxes, medical, childcare, other
- Classify bill_type as: fixed (same amount each time), variable (amount varies), subscription (recurring digital service), irregular (unpredictable timing)
- Generate match_pattern as comma-separated lowercase keywords that would identify this merchant in future transactions
- Include 2-5 sample transaction descriptions that match this bill
- Only include charges that appear at least twice OR are clearly a recurring bill (like insurance, mortgage)
- Assign a confidence score from 0 to 1

Return a JSON object with a "bills" array containing the discovered bills.`;

export async function discoverBillsWithLLM(
  transactions: TransactionForDiscovery[],
  existingBillNames: string[],
  systemPrompt: string
): Promise<DiscoveredBillRaw[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  if (transactions.length === 0) return [];

  const openai = new OpenAI({ apiKey });

  const batchSize = 75;
  const allDiscovered: DiscoveredBillRaw[] = [];

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);

    const txnsList = batch
      .map(
        (t) =>
          `- ${t.date} | $${t.amount} | ${t.description}${t.category ? ` | ${t.category}` : ""}`
      )
      .join("\n");

    const existingList =
      existingBillNames.length > 0
        ? `\n\nDo NOT suggest bills that match these existing bill names: ${existingBillNames.join(", ")}`
        : "";

    const userMessage = `TRANSACTIONS:\n${txnsList}${existingList}\n\nReturn a JSON object with a "bills" array.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) continue;

      const parsed = JSON.parse(content);
      const bills: DiscoveredBillRaw[] = parsed.bills || [];
      allDiscovered.push(...bills);
    } catch (e) {
      console.error("LLM discovery error for batch:", e);
    }
  }

  // Merge duplicates across batches by normalized name
  const merged = mergeDuplicates(allDiscovered);

  // Validate and filter
  return merged
    .filter(
      (b) =>
        b.confidence >= 0.6 &&
        b.name &&
        b.amount > 0 &&
        b.due_day >= 1 &&
        b.due_day <= 31 &&
        VALID_FREQUENCIES.includes(b.frequency as BillFrequency) &&
        VALID_CATEGORIES.includes(b.category as BillCategory) &&
        VALID_BILL_TYPES.includes(b.bill_type as BillType)
    )
    .sort((a, b) => b.confidence - a.confidence);
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|co|corp|ltd)\b\.?/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeDuplicates(bills: DiscoveredBillRaw[]): DiscoveredBillRaw[] {
  const byName = new Map<string, DiscoveredBillRaw>();

  for (const bill of bills) {
    const key = normalizeName(bill.name);
    const existing = byName.get(key);

    if (!existing || bill.confidence > existing.confidence) {
      const merged = existing
        ? {
            ...bill,
            sample_transactions: [
              ...new Set([
                ...(existing.sample_transactions || []),
                ...(bill.sample_transactions || []),
              ]),
            ].slice(0, 5),
          }
        : bill;
      byName.set(key, merged);
    }
  }

  return Array.from(byName.values());
}
