"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, KeyRound, Sparkles, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api, type Id } from "@/lib/convexGenerated";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

type SettingsAutomationTabProps = {
  churchId: Id<"churches"> | null;
};

export function SettingsAutomationTab({ churchId }: SettingsAutomationTabProps) {
  const church = useQuery(api.churches.getChurch, churchId ? { churchId } : "skip");
  const funds = useQuery(api.funds.getFunds, churchId ? { churchId } : "skip");
  const since = useMemo(() => Date.now() - 30 * 24 * 60 * 60 * 1000, []);
  const aiUsage = useQuery(
    api.ai.getUsageSummary,
    churchId
      ? {
          churchId,
          since,
        }
      : "skip"
  );

  const setDefaultFund = useMutation(api.churches.setDefaultFund);
  const updateAutoApproveThreshold = useMutation(api.churches.setAutoApproveThreshold);
  const updateImportsAllowAi = useMutation(api.churches.setImportsAllowAi);
  const updateAiApiKey = useMutation(api.churches.updateAiApiKey);
  const seedAllCategories = useMutation(api.seedCategories.seedAllCategories);

  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(95);
  const [enableAI, setEnableAI] = useState(true);
  const [hasAiKey, setHasAiKey] = useState(false);
  const [aiKeyInput, setAiKeyInput] = useState("");
  const [saving, setSaving] = useState<"fund" | "threshold" | "ai" | "categories" | null>(null);
  const [savingAiKey, setSavingAiKey] = useState<"save" | "remove" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Initialize state from church settings only once when church data loads or changes
  useEffect(() => {
    if (!church?.settings) {
      return;
    }

    setSelectedFundId(church.settings.defaultFundId || "");
    setAutoApproveThreshold(Math.round((church.settings.autoApproveThreshold || 0.95) * 100));
    setEnableAI(church.settings.importsAllowAi ?? church.settings.enableAiCategorization ?? true);
    setHasAiKey(Boolean(church.settings.aiApiKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [church?._id]); // Only re-run when church ID changes, not on every settings update

  useEffect(() => {
    setAiKeyInput("");
  }, [churchId]);

  if (!churchId) {
    return (
      <Card className="border-ledger bg-paper shadow-none">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-ink">Select a church</CardTitle>
          <CardDescription className="text-grey-mid">
            Choose a church from the selector above to configure import automation settings.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleSaveDefaultFund = async () => {
    if (!churchId || !selectedFundId) return;

    setSaving("fund");
    setFeedback(null);

    try {
      await setDefaultFund({
        churchId,
        fundId: selectedFundId as Id<"funds">,
      });
      setFeedback("Default fund saved successfully");
    } catch (error) {
      console.error("Failed to save default fund:", error);
      setFeedback("Failed to save default fund");
    } finally {
      setSaving(null);
    }
  };

  const handleSaveThreshold = async () => {
    if (!churchId || !church) return;

    setSaving("threshold");
    setFeedback(null);

    try {
      await updateAutoApproveThreshold({
        churchId,
        threshold: autoApproveThreshold / 100,
      });
      setFeedback(`Auto-approve threshold updated to ${autoApproveThreshold}%`);
    } catch (error) {
      console.error("Failed to save threshold:", error);
      setFeedback("Failed to save threshold");
    } finally {
      setSaving(null);
    }
  };

  const handleToggleAI = async () => {
    if (!churchId || !church) return;

    const newValue = !enableAI;
    if (newValue && !hasAiKey && !aiKeyInput.trim()) {
      setFeedback("Add a DeepSeek API key before enabling AI categorisation.");
      return;
    }

    setSaving("ai");
    setFeedback(null);

    try {
      await updateImportsAllowAi({
        churchId,
        enabled: newValue,
      });
      setEnableAI(newValue);
      setFeedback(`AI categorization ${newValue ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Failed to toggle AI:", error);
      setFeedback("Failed to update AI settings");
    } finally {
      setSaving(null);
    }
  };

  const handleSaveApiKey = async () => {
    if (!churchId) return;

    const trimmed = aiKeyInput.trim();
    if (!trimmed) {
      setFeedback("Enter a valid API key before saving.");
      return;
    }

    setSavingAiKey("save");
    setFeedback(null);

    try {
      await updateAiApiKey({
        churchId,
        apiKey: trimmed,
      });
      setHasAiKey(true);
      setAiKeyInput("");
      setFeedback("AI API key saved successfully");
    } catch (error) {
      console.error("Failed to save AI API key:", error);
      setFeedback("Failed to save AI API key");
    } finally {
      setSavingAiKey(null);
    }
  };

  const handleRemoveApiKey = async () => {
    if (!churchId) return;

    setSavingAiKey("remove");
    setFeedback(null);

    try {
      await updateAiApiKey({
        churchId,
        apiKey: "",
      });
      setHasAiKey(false);
      setFeedback("AI API key removed");
    } catch (error) {
      console.error("Failed to remove AI API key:", error);
      setFeedback("Failed to remove AI API key");
    } finally {
      setSavingAiKey(null);
    }
  };

  const handleSeedCategories = async () => {
    if (!churchId) return;

    setSaving("categories");
    setFeedback(null);

    try {
      const result = await seedAllCategories({ churchId });
      setFeedback(
        `Successfully loaded ${
          result.income.mainCategories + result.expense.mainCategories
        } main categories, ${
          result.income.subcategories + result.expense.subcategories
        } subcategories, and ${
          result.income.keywords + result.expense.keywords
        } keywords.`
      );
    } catch (error) {
      console.error("Failed to seed categories:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setFeedback(`Failed to load categories: ${errorMessage}`);
    } finally {
      setSaving(null);
    }
  };

  const defaultFund = funds?.find((fund) => fund._id === church?.settings.defaultFundId);

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {feedback}
        </div>
      )}

      <Card className="border-ledger bg-paper shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-ink">
            <Target className="h-5 w-5" />
            Default Fund Assignment
          </CardTitle>
          <CardDescription className="text-grey-mid">
            Automatically assign all imported transactions to this fund. You can override individual
            transactions during review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-grey-mid">Default fund</label>
            <Select value={selectedFundId} onValueChange={setSelectedFundId}>
              <SelectTrigger className="font-primary border-ledger">
                <SelectValue placeholder="Select a fund" />
              </SelectTrigger>
              <SelectContent className="font-primary">
                {funds?.map((fund) => (
                  <SelectItem key={fund._id} value={fund._id}>
                    {fund.name} ({fund.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {defaultFund && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-grey-mid">Current default:</span>
              <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
                {defaultFund.name}
              </Badge>
            </div>
          )}

          <Button
            onClick={handleSaveDefaultFund}
            disabled={!selectedFundId || saving === "fund"}
            className="bg-ink text-paper hover:bg-ink/90"
          >
            {saving === "fund" ? "Saving..." : "Save Default Fund"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-ledger bg-paper shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-ink">
            <Sparkles className="h-5 w-5" />
            Auto-Approval Threshold
          </CardTitle>
          <CardDescription className="text-grey-mid">
            Automatically approve transactions with confidence scores above this threshold. Higher values
            mean stricter approval criteria.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-grey-mid">Confidence threshold</label>
              <span className="font-mono text-2xl font-bold text-ink">{autoApproveThreshold}%</span>
            </div>

            <input
              type="range"
              min="70"
              max="100"
              step="5"
              value={autoApproveThreshold}
              onChange={(event) => setAutoApproveThreshold(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-ledger accent-ink"
            />

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <div className="font-medium text-ink">95-100%</div>
                <div className="text-grey-mid">Only perfect matches</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-ink">80-94%</div>
                <div className="text-grey-mid">Most keyword matches</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-ink">70-79%</div>
                <div className="text-grey-mid">Include AI suggestions</div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSaveThreshold}
            disabled={saving === "threshold"}
            className="bg-ink text-paper hover:bg-ink/90"
          >
            {saving === "threshold" ? "Saving..." : "Save Threshold"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-ledger bg-paper shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-ink">
            <Sparkles className="h-5 w-5" />
            AI Categorization
          </CardTitle>
          <CardDescription className="text-grey-mid">
            Use DeepSeek AI to automatically categorize transactions when keyword matching fails.
            This service costs approximately £0.001 per transaction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-ledger bg-paper p-4">
            <div className="space-y-1">
              <div className="font-medium text-ink">AI categorization</div>
              <div className="text-sm text-grey-mid">
                {enableAI
                  ? "Enabled - transactions use AI when keywords don't match"
                  : "Disabled - only keyword matching will be used"}
              </div>
            </div>
            <Button
              variant={enableAI ? "default" : "outline"}
              onClick={handleToggleAI}
              disabled={saving === "ai"}
              className={
                enableAI
                  ? "bg-success text-white hover:bg-success/90"
                  : "border-ledger text-ink hover:bg-highlight"
              }
            >
              {saving === "ai" ? "Updating..." : enableAI ? "Enabled" : "Disabled"}
            </Button>
          </div>

          {enableAI && !hasAiKey && !aiKeyInput.trim() ? (
            <div className="flex items-center gap-2 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
              <AlertTriangle className="h-4 w-4" />
              <span>Add a DeepSeek API key to activate AI categorisation for imports.</span>
            </div>
          ) : null}

          <div className="space-y-3 rounded-md border border-ledger bg-paper p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-medium text-ink">
                  <KeyRound className="h-4 w-4" />
                  DeepSeek API key
                </div>
                <div className="text-sm text-grey-mid">
                  {hasAiKey
                    ? "Key stored securely. Enter a new key to replace it."
                    : "No key saved yet."}
                </div>
              </div>
              <Badge
                variant={hasAiKey ? "outline" : "secondary"}
                className={
                  hasAiKey
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-error/30 bg-error/10 text-error"
                }
              >
                {hasAiKey ? "Configured" : "Missing"}
              </Badge>
            </div>

            <Input
              type="password"
              placeholder={hasAiKey ? "Enter new key to replace existing" : "sk-..."}
              value={aiKeyInput}
              onChange={(event) => setAiKeyInput(event.target.value)}
              className="font-mono"
            />

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSaveApiKey}
                disabled={savingAiKey === "save" || !aiKeyInput.trim()}
                className="bg-ink text-paper hover:bg-ink/90"
              >
                {savingAiKey === "save" ? "Saving..." : hasAiKey ? "Update key" : "Save key"}
              </Button>
              {hasAiKey ? (
                <Button
                  variant="outline"
                  onClick={handleRemoveApiKey}
                  disabled={savingAiKey === "remove"}
                  className="border-ledger"
                >
                  {savingAiKey === "remove" ? "Removing..." : "Remove key"}
                </Button>
              ) : null}
            </div>
          </div>

          {aiUsage && (
            <div className="space-y-2 rounded-md border border-ledger bg-highlight/20 p-4">
              <div className="font-medium text-ink">Usage this month</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-grey-mid">AI calls</div>
                  <div className="font-mono text-lg font-bold text-ink">{aiUsage.calls}</div>
                </div>
                <div>
                  <div className="text-grey-mid">Tokens used</div>
                  <div className="font-mono text-lg font-bold text-ink">
                    {aiUsage.totalTokens.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-grey-mid">Cost</div>
                  <div className="font-mono text-lg font-bold text-ink">
                    {currency.format(aiUsage.cost)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-ledger bg-paper shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-ink">
            <Sparkles className="h-5 w-5" />
            Category Setup
          </CardTitle>
          <CardDescription className="text-grey-mid">
            Load pre-configured income and expense categories with keywords for automatic
            transaction categorization. This is a one-time setup for new churches.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-md border border-ledger bg-highlight/20 p-4">
            <div className="font-medium text-ink">What will be loaded:</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="font-medium text-success">Income Categories (4)</div>
                <ul className="space-y-1 text-grey-mid pl-4">
                  <li>• Donations (Tithe, Offering, Thanksgiving)</li>
                  <li>• Building Fund</li>
                  <li>• Charitable Activities</li>
                  <li>• Other Income</li>
                </ul>
              </div>
              <div className="space-y-2">
                <div className="font-medium text-error">Expense Categories (6)</div>
                <ul className="space-y-1 text-grey-mid pl-4">
                  <li>• Major Programs</li>
                  <li>• Ministry Costs</li>
                  <li>• Staff & Volunteer Costs</li>
                  <li>• Premises Costs</li>
                  <li>• Mission Costs</li>
                  <li>• Admin & Governance</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-ledger pt-2 text-xs text-grey-mid">
              Includes 8 income and 12 expense subcategories with automatic keyword matching.
            </div>
          </div>

          <Button
            onClick={handleSeedCategories}
            disabled={saving === "categories"}
            className="bg-ink text-paper hover:bg-ink/90"
          >
            {saving === "categories" ? "Loading Categories..." : "Load Categories"}
          </Button>

          <div className="text-xs text-grey-mid">
            Note: This will create system categories that cannot be deleted. You can add custom
            categories later in the Categories section.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
