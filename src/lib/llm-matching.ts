import OpenAI from "openai";

interface TransactionForMatching {
  index: number;
  date: string;
  amount: number;
  description: string;
  category: string | null;
}

interface BillForMatching {
  id: string;
  name: string;
  amount: number;
  category: string;
  match_pattern: string | null;
}

export interface LLMMatch {
  transactionIndex: number;
  billId: string;
  confidence: number;
}

export async function matchWithLLM(
  transactions: TransactionForMatching[],
  bills: BillForMatching[],
  systemPrompt: string
): Promise<LLMMatch[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  if (bills.length === 0 || transactions.length === 0) {
    return [];
  }

  const openai = new OpenAI({ apiKey });

  const billsList = bills
    .map(
      (b) =>
        `- ID: ${b.id} | Name: ${b.name} | Amount: $${b.amount} | Category: ${b.category}${b.match_pattern ? ` | Keywords: ${b.match_pattern}` : ""}`
    )
    .join("\n");

  const txnsList = transactions
    .map(
      (t) =>
        `- Index: ${t.index} | Date: ${t.date} | Amount: $${t.amount} | Description: ${t.description}${t.category ? ` | Category: ${t.category}` : ""}`
    )
    .join("\n");

  const userMessage = `BILLS:\n${billsList}\n\nTRANSACTIONS:\n${txnsList}\n\nReturn a JSON array of matches. Each match should have: transactionIndex (number), billId (string), confidence (number 0-1). Only include matches with confidence >= 0.7.`;

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
  if (!content) return [];

  const parsed = JSON.parse(content);
  const matches: LLMMatch[] = Array.isArray(parsed)
    ? parsed
    : parsed.matches || [];

  // Validate and filter
  return matches.filter(
    (m) =>
      typeof m.transactionIndex === "number" &&
      typeof m.billId === "string" &&
      typeof m.confidence === "number" &&
      m.confidence >= 0.7 &&
      bills.some((b) => b.id === m.billId) &&
      transactions.some((t) => t.index === m.transactionIndex)
  );
}
