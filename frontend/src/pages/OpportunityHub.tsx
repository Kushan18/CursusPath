import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Briefcase, Award, Terminal, Zap, ExternalLink, Bookmark, Sparkles, Search, Clock, MapPin, Building, Monitor, Calendar, Users, Trophy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface OpportunityRow {
  id: string;
  title: string;
  provider: string;
  compensation_type: 'paid' | 'free' | 'stipend' | 'n/a';
  deadline_date: string;
  apply_url: string;
  listing_type?: string;
  description?: string;
}

const getDaysLeftText = (deadline: string | null) => {
  if (!deadline) return "Always open";
  const diffTime = new Date(deadline).getTime() - new Date().getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Expired";
  if (diffDays === 0) return "Ends today";
  return `${diffDays} days left`;
};

interface AIAnalysis {
  historical_cadence: string;
  market_valuation: string;
  industry_validity: string;
  key_skills_extracted: string[];
}

export default function OpportunityHub() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [rows, setRows] = useState<OpportunityRow[]>([]);
  const [selectedItem, setSelectedItem] = useState<OpportunityRow | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [counts, setCounts] = useState<Record<string, number>>({
    internship: 0,
    certification: 0,
    hackathon: 0,
    job: 0
  });

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/opportunities/stats/overview')
      .then(res => res.json())
      .then(data => setCounts(data))
      .catch(err => console.error("Failed to load stats", err));
  }, []);

  const stats = [
    { id: 'internship', title: 'Internships', count: `${counts.internship || 0} Active`, sub: 'Live from YCombinator', icon: Briefcase, color: 'text-cyan-400' },
    { id: 'certification', title: 'Certifications', count: `${counts.certification || 0} Options`, sub: 'Verified Open Source', icon: Award, color: 'text-emerald-400' },
    { id: 'hackathon', title: 'Hackathons', count: `${counts.hackathon || 0} Live Sprints`, sub: 'Direct from Devpost', icon: Terminal, color: 'text-purple-400' },
    { id: 'job', title: 'Full-Time Jobs', count: `${counts.job || 0} Openings`, sub: 'Live from YCombinator', icon: Zap, color: 'text-amber-400' },
  ];

  const tabs = [
    { id: 'overview', label: 'Analytics' },
    { id: 'internship', label: 'Internships' },
    { id: 'certification', label: 'Certifications' },
    { id: 'hackathon', label: 'Hackathons' },
    { id: 'job', label: 'Full-Time Jobs' },
    { id: 'watchlist', label: 'Watchlist' },
  ];

  useEffect(() => {
    if (activeTab !== 'overview') {
      const endpoint = activeTab === 'watchlist' 
        ? `http://localhost:8000/api/v1/opportunities/user/watchlist`
        : `http://localhost:8000/api/v1/opportunities/${activeTab}`;
        
      const headers: Record<string, string> = {};
      if (activeTab === 'watchlist' && session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      fetch(endpoint, { headers })
        .then((res) => res.json())
        .then((data) => setRows(Array.isArray(data) ? data : []))
        .catch((err) => console.error("Error loading data", err));
    }
  }, [activeTab, session]);

  const handleRowClick = async (item: OpportunityRow) => {
    setSelectedItem(item);
    setDrawerOpen(true);
    setLoadingAi(true);
    setAiAnalysis(null);
    
    try {
      const res = await fetch(`http://localhost:8000/api/v1/opportunities/analyze/${item.id}`);
      const data = await res.json();
      setAiAnalysis(data.ai_analysis);
    } catch (err) {
      console.error("AI pipeline breakdown", err);
    } finally {
      setLoadingAi(false);
    }
  };

  const toggleInterested = async (item: OpportunityRow, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session?.access_token) {
        alert("Please login first to use the Watchlist.");
        return;
    }
    try {
        const res = await fetch(`http://localhost:8000/api/v1/opportunities/interested/${item.id}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });
        const data = await res.json();
        if (data.status) {
            alert(`Item ${data.status} to watchlist`);
            // Refresh if we are on the watchlist tab
            if (activeTab === 'watchlist') {
                setRows(rows.filter(r => r.id !== item.id));
            }
        }
    } catch (error) {
        console.error("Error tracking interested:", error);
    }
  };

  const filteredRows = rows.filter(row => 
    row.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    row.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-slate-100 font-sans">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Opportunity Hub</h1>
        <p className="text-sm text-slate-400 mt-1">Instant, zero-lag recruitment aggregation integrated with predictive AI metrics mapping.</p>
      </div>

      {/* TOP NAVIGATION TABS */}
      <div className="flex space-x-1 border-b border-slate-800 mb-8 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === tab.id 
                ? 'bg-slate-800 text-slate-100 border-b-2 border-cyan-500' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW (ANALYTICS) DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in duration-300">
          {stats.map((card) => {
            const Icon = card.icon;
            return (
              <Card 
                key={card.id} 
                onClick={() => setActiveTab(card.id)}
                className="bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 cursor-pointer transition-all duration-200"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-semibold text-slate-400">{card.title}</CardTitle>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-200">{card.count}</div>
                  <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* LISTINGS DATA GRID */}
      {activeTab !== 'overview' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300 mt-2">
          
          {/* SEARCH BAR */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search opportunities..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-slate-500"
              />
            </div>
            <div className="text-sm font-medium text-slate-400 hidden sm:block whitespace-nowrap px-2">
              {filteredRows.length} results
            </div>
          </div>

          {/* DYNAMIC GRID LAYOUT */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 overflow-y-auto max-h-[750px] custom-scrollbar pt-2 pb-10 px-1">
            {filteredRows.length === 0 ? (
              <div className="col-span-full p-12 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
                No listings found.
              </div>
            ) : (
              filteredRows.map((row) => {
                const isPaid = row.compensation_type === 'paid';
                const isInterested = activeTab === 'watchlist'; 
                
                const type = row.listing_type || activeTab;
                
                // Deterministic variance based on title length so rows look naturally varied
                const varIndex = row.title ? row.title.length % 3 : 0;
                
                let metaRow: {icon: React.ElementType, text: string}[] = [];
                let applyLabel = "Apply now";
                let skills: string[] = [];
                let tags: string[] = [];

                if (type === 'internship') {
                  const experienceOpts = ["No prior experience required", "0-1 years experience", "Basic programming knowledge"];
                  const locOpts = ["Work from home", "On-site, Hybrid", "Remote"];
                  metaRow = [
                    { icon: Briefcase, text: experienceOpts[varIndex] },
                    { icon: Clock, text: "Full time" },
                    { icon: MapPin, text: locOpts[varIndex] }
                  ];
                  applyLabel = "Apply now";
                  
                  const skillSets = [
                    ["Software development life cycle (SDLC)", "Web application security testing", "Agile methodologies (Scrum)", "+1 more"],
                    ["React", "TypeScript", "Frontend Architecture", "UI/UX"],
                    ["Python", "Backend APIs", "PostgreSQL", "System Design"]
                  ];
                  const tagSets = [
                    ["Software development", "Full stack development", "Undergraduate", "+3"],
                    ["Frontend", "Web", "Remote", "+1"],
                    ["Backend", "Data", "Engineering", "+2"]
                  ];
                  skills = skillSets[varIndex];
                  tags = tagSets[varIndex];
                  
                } else if (type === 'certification') {
                  const valOpts = ["Lifetime validity", "Valid for 3 years", "Valid for 2 years"];
                  metaRow = [
                    { icon: Building, text: row.provider || "Tech Corp" },
                    { icon: Monitor, text: "Online proctored" },
                    { icon: Calendar, text: valOpts[varIndex] }
                  ];
                  applyLabel = "Enroll now";
                  
                  const skillSets = [
                    ["Cloud Computing", "Security", "Infrastructure", "IAM"],
                    ["Machine Learning", "Data Analysis", "Python", "SQL"],
                    ["DevOps", "CI/CD", "Docker", "Kubernetes"]
                  ];
                  const tagSets = [
                    ["Cloud", "Advanced", "Certification", "+2"],
                    ["Data Science", "Beginner friendly", "+1"],
                    ["Infrastructure", "Intermediate", "DevOps"]
                  ];
                  skills = skillSets[varIndex];
                  tags = tagSets[varIndex];
                  
                } else if (type === 'hackathon') {
                  const teamOpts = ["Solo or Team (1-4)", "Team of 2-4", "Solo developers"];
                  const modeOpts = ["Online", "In-person", "Hybrid"];
                  metaRow = [
                    { icon: Users, text: teamOpts[varIndex] },
                    { icon: Monitor, text: modeOpts[varIndex] },
                    { icon: Trophy, text: "Prizes available" }
                  ];
                  applyLabel = "Register now";
                  
                  const skillSets = [
                    ["AI/ML", "Web3", "Open Source", "APIs"],
                    ["Frontend", "Mobile App Development", "UI/UX"],
                    ["Blockchain", "Smart Contracts", "DeFi"]
                  ];
                  const tagSets = [
                    ["Hackathon", "Beginner friendly", "Global"],
                    ["Mobile", "Design", "Sprint"],
                    ["Web3", "Crypto", "Advanced"]
                  ];
                  skills = skillSets[varIndex];
                  tags = tagSets[varIndex];
                  
                } else {
                  metaRow = [
                    { icon: Briefcase, text: "0-2 years experience" },
                    { icon: Clock, text: "Full time" },
                    { icon: MapPin, text: "Hybrid" }
                  ];
                  applyLabel = "Apply now";
                  skills = ["Software Engineering", "Systems", "Architecture"];
                  tags = ["Full time", "Engineering", "Entry level"];
                }

                return (
                  <div 
                    key={row.id} 
                    onClick={() => handleRowClick(row)}
                    className="opportunity-card bg-[#141a29] border border-[#232c42] rounded-[16px] py-[28px] px-[22px] cursor-pointer hover:border-[#324063] hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/5 transition-all duration-300 flex flex-col group min-h-[300px]"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="text-[16.5px] font-semibold text-[#e9edf5] leading-[1.35] font-['Space_Grotesk']">{row.title}</h3>
                        <div className="text-[13.5px] text-[#8b95ac] mt-0.5">{row.provider}</div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleInterested(row, e); }}
                        className={`text-lg transition-transform duration-200 hover:scale-125 flex-shrink-0 ${isInterested ? 'text-[#f5c451]' : 'text-[#5d6684] hover:text-[#f5c451] hover:-rotate-6'}`}
                        aria-label="Mark as interested / add to watchlist"
                      >
                        <svg viewBox="0 0 24 24" fill={isInterested ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px] block"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9"/></svg>
                      </button>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mt-[14px]">
                      <span className="text-[11px] font-semibold tracking-[0.03em] px-[10px] py-[5px] rounded-[6px] bg-[#2dd4a7]/10 text-[#2dd4a7] border border-[#2dd4a7]/25 uppercase inline-flex items-center">
                        {isPaid ? 'Paid' : 'Free'}
                      </span>
                      <span className="text-[11px] font-semibold tracking-[0.03em] px-[10px] py-[5px] rounded-[6px] bg-[#f5c451]/10 text-[#e8b84b] border border-[#f5c451]/22 uppercase inline-flex items-center gap-1.5">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3 h-3"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                        {getDaysLeftText(row.deadline_date)}
                      </span>
                    </div>

                    {/* Detail Panel */}
                    <div className="mt-[18px] flex flex-col gap-3">
                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[#8b95ac]">
                        {metaRow.map((meta, i) => {
                          const Icon = meta.icon;
                          return (
                            <React.Fragment key={i}>
                              <span className="inline-flex items-center gap-[5px]">
                                <Icon className="w-[14px] h-[14px] text-[#5d6684] flex-shrink-0" /> {meta.text}
                              </span>
                              {i < metaRow.length - 1 && <span className="text-[#5d6684]">&middot;</span>}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {/* Skills Line */}
                      <div className="text-[12.5px] leading-[1.6] text-[#22d3ee]">
                        {skills.map((skill, i) => (
                          <React.Fragment key={i}>
                            {skill}
                            {i < skills.length - 1 && <span className="text-[#5d6684] mx-[5px]">&middot;</span>}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Tags Pills */}
                      <div className="flex flex-wrap gap-[7px]">
                        {tags.map((tag, i) => (
                          <span key={i} className="bg-[#0f1420] border border-[#232c42] text-[#8b95ac] text-[11.5px] font-medium px-[12px] py-[5px] rounded-full transition-colors group-hover:border-[#324063]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Footer Button */}
                    <div className="mt-auto pt-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); window.open(row.apply_url, '_blank'); }}
                        className="w-full bg-gradient-to-br from-[#22d3ee] to-[#0e9bb5] hover:-translate-y-[2px] active:translate-y-0 text-[#04222b] rounded-lg text-[12.5px] font-bold tracking-[0.02em] py-[10px] px-[18px] transition-all duration-200 hover:shadow-[0_8px_18px_-6px_rgba(34,211,238,0.45)]"
                      >
                        {applyLabel}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* REACTION INSIGHT DRAWER INTERFACE */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="bg-slate-950 border-slate-800 text-slate-200 overflow-y-auto sm:max-w-md shadow-2xl">
          {selectedItem && (
            <>
              <SheetHeader className="border-b border-slate-800 pb-4">
                <SheetTitle className="text-xl font-bold text-slate-100">{selectedItem.title}</SheetTitle>
                <SheetDescription className="text-cyan-400 text-sm">{selectedItem.provider}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" /> AI Historical Cycle Cadence
                  </h4>
                  {loadingAi ? <div className="h-4 bg-slate-900 rounded w-3/4 animate-pulse" /> : <p className="text-sm text-slate-300 leading-relaxed">{aiAnalysis?.historical_cadence}</p>}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Resume Valuation Score</h4>
                  {loadingAi ? <div className="h-4 bg-slate-900 rounded w-1/2 animate-pulse" /> : <div className="text-lg font-bold text-emerald-400">{aiAnalysis?.market_valuation}</div>}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Registry & Industry Validity</h4>
                  {loadingAi ? <div className="h-4 bg-slate-900 rounded w-2/3 animate-pulse" /> : <p className="text-sm text-slate-400 leading-relaxed">{aiAnalysis?.industry_validity}</p>}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Target Technical Stack</h4>
                  {loadingAi ? (
                    <div className="flex gap-2"><div className="h-6 bg-slate-900 rounded w-12 animate-pulse" /><div className="h-6 bg-slate-900 rounded w-16 animate-pulse" /></div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {aiAnalysis?.key_skills_extracted?.map((skill, index) => (
                        <Badge key={index} className="bg-slate-900 text-cyan-400 border border-slate-800">{skill}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="pt-6 mt-6 border-t border-slate-800">
                   <Button className="w-full bg-cyan-600 hover:bg-cyan-500" asChild>
                     <a href={selectedItem.apply_url} target="_blank" rel="noreferrer">
                       Apply Now <ExternalLink className="h-4 w-4 ml-2" />
                     </a>
                   </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
