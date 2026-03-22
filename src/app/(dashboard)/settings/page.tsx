import { getSettings, updateMatchingPrompt, updateDiscoveryPrompt } from "./actions";
import { PromptEditor } from "@/components/settings/matching-prompt-editor";
import { DEFAULT_DISCOVERY_PROMPT } from "@/lib/llm-discovery";

const DEFAULT_MATCHING_PROMPT = `You are a financial transaction matcher. Given a list of transactions and a list of bills, determine which transactions correspond to which bills.

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
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Transaction Matching</h2>
          <p className="text-sm text-muted-foreground">
            Customize the GPT-4o prompt used to match imported transactions to
            your bills.
          </p>
        </div>

        <PromptEditor
          label="Matching System Prompt"
          currentPrompt={settings?.matching_prompt || DEFAULT_MATCHING_PROMPT}
          defaultPrompt={DEFAULT_MATCHING_PROMPT}
          onSave={updateMatchingPrompt}
        />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Bill Discovery</h2>
          <p className="text-sm text-muted-foreground">
            Customize the GPT-4o prompt used to identify recurring bills from
            your transactions.
          </p>
        </div>

        <PromptEditor
          label="Discovery System Prompt"
          currentPrompt={settings?.discovery_prompt || DEFAULT_DISCOVERY_PROMPT}
          defaultPrompt={DEFAULT_DISCOVERY_PROMPT}
          onSave={updateDiscoveryPrompt}
        />
      </div>
    </div>
  );
}
