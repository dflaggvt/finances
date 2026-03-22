import type { ParsedTransaction } from "./csv-parsers";

interface BillPattern {
  id: string;
  match_pattern: string;
  amount: number;
  household_id: string;
}

interface MatchResult {
  transactionIndex: number;
  billId: string;
  transactionAmount: number;
  currentBillAmount: number;
  transactionDate: string;
}

export function matchTransactionsToBills(
  transactions: ParsedTransaction[],
  bills: BillPattern[]
): MatchResult[] {
  const results: MatchResult[] = [];
  const billsWithPatterns = bills.filter((b) => b.match_pattern);

  for (let i = 0; i < transactions.length; i++) {
    const txn = transactions[i];
    const desc = txn.description.toLowerCase();
    // Use absolute value since credit card purchases are negative
    const txnAmount = Math.abs(txn.amount);

    for (const bill of billsWithPatterns) {
      const patterns = bill.match_pattern
        .split(",")
        .map((p) => p.trim().toLowerCase());

      const matched = patterns.some((pattern) => desc.includes(pattern));
      if (matched) {
        results.push({
          transactionIndex: i,
          billId: bill.id,
          transactionAmount: txnAmount,
          currentBillAmount: bill.amount,
          transactionDate: txn.date,
        });
        break; // One bill per transaction
      }
    }
  }

  return results;
}
