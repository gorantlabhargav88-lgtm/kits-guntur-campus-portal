import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Brain, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AeroAdvisorProps {
  userProfile: UserProfile;
}

export default function AeroAdvisor({ userProfile }: AeroAdvisorProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello ${userProfile.name}! I am **AeroAdvisor**, your dedicated **KITS Guntur** Academic AI Assistant, operating in **High Thinking Mode (Gemini 3.5 Flash)**. \n\nHow can I help you with your studies, scheduling, JNTUK exam prep, or performance analytics today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const studentSuggestions = [
    "Explain deletion cases in Red-Black Trees step-by-step",
    "Design a 4-week exam prep schedule for Signal Processing",
    "How can I improve my current CGPA?",
    "Give me 3 practice problems on Fourier Modulated signals"
  ];

  const lecturerSuggestions = [
    "Draft a challenging 10-mark quiz question on Red-Black Tree height bounds",
    "Provide a pedagogy plan for teaching Fourier Transforms to undergraduates",
    "Generate feedback templates for students lagging in attendance"
  ];

  const adminSuggestions = [
    "Draft a policy outline for end-of-semester archiving best practices",
    "What statistical indicators are best to identify student learning gaps?",
    "Generate a newsletter paragraph announcing the KITS UTSAV orientation"
  ];

  const suggestions = userProfile.role === 'student' 
    ? studentSuggestions 
    : userProfile.role === 'lecturer' 
      ? lecturerSuggestions 
      : adminSuggestions;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          history: messages,
          role: userProfile.role,
          userProfile: userProfile
        })
      });

      const data = await response.json();
      
      if (response.ok && data.text) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `⚠️ **Error generating advice:** ${data.details || data.error || 'Server returned an error.'}` 
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ **Failed to connect to AI advisor:** ${err.message || String(err)}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe rich markdown-like parsing to React JSX
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Check for code block markers
      if (line.startsWith('```')) return null; // We can handle blocks if we want, or just let them render with pre-monospace

      // Monospace block detection
      const codeRegex = /`([^`]+)`/g;
      
      // Bold syntax regex **bold**
      const boldRegex = /\*\*([^*]+)\*\*/g;
      
      // Headers
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="text-base font-semibold text-slate-800 dark:text-slate-100 mt-3 mb-1">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="text-lg font-bold text-slate-900 dark:text-slate-50 mt-4 mb-2">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="text-xl font-extrabold text-indigo-700 dark:text-indigo-400 mt-4 mb-2">{line.replace('# ', '')}</h2>;
      }

      // Bullet items
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const cleanText = line.replace(/^[\s*-]+/, '').trim();
        return (
          <li key={idx} className="ml-4 list-disc text-slate-700 dark:text-slate-300 text-sm py-0.5">
            {renderBoldAndCode(cleanText)}
          </li>
        );
      }

      // Default paragraphs
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-1.5">
          {renderBoldAndCode(line)}
        </p>
      );
    });
  };

  const renderBoldAndCode = (str: string) => {
    // Basic regex-based text segmentation for **bold** and `code`
    const parts = [];
    let lastIndex = 0;
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    let match;

    while ((match = regex.exec(str)) !== null) {
      const matchText = match[0];
      const matchIndex = match.index;

      // Add preceding plain text
      if (matchIndex > lastIndex) {
        parts.push(str.substring(lastIndex, matchIndex));
      }

      if (matchText.startsWith('**') && matchText.endsWith('**')) {
        parts.push(
          <strong key={matchIndex} className="font-bold text-slate-950 dark:text-white">
            {matchText.slice(2, -2)}
          </strong>
        );
      } else if (matchText.startsWith('`') && matchText.endsWith('`')) {
        parts.push(
          <code key={matchIndex} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400">
            {matchText.slice(1, -1)}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < str.length) {
      parts.push(str.substring(lastIndex));
    }

    return parts.length > 0 ? parts : str;
  };

  return (
    <div id="aero_advisor_container" className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 h-[650px] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Bot size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-slate-50 text-sm">AeroAdvisor AI</h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-[10px] text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200/50 dark:border-indigo-800/50">
                <Brain size={10} />
                Thinking Mode (HIGH)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Powered by Gemini 3.1 Pro Preview</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
          >
            <div className={`p-2 rounded-xl h-fit ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`p-4 rounded-2xl ${
              msg.role === 'user'
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-slate-800 dark:text-slate-200 border border-indigo-100/50 dark:border-indigo-900/50 rounded-tr-none'
                : 'bg-slate-50/50 dark:bg-slate-900/30 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-none'
            }`}>
              <div className="space-y-1">
                {parseMarkdown(msg.content)}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto items-start">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 h-fit animate-bounce">
              <Brain size={16} />
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/30 dark:border-indigo-800/30 rounded-tl-none flex flex-col gap-2 w-[280px]">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                AeroAdvisor is reasoning...
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-full"></div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-5/6"></div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {messages.length === 1 && (
        <div className="px-5 pb-3">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Suggested Prompts</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(sug)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 border border-indigo-100/40 dark:border-indigo-900/40 px-3 py-1.5 rounded-xl transition duration-150 text-left"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form Input */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(input);
        }} 
        className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask AeroAdvisor (e.g. "Draft an exam preparation calendar...")`}
          disabled={isLoading}
          className="flex-1 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-xl transition duration-150 shadow-sm"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
