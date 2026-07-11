import { useState } from 'react';
import { Send, MessageSquare, Minus, Sparkles } from 'lucide-react';

interface AiChatWidgetProps {
  chatHistory: { role: string; text: string; options?: string[] }[];
  handleChatSubmit: (msg: string) => void;
  refining: boolean;
  templateId: string;
  onSelectTemplate: (tid: string) => void;
}

export default function AiChatWidget({
  chatHistory,
  handleChatSubmit,
  refining,
  templateId,
  onSelectTemplate
}: AiChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const onSubmit = () => {
    if (!inputValue.trim() || refining) return;
    handleChatSubmit(inputValue);
    setInputValue("");
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-teal text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform z-50 animate-bounce"
        title="Chat with AI"
      >
        <MessageSquare size={24} />
        {chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'ai' && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-[#11161d]"></span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[380px] h-[550px] bg-surface rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-border flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
      {/* Header */}
      <div className="px-4 py-3 bg-[#11161d] border-b border-border flex justify-between items-center">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Sparkles size={16} className="text-teal" /> AI Resume Assistant
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsOpen(false)} className="text-muted hover:text-white transition-colors">
            <Minus size={18} />
          </button>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface custom-scrollbar">
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-teal text-white rounded-br-none' 
                : 'bg-[#1b222c] border border-border text-gray-300 rounded-bl-none'
            }`}>
              {msg.text}
            </div>
            {msg.options && (
              <div className="flex gap-2 flex-wrap">
                {msg.options.map((opt, j) => {
                  const tMap: any = {"Strict ATS": "strict_ats", "Modern Professional": "modern", "Minimalist": "minimalist"};
                  const tid = tMap[opt] || "strict_ats";
                  return (
                    <button 
                      key={j}
                      onClick={() => onSelectTemplate(tid)}
                      className={`px-3 py-1.5 text-[11px] font-medium rounded-full border transition-colors ${templateId === tid ? 'bg-teal/20 text-teal border-teal/50' : 'bg-bg border-border text-gray-400 hover:border-teal/30 hover:text-teal'}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {refining && (
          <div className="flex justify-start">
            <div className="bg-[#1b222c] border border-border rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5 shadow-sm">
              <div className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-[#11161d] border-t border-border shrink-0">
        <div className="relative flex items-center">
          <input 
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSubmit()}
            placeholder="E.g. Make my summary sound more executive..."
            disabled={refining}
            className="w-full bg-[#1b222c] border border-[#2a3441] rounded-full pl-4 pr-12 py-2.5 text-xs focus:outline-none focus:border-teal text-white disabled:opacity-50"
          />
          <button 
            onClick={onSubmit}
            disabled={refining || !inputValue.trim()}
            className="absolute right-1.5 p-1.5 bg-teal text-white rounded-full hover:bg-teal/90 disabled:opacity-50 disabled:bg-[#2a3441] disabled:text-gray-500 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
