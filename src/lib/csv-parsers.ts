import type { TransactionSource } from "./types";

export interface ParsedTransaction {
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  category: string | null;
  check_number: string | null;
  memo: string | null;
  source: TransactionSource;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseMMDDYYYY(dateStr: string): string {
  const clean = dateStr.replace(/"/g, "");
  const [month, day, year] = clean.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function parseWellsFargoCSV(content: string): ParsedTransaction[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const transactions: ParsedTransaction[] = [];

  for (const line of lines) {
    const fields = parseCSVLine(line);
    if (fields.length < 5) continue;

    const [dateStr, amountStr, , checkNum, description] = fields;
    const date = parseMMDDYYYY(dateStr);
    const amount = parseFloat(amountStr);

    if (isNaN(amount)) continue;

    transactions.push({
      date,
      amount,
      description: description.trim(),
      category: null,
      check_number: checkNum?.trim() || null,
      memo: null,
      source: "wells_fargo",
    });
  }

  return transactions;
}

export function parseChaseCSV(content: string): ParsedTransaction[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Skip header row
  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 6) continue;

    const [transDateStr, , description, category, , amountStr, memo] = fields;
    const date = parseMMDDYYYY(transDateStr);
    const amount = parseFloat(amountStr);

    if (isNaN(amount)) continue;

    transactions.push({
      date,
      amount,
      description: description.trim(),
      category: category?.trim() || null,
      check_number: null,
      memo: memo?.trim() || null,
      source: "chase",
    });
  }

  return transactions;
}

export function parseCSV(
  content: string,
  source: TransactionSource
): ParsedTransaction[] {
  switch (source) {
    case "wells_fargo":
      return parseWellsFargoCSV(content);
    case "chase":
      return parseChaseCSV(content);
    default:
      throw new Error(`Unsupported source: ${source}`);
  }
}
