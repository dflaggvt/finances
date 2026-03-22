"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updateMatchingPrompt } from "@/app/(dashboard)/settings/actions";

interface MatchingPromptEditorProps {
  currentPrompt: string;
  defaultPrompt: string;
}

export function MatchingPromptEditor({
  currentPrompt,
  defaultPrompt,
}: MatchingPromptEditorProps) {
  const [prompt, setPrompt] = useState(currentPrompt);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    const result = await updateMatchingPrompt(prompt);
    if (result.error) {
      setStatus("error");
    } else {
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    }
    setSaving(false);
  }

  function handleReset() {
    setPrompt(defaultPrompt);
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label htmlFor="matching-prompt">LLM System Prompt</Label>
          <textarea
            id="matching-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={12}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Prompt"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          {status === "saved" && (
            <span className="text-sm text-green-600">Saved!</span>
          )}
          {status === "error" && (
            <span className="text-sm text-destructive">Failed to save</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
