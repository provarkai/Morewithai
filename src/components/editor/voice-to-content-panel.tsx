"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Mic, Square, Loader2, Sparkles, FileText, Clock, Type } from "lucide-react";

interface VoiceToContentPanelProps {
  siteId: string;
  onArticleGenerated?: (data: { title: string; content: string; excerpt: string }) => void;
}

export function VoiceToContentPanel({ siteId, onArticleGenerated }: VoiceToContentPanelProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"record" | "text" | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        processRecording(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const processRecording = useCallback(async (blob: Blob) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const res = await fetch("/api/ai/voice-to-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "transcribe", audioData: base64, siteId }),
        });
        if (!res.ok) throw new Error("Transcription failed");
        const data = await res.json();
        setTranscriptionText(data.text);
        setMode("text");
        toast({ title: "Audio transcribed" });
      } catch (err: any) {
        toast({ title: "Transcription error", description: err.message, variant: "destructive" });
      }
    };
    reader.readAsDataURL(blob);
  }, [siteId]);

  const generateMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch("/api/ai/voice-to-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "generate", transcriptionText: text, siteId }),
      });
      if (!res.ok) throw new Error("Generation failed");
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Article generated from voice notes" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const outlineMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai/voice-to-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "outline", notes, siteId }),
      });
      if (!res.ok) throw new Error("Outline generation failed");
      return res.json();
    },
    onSuccess: (data) => {
      setResult({ ...data, type: "outline" });
      toast({ title: "Outline generated" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Mic className="size-4 text-rose-500" />
              Voice to Content
            </CardTitle>
            <CardDescription>Speak your ideas, AI writes the article</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!mode && !result && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setMode("record")}>
              <Mic className="size-6 text-rose-500" />
              <span className="text-xs">Record Audio</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setMode("text")}>
              <Type className="size-6 text-blue-500" />
              <span className="text-xs">Paste Notes</span>
            </Button>
          </div>
        )}

        {/* Recording Mode */}
        {mode === "record" && (
          <div className="text-center space-y-3">
            {isRecording ? (
              <>
                <div className="text-3xl font-mono text-rose-500">{formatTime(recordingTime)}</div>
                <div className="flex justify-center gap-1">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="w-1 bg-rose-500 rounded-full animate-pulse" style={{ height: `${12 + Math.random() * 20}px`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
                <Button variant="destructive" onClick={stopRecording}>
                  <Square className="size-3.5 mr-1" /> Stop Recording
                </Button>
              </>
            ) : (
              <>
                <Mic className="size-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to start recording your thoughts</p>
                <Button onClick={startRecording}>
                  <Mic className="size-3.5 mr-1" /> Start Recording
                </Button>
              </>
            )}
          </div>
        )}

        {/* Text Input Mode */}
        {mode === "text" && !result && (
          <div className="space-y-2">
            <Textarea
              value={transcriptionText || notes}
              onChange={(e) => transcriptionText ? setTranscriptionText(e.target.value) : setNotes(e.target.value)}
              placeholder="Paste your notes, voice transcription, or rough ideas here..."
              className="min-h-[150px] text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => {
                const text = transcriptionText || notes;
                if (text.trim()) generateMutation.mutate(text);
              }} disabled={generateMutation.isPending || !(transcriptionText || notes).trim()}>
                {generateMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Sparkles className="size-3.5 mr-1" />}
                Generate Article
              </Button>
              <Button size="sm" variant="outline" onClick={() => outlineMutation.mutate()} disabled={outlineMutation.isPending || !notes.trim()}>
                {outlineMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <FileText className="size-3.5 mr-1" />}
                Outline
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setMode(null); setTranscriptionText(""); setNotes(""); }}>
                Reset
              </Button>
            </div>
          </div>
        )}

        {/* Loading */}
        {(generateMutation.isPending || outlineMutation.isPending) && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" /> {outlineMutation.isPending ? "Generating outline..." : "Transforming voice into article..."}
          </div>
        )}

        {/* Result */}
        {result && (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {result.type === "outline" ? (
                <>
                  <h3 className="font-semibold text-sm">{result.title}</h3>
                  {result.suggestedAngle && <p className="text-xs text-muted-foreground">💡 {result.suggestedAngle}</p>}
                  <div className="space-y-2">
                    {result.outline?.map((section: any, i: number) => (
                      <div key={i} className="rounded border p-2 text-xs">
                        <p className="font-medium">{section.heading}</p>
                        {section.points?.length > 0 && (
                          <ul className="mt-1 space-y-0.5 text-muted-foreground ml-3">
                            {section.points.map((p: string, j: number) => <li key={j}>• {p}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg bg-primary/5 p-3">
                    <h3 className="font-semibold text-sm">{result.title}</h3>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px]"><Type className="size-2.5 mr-0.5" /> {result.wordCount} words</Badge>
                      <Badge variant="outline" className="text-[10px]"><Clock className="size-2.5 mr-0.5" /> {result.readingTime} min read</Badge>
                    </div>
                  </div>
                  {result.suggestedCategory && (
                    <Badge variant="secondary" className="text-[10px]">📂 {result.suggestedCategory}</Badge>
                  )}
                  <div className="rounded border p-3 text-xs prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: result.content?.slice(0, 2000) + "..." || "" }}
                  />
                  {onArticleGenerated && (
                    <Button size="sm" className="w-full" onClick={() => onArticleGenerated({ title: result.title, content: result.content, excerpt: result.excerpt })}>
                      Use This in Editor
                    </Button>
                  )}
                </>
              )}
              <Button size="sm" variant="outline" className="w-full" onClick={() => { setResult(null); setMode(null); setTranscriptionText(""); setNotes(""); }}>
                Start Over
              </Button>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
