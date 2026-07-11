import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, Loader2, ChevronRight, TrendingUp, CheckCircle2, XCircle, Code } from 'lucide-react';

export default function InterviewDeck() {
  const [collegeName, setCollegeName] = useState("");
  const [loading, setLoading] = useState(false);
  const [collegeData, setCollegeData] = useState<any>(null);

  // New States for mock engine
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [activeTest, setActiveTest] = useState<any[] | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<string, any>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [activeRoundType, setActiveRoundType] = useState<string>("");

  const fetchCollegeIntel = async (overrideCollege?: string) => {
    const targetCollege = overrideCollege || collegeName;
    if (!targetCollege.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/placement/college-intel?college_name=${encodeURIComponent(targetCollege)}`);
      const data = await res.json();
      if (data.status === 'success') {
        setCollegeData(data);
      }
    } catch (err) {
      console.error("Failed to fetch college intel", err);
    } finally {
      setLoading(false);
    }
  };

  const launchMockTest = async (companyName: string, roundType: string) => {
    setActiveRoundType(roundType);
    setActiveTest([]); // set intermediate loading state array
    try {
      const res = await fetch(`/api/v1/placement/questions/${companyName}/${roundType}`);
      if (res.ok) {
        const data = await res.json();
        setActiveTest(data.questions);
        setTestAnswers({});
        setTestSubmitted(false);
      }
    } catch (err) {
      console.error("Failed to launch mock test", err);
    }
  };

  const submitTest = () => {
    setTestSubmitted(true);
  };

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-slate-100 font-sans flex flex-col items-center">
      <Card className="w-full max-w-5xl bg-slate-900 border-slate-800 shadow-2xl">
        <CardHeader className="border-b border-slate-800 pb-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">
              Campus Placement Portal
            </CardTitle>
            <div className="text-sm text-slate-400 mt-2">
              Official Placement Records & Company Blueprints
            </div>
          </div>
        </CardHeader>
        <CardContent className="mt-6 p-6">
          {!collegeData ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in zoom-in-95 duration-500">
              <div className="bg-slate-950 p-6 rounded-full border border-slate-800 shadow-inner">
                <Building2 className="w-16 h-16 text-indigo-500" />
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-bold text-slate-100">Welcome to Phase 5</h3>
                <p className="text-base text-slate-400 max-w-md mx-auto leading-relaxed">
                  To get started, enter your College URL or name. We will dynamically fetch placement records to show you the top recruiters.
                </p>
              </div>
              <div className="flex w-full max-w-lg gap-3">
                <Input 
                  placeholder="e.g. https://cmrec.ac.in/placement/ or IIT Bombay" 
                  value={collegeName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCollegeName(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && fetchCollegeIntel()}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500 h-14 text-lg px-6 rounded-xl"
                  disabled={loading}
                />
                <Button 
                  onClick={() => fetchCollegeIntel()} 
                  disabled={loading || !collegeName.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 shadow-lg h-14 px-8 rounded-xl font-bold text-white transition-all"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Fetching...</>
                  ) : (
                    <><Search className="w-5 h-5 mr-2" /> Search</>
                  )}
                </Button>
              </div>
            </div>
          ) : !selectedCompany ? (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                 <div>
                     <h3 className="text-2xl font-bold text-slate-200">
                       Official Placement Statistics
                     </h3>
                     <p className="text-indigo-400 font-medium mt-1">Data for: {collegeData.college}</p>
                 </div>
                 <Button variant="outline" size="sm" onClick={() => setCollegeData(null)} className="border-slate-800 text-slate-400 hover:bg-slate-800">
                    Change Target
                 </Button>
              </div>

              <div>
                  <h4 className="text-lg font-medium text-slate-300 mb-4">Top Recruiters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collegeData.top_companies.map((company: any) => (
                      <Card 
                        key={company.name} 
                        onClick={() => setSelectedCompany(company)}
                        className="bg-slate-950 border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(99,102,241,0.1)]"
                      >
                        <CardHeader>
                          <CardTitle className="text-indigo-400 flex items-center justify-between text-xl">
                             {company.name}
                             <ChevronRight className="w-5 h-5 text-slate-600" />
                          </CardTitle>
                          <div className="mt-2 text-sm text-slate-400 flex flex-col gap-3">
                            {company.placement_percentage && (
                              <div className="flex items-center text-emerald-400 font-semibold bg-emerald-500/10 w-fit px-2.5 py-1 rounded-md text-sm border border-emerald-500/20">
                                <TrendingUp className="w-4 h-4 mr-1.5" />
                                {company.placement_percentage} Hiring Volume
                              </div>
                            )}
                            <div className="text-sm block">{company.timeline.length} Standard Recruitment Rounds</div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
              </div>
            </div>
          ) : !activeTest ? (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                <Button variant="ghost" onClick={() => setSelectedCompany(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full">
                   <ChevronRight className="w-6 h-6 rotate-180" />
                </Button>
                <h3 className="text-2xl font-bold text-indigo-400">{selectedCompany.name} Recruitment Timeline</h3>
              </div>
              
              {selectedCompany.about && (
                <div className="mb-6 p-5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-300 text-sm leading-relaxed shadow-inner">
                  <h4 className="text-white font-bold mb-2 tracking-wide uppercase text-xs flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    About {selectedCompany.name}
                  </h4>
                  <p className="opacity-90">{selectedCompany.about}</p>
                </div>
              )}
              
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
                {selectedCompany.timeline.map((round: any, idx: number) => (
                  <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-slate-800 bg-slate-900 text-slate-400 group-hover:border-indigo-500 group-hover:text-indigo-400 group-hover:shadow-[0_0_10px_rgba(99,102,241,0.3)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-all z-10 font-bold">
                      {round.round}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-5 rounded-xl border border-slate-800 bg-slate-950 shadow-sm hover:border-slate-700 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-3 md:gap-0">
                        <div className="flex items-center gap-2">
                           <h4 className="font-bold text-slate-200 text-lg">{round.name}</h4>
                           {round.type === 'coding' && (
                             <Badge variant="outline" className="text-xs bg-indigo-500/10 border-indigo-500/30 text-indigo-300">
                               <Code className="w-3 h-3 mr-1" /> Coding
                             </Badge>
                           )}
                        </div>
                        <Button size="sm" onClick={() => launchMockTest(selectedCompany.name, round.name)} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 shadow-sm">
                          Start Round
                        </Button>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">{round.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={() => {setActiveTest(null); setTestSubmitted(false);}} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full">
                      <ChevronRight className="w-6 h-6 rotate-180" />
                    </Button>
                    <h3 className="text-xl font-bold text-slate-200">{selectedCompany.name} Assessment</h3>
                </div>
                <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 capitalize px-3 py-1">
                  {activeRoundType} Round
                </Badge>
              </div>
              
              <div className="space-y-8">
                {activeTest.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 flex flex-col items-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                        Generating dynamic questions via AI...
                    </div>
                ) : activeTest.map((q: any, qIdx: number) => {
                  
                  return (
                    <div key={q.id} className="p-6 bg-slate-950 border border-slate-800 rounded-xl space-y-5 shadow-inner">
                      <h4 className="text-base font-medium text-slate-200">{qIdx + 1}. {q.question}</h4>
                      
                      {q.type === 'coding' ? (
                        <div className="space-y-4">
                          <textarea 
                            className="w-full h-48 bg-slate-900 border border-slate-800 text-slate-300 p-4 rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 font-mono text-sm resize-y"
                            placeholder="Write your code solution here..."
                            value={testAnswers[q.id] || ''}
                            onChange={(e) => !testSubmitted && setTestAnswers(prev => ({...prev, [q.id]: e.target.value}))}
                            disabled={testSubmitted}
                          />
                          {testSubmitted && (
                            <div className="p-5 rounded-lg mt-5 bg-indigo-500/5 border border-indigo-500/20 animate-in zoom-in-95 duration-300">
                              <h5 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2 text-indigo-400">
                                  <CheckCircle2 className="w-5 h-5" /> Expected Solution
                              </h5>
                              <pre className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto bg-slate-900 p-4 rounded-md border border-slate-800">
                                  {q.expected_solution || q.explanation || "No solution provided."}
                              </pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {q.options?.map((opt: string, optIdx: number) => {
                              const isCorrect = testAnswers[q.id] === q.correct_index;
                              let btnClass = "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white";
                              if (testSubmitted) {
                                  if (optIdx === q.correct_index) btnClass = "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 ring-1 ring-emerald-500/50";
                                  else if (testAnswers[q.id] === optIdx) btnClass = "bg-red-500/20 border-red-500/50 text-red-400";
                              } else if (testAnswers[q.id] === optIdx) {
                                  btnClass = "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]";
                              }

                              return (
                                <Button 
                                  key={optIdx} 
                                  variant="outline" 
                                  className={`justify-start h-auto py-3 px-4 transition-all ${btnClass}`}
                                  onClick={() => !testSubmitted && setTestAnswers(prev => ({...prev, [q.id]: optIdx}))}
                                  disabled={testSubmitted}
                                >
                                  <span className="mr-3 text-sm opacity-70 font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                                  <span className="text-left whitespace-normal text-sm">{opt}</span>
                                </Button>
                              )
                          })}
                        </div>
                      )}
                      
                      {testSubmitted && q.type !== 'coding' && (
                          <div className={`p-5 rounded-lg mt-5 flex gap-4 items-start border animate-in zoom-in-95 duration-300 ${testAnswers[q.id] === q.correct_index ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                              {testAnswers[q.id] === q.correct_index ? <CheckCircle2 className="w-6 h-6 text-emerald-400 mt-0.5 shrink-0" /> : <XCircle className="w-6 h-6 text-red-400 mt-0.5 shrink-0" />}
                              <div>
                                  <h5 className={`text-sm font-bold uppercase tracking-wide mb-1 ${testAnswers[q.id] === q.correct_index ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {testAnswers[q.id] === q.correct_index ? 'Correct!' : 'Incorrect'}
                                  </h5>
                                  <p className="text-sm text-slate-300 leading-relaxed">
                                      {q.explanation}
                                  </p>
                              </div>
                          </div>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {!testSubmitted && activeTest && activeTest.length > 0 && (
                  <div className="flex justify-end pt-6 border-t border-slate-800">
                    <Button 
                      onClick={submitTest} 
                      disabled={Object.keys(testAnswers).length !== activeTest.length}
                      className="bg-indigo-600 hover:bg-indigo-500 px-8 h-12 text-base font-semibold shadow-lg hover:shadow-indigo-500/25 transition-all"
                    >
                      Submit Assessment
                    </Button>
                  </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
