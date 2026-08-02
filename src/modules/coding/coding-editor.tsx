"use client";

import type { EditorProps } from "@monaco-editor/react";
import { AlertCircle, Loader2, Play, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useState, type ComponentType } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Execution = { status: string; stdout?: string; stderr?: string; compileOutput?: string; passedTests?: number; totalTests?: number; time?: number; memory?: number };
const MONACO_LANGUAGES: Record<string, string> = { javascript: "javascript", typescript: "typescript", python: "python", java: "java", "c++": "cpp", cpp: "cpp", "c#": "csharp", csharp: "csharp", go: "go", ruby: "ruby" };

type CodingEditorProps = {
  token: string;
  sessionId: string;
  questionId: string;
  languages: string[];
  language: string;
  sourceCode: string;
  disabled: boolean;
  exampleTests: Array<{ input: string; expectedOutput: string }>;
  hiddenTestsConfigured: boolean;
  onLanguageChange: (value: string) => void;
  onSourceChange: (value: string) => void;
};

export function CodingEditor({ token, sessionId, questionId, languages, language, sourceCode, disabled, exampleTests, hiddenTestsConfigured, onLanguageChange, onSourceChange }: CodingEditorProps) {
  const [stdin, setStdin] = useState(exampleTests[0]?.input ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Execution | null>(null);
  const [error, setError] = useState("");
  const [Editor, setEditor] = useState<ComponentType<EditorProps> | null>(null);
  const [editorError, setEditorError] = useState("");

  const loadEditor = useCallback(async () => {
    setEditor(null);
    setEditorError("");
    let timeoutId = 0;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error("The code editor took too long to load.")), 12_000);
    });
    try {
      const { default: EditorComponent, loader } = await Promise.race([
        import("@monaco-editor/react"),
        timeout,
      ]);
      await Promise.race([Promise.resolve(loader.init()), timeout]);
      window.clearTimeout(timeoutId);
      setEditor(() => EditorComponent);
    } catch (caught) {
      window.clearTimeout(timeoutId);
      setEditorError(caught instanceof Error ? caught.message : "The code editor could not be loaded.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadEditor(), 0);
    return () => window.clearTimeout(timer);
  }, [loadEditor]);

  async function execute(submit: boolean) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/candidate-assessment/code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, sessionId, questionId, language, sourceCode, stdin, submit }) });
      const envelope = await response.json() as { success: boolean; data?: Execution; error?: { message?: string } };
      if (!response.ok || !envelope.success || !envelope.data) throw new Error(envelope.error?.message ?? "Code execution failed.");
      setResult(envelope.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Code execution failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full space-y-2 sm:w-56">
          <Label>Programming language</Label>
          <Select value={language} disabled={disabled || busy} onValueChange={onLanguageChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{languages.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button className="flex-1 sm:flex-none" type="button" variant="outline" disabled={disabled || busy || !sourceCode} onClick={() => void execute(false)}>{busy ? <Loader2 className="animate-spin" /> : <Play />}Run code</Button>
          <Button className="flex-1 sm:flex-none" type="button" disabled={disabled || busy || !sourceCode || !hiddenTestsConfigured} onClick={() => void execute(true)}><Send />Run hidden tests</Button>
        </div>
      </div>

      {!hiddenTestsConfigured ? <Alert><AlertCircle /><AlertTitle>Hidden tests are not configured</AlertTitle><AlertDescription>You can still write and run the code. Ask the recruiting team to configure hidden tests if automated scoring is required.</AlertDescription></Alert> : null}

      <div className="min-h-[320px] overflow-hidden rounded-xl border bg-zinc-950 sm:min-h-[420px]">
        {editorError ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-center sm:min-h-[420px]">
            <AlertCircle className="size-8 text-destructive" />
            <div><p className="font-medium text-zinc-100">Code editor unavailable</p><p className="mt-1 max-w-md text-sm text-zinc-400">{editorError}</p></div>
            <Button type="button" variant="secondary" onClick={() => void loadEditor()}><RefreshCw />Retry editor</Button>
          </div>
        ) : Editor ? (
          <Editor height="420px" theme="vs-dark" language={MONACO_LANGUAGES[language.toLowerCase()] ?? "plaintext"} value={sourceCode} onChange={(value) => onSourceChange(value ?? "")} options={{ readOnly: disabled || busy, minimap: { enabled: false }, fontSize: 14, tabSize: 2, automaticLayout: true, accessibilitySupport: "auto", scrollBeyondLastLine: false }} />
        ) : (
          <div className="flex min-h-[320px] items-center justify-center gap-3 text-sm text-zinc-300 sm:min-h-[420px]"><Loader2 className="size-5 animate-spin" />Loading code editor…</div>
        )}
      </div>

      <div className="space-y-2"><Label htmlFor="code-stdin">Standard input for Run code</Label><Textarea id="code-stdin" className="min-h-28 font-mono" value={stdin} disabled={disabled || busy} onChange={(event) => setStdin(event.target.value)} /></div>
      {exampleTests.length > 0 ? <div className="rounded-lg border bg-muted/30 p-4 text-sm"><p className="font-medium">Example tests</p>{exampleTests.map((test, index) => <div className="mt-2 grid gap-2 font-mono text-xs sm:grid-cols-2" key={`${test.input}-${index}`}><span>Input: {test.input || "(empty)"}</span><span>Expected: {test.expectedOutput}</span></div>)}</div> : null}
      {error ? <Alert variant="destructive"><AlertTitle>Execution failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      {result ? <Alert><AlertTitle>{result.status}</AlertTitle><AlertDescription><div className="space-y-1 font-mono text-xs">{result.passedTests !== undefined ? <p>Hidden tests: {result.passedTests}/{result.totalTests}</p> : null}{result.stdout ? <pre className="whitespace-pre-wrap">stdout: {result.stdout}</pre> : null}{result.stderr ? <pre className="whitespace-pre-wrap text-destructive">stderr: {result.stderr}</pre> : null}{result.compileOutput ? <pre className="whitespace-pre-wrap text-destructive">compiler: {result.compileOutput}</pre> : null}<p>Time: {result.time ?? 0}s · Memory: {result.memory ?? 0} KB</p></div></AlertDescription></Alert> : null}
    </div>
  );
}
