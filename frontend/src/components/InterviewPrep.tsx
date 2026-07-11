import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Send, Award, Play, ShieldAlert } from 'lucide-react';

interface Scorecard {
  technical_score: string;
  communication_score: string;
  constructive_feedback: string;
  model_answers_suggested: string[];
}

export default function InterviewPrep() {
  const [started, setStarted] = useState(false);
  const [turn, setTurn] = useState(1);
  const [question, setQuestion] = useState("Click start to instantiate the CrewAI Recruiter panel.");
  const [answer, setAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [roundType, setRoundType] = useState("technical");
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(false);

  // Browser Native Web Speech Speech-To-Text Setup
  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech API is not natively supported in this browser version. Use text fallback input.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    if (!isRecording) {
      setIsRecording(true);
      recognition.start();
      recognition.onresult = (event: any) => {
        const textResult = event.results[0][0].transcript;
        setAnswer((prev) => prev + " " + textResult);
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
    } else {
      setIsRecording(false);
    }
  };

  const handleNextTurn = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/interview/next-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_turn: turn, user_answer: answer })
      });
      const data = await res.json();
      
      if (data.status === 'ongoing') {
        setQuestion(data.text);
        setTurn(data.next_turn);
        setRoundType(data.round);
        setAnswer("");
      } else {
        setScorecard(data.scorecard);
        setQuestion("Interview simulation cycle completed successfully.");
      }
    } catch (err) {
      console.error("Crew routing broken", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-slate-100 font-sans flex flex-col items-center justify-center">
      <Card className="w-full max-w-2xl bg-slate-900 border-slate-800 shadow-2xl">
        <CardHeader className="border-b border-slate-800 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">
              CrewAI Simulation Deck
            </CardTitle>
            <p className="text-xs text-slate-400 mt-1">Autonomous panel evaluation session tracking logic parameters.</p>
          </div>
          {started && !scorecard && (
            <Badge className={roundType === 'technical' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}>
              Round {turn}/5: {roundType.toUpperCase()}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="mt-6 space-y-6">
          
          {/* QUESTION BOX CONTAINER */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-sm leading-relaxed text-slate-300 font-medium">
            {question}
          </div>

          {!started ? (
            <Button onClick={() => { setStarted(true); handleNextTurn(); }} className="w-full bg-indigo-600 hover:bg-indigo-500 gap-2 font-semibold">
              <Play className="h-4 w-4" /> Initialize Agent Assessment
            </Button>
          ) : scorecard ? (
            /* SCORECARD SUMMARY DASHBOARD VIEW */
            <div className="space-y-4 border-t border-slate-800 pt-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-center">
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Technical Score</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">{scorecard.technical_score}</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-center">
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Communication Metric</div>
                  <div className="text-2xl font-black text-cyan-400 mt-1">{scorecard.communication_score}</div>
                </div>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-400" /> Granular Improvement Roadmap
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">{scorecard.constructive_feedback}</p>
              </div>
            </div>
          ) : (
            /* RESPOND WORKSPACE ACTIONS */
            <div className="space-y-4">
              <Textarea 
                value={answer}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnswer(e.target.value)}
                placeholder="Type your comprehensive response context or toggle real-time local voice recording input handles..."
                className="bg-slate-950 border-slate-800 text-slate-300 text-sm focus-visible:ring-indigo-500 h-28 resize-none"
              />
              <div className="flex gap-3">
                <Button 
                  onClick={handleToggleVoice} 
                  variant="outline" 
                  className={`border-slate-800 text-slate-300 w-12 p-0 ${isRecording ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' : 'hover:bg-slate-800'}`}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button 
                  onClick={handleNextTurn} 
                  disabled={loading || !answer.trim()} 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 gap-2 text-white font-semibold"
                >
                  Submit Response <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
