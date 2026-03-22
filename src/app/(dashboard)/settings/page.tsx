import { getSettings } from "./actions";
import { MatchingPromptEditor } from "@/components/settings/matching-prompt-editor";

const DEFAULT_PROMPT = `You are a financial transaction matcher. Given a list of transactions and a list of bills, determine which transactions correspond to which bills.

Rules:
- Match transactions to bills based on merchant name, description patterns, and amount similarity
- Consider common abbreviations (e.g., "CON ED" = "Con Edison", "JPMORGAN CHASE" = "Chase mortgage payment")
- A transaction can match at most one bill
- If the transaction amount differs from the bill amount, still match it — the bill amount may have changed
- Only match if you are reasonably confident
- For each match, include the transaction index, bill ID, and the transaction amount

Return a JSON array of matches.`;

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Transaction Matching</h2>
          <p className="text-sm text-muted-foreground">
            Customize the GPT-4o prompt used to match imported transactions to
            your bills. The system sends your bills and transactions to the LLM
            along with this prompt.
          </p>
        </div>

        <MatchingPromptEditor
          currentPrompt={settings?.matching_prompt || DEFAULT_PROMPT}
          defaultPrompt={DEFAULT_PROMPT}
        />
      </div>
    </div>
  );
}
