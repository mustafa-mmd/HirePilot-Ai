"use client";

import Editor from "@monaco-editor/react";
import { useState } from "react";
import { Play, Send } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Execution = { status: string; stdout?: string; stderr?: string; compileOutput?: string; passedTests?: number; totalTests?: number; time?: number; memory?: number };
const MONACO_LANGUAGES: Record<string, string> = { javascript: "javascript", typescript: "typescript", python: "python", java: "java", "c++": "cpp", cpp: "cpp", "c#": "csharp", csharp: "csharp", go: "go", ruby: "ruby" };

export function CodingEditor({ token, sessionId, questionId, languages, language, sourceCode, disabled, exampleTests, onLanguageChange, onSourceChange }: { token: string; sessionId: string; questionId: string; languages: string[]; language: string; sourceCode: string; disabled: boolean; exampleTests: Array<{ input: string; expectedOutput: string }>; onLanguageChange: (value: string) => void; onSourceChange: (value: string) => void }) {
  const [stdin, setStdin] = useState(exampleTests[0]?.input ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Execution | null>(null);
  const [error, setError] = useState("");

  async function execute(submit: boolean) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/candidate-assessment/code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, sessionId, questionId, language, sourceCode, stdin, submit }) });
      const envelope = await response.json() as { success: boolean; data?: Execution; error?: { message?: string } };
      if (!response.ok || !envelope.success || !envelope.data) throw new Error(envelope.error?.message ?? "Code execution failed.");
      setResult(envelope.data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Code execution failed."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div className="w-56 space-y-2"><Label>Programming language</Label><Select value={language} disabled={disabled || busy} onValueChange={onLanguageChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{languages.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div className="flex gap-2"><Button type="button" variant="outline" disabled={disabled || busy || !sourceCode} onClick={() => void execute(false)}><Play />Run code</Button><Button type="button" disabled={disabled || busy || !sourceCode} onClick={() => void execute(true)}><Send />Run hidden tests</Button></div></div><div className="overflow-hidden rounded-lg border"><Editor height="420px" theme="vs-dark" language={MONACO_LANGUAGES[language.toLowerCase()] ?? "plaintext"} value={sourceCode} onChange={(value) => onSourceChange(value ?? "")} options={{ readOnly: disabled || busy, minimap: { enabled: false }, fontSize: 14, tabSize: 2, automaticLayout: true, accessibilitySupport: "auto" }} /></div><div className="space-y-2"><Label htmlFor="code-stdin">Standard input for Run code</Label><Textarea id="code-stdin" className="font-mono" value={stdin} disabled={disabled || busy} onChange={(event) => setStdin(event.target.value)} /></div>{exampleTests.length > 0 && <div className="rounded-lg border bg-muted/30 p-4 text-sm"><p className="font-medium">Example tests</p>{exampleTests.map((test, index) => <div className="mt-2 grid gap-2 font-mono text-xs sm:grid-cols-2" key={`${test.input}-${index}`}><span>Input: {test.input || "(empty)"}</span><span>Expected: {test.expectedOutput}</span></div>)}</div>}{error && <Alert variant="destructive"><AlertTitle>Execution failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}{result && <Alert><AlertTitle>{result.status}</AlertTitle><AlertDescription><div className="space-y-1 font-mono text-xs">{result.passedTests !== undefined && <p>Hidden tests: {result.passedTests}/{result.totalTests}</p>}{result.stdout && <pre className="whitespace-pre-wrap">stdout: {result.stdout}</pre>}{result.stderr && <pre className="whitespace-pre-wrap text-destructive">stderr: {result.stderr}</pre>}{result.compileOutput && <pre className="whitespace-pre-wrap text-destructive">compiler: {result.compileOutput}</pre>}<p>Time: {result.time ?? 0}s · Memory: {result.memory ?? 0} KB</p></div></AlertDescription></Alert>}</div>;
}
