import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Code2, 
  Box, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  ExternalLink, 
  Search,
  Youtube,
  Trophy,
  Target,
  CheckSquare,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Topic, Question, DashboardStats } from './types';
import { INITIAL_DSA_TOPICS, INITIAL_LLD_TOPICS } from './constants';

export default function App() {
  const [data, setData] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'dsa' | 'lld'>('dashboard');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [platformFilter, setPlatformFilter] = useState<string>('All');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Always call init to ensure minimum 15 questions per topic (it's idempotent)
      await fetch('/api/topics/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dsaTopics: INITIAL_DSA_TOPICS, lldTopics: INITIAL_LLD_TOPICS })
      });

      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (id: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedTopics(newExpanded);
  };

  const handleChecklistUpdate = async (topicId: string, field: string, currentValue: number) => {
    const newValue = currentValue === 0 ? 1 : 0;
    const timestamp = new Date().toLocaleString();
    
    // Optimistic update
    setData(prev => prev.map(t => t.id === topicId ? { 
      ...t, 
      [field]: newValue, 
      [`${field}_at`]: newValue ? timestamp : null 
    } : t));

    await fetch('/api/update-checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId, field, value: newValue, timestamp })
    });
  };

  const handleQuestionUpdate = async (questionId: string, currentValue: number) => {
    const newValue = currentValue === 0 ? 1 : 0;
    const timestamp = new Date().toLocaleString();

    // Optimistic update
    setData(prev => prev.map(t => ({
      ...t,
      questions: t.questions.map(q => q.id === questionId ? {
        ...q,
        completed: newValue,
        completed_at: newValue ? timestamp : null
      } : q)
    })));

    await fetch('/api/update-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, value: newValue, timestamp })
    });
  };

  const handleVideoLinkUpdate = async (topicId: string, link: string) => {
    setData(prev => prev.map(t => t.id === topicId ? { ...t, video_link: link } : t));
    await fetch('/api/update-video-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId, videoLink: link })
    });
  };

  const handleAddQuestion = async (topicId: string, questionData: any) => {
    try {
      const response = await fetch('/api/questions/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, ...questionData })
      });
      
      if (!response.ok) {
        const err = await response.json();
        alert(err.error || 'Failed to add question');
        return;
      }

      const newQuestion = await response.json();
      setData(prev => prev.map(t => t.id === topicId ? {
        ...t,
        questions: [...t.questions, newQuestion]
      } : t));
    } catch (error) {
      console.error('Error adding question:', error);
    }
  };

  const stats = useMemo((): DashboardStats => {
    const totalTopics = data.length;
    const totalQuestions = data.reduce((acc, t) => acc + t.questions.length, 0);
    const completedTopics = data.filter(t => t.video_watched && t.notes_completed && t.revision_done).length;
    const completedQuestions = data.reduce((acc, t) => acc + t.questions.filter(q => q.completed).length, 0);
    const overallProgress = totalQuestions > 0 ? Math.round((completedQuestions / totalQuestions) * 100) : 0;

    return { totalTopics, totalQuestions, completedTopics, completedQuestions, overallProgress };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.questions.some(q => q.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    }).map(t => {
      const difficultyWeights: Record<string, number> = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
      
      return {
        ...t,
        questions: t.questions
          .filter(q => {
            const matchesDifficulty = difficultyFilter === 'All' || q.difficulty === difficultyFilter;
            const matchesPlatform = platformFilter === 'All' || q.platform === platformFilter;
            return matchesDifficulty && matchesPlatform;
          })
          .sort((a, b) => (difficultyWeights[a.difficulty] || 0) - (difficultyWeights[b.difficulty] || 0))
      };
    });
  }, [data, searchQuery, difficultyFilter, platformFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-2">
            <Code2 className="text-indigo-600" />
            Tracker Pro
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeSection === 'dashboard'} 
            onClick={() => setActiveSection('dashboard')} 
          />
          <SidebarItem 
            icon={<BookOpen size={20} />} 
            label="DSA Topics" 
            active={activeSection === 'dsa'} 
            onClick={() => setActiveSection('dsa')} 
          />
          <SidebarItem 
            icon={<Box size={20} />} 
            label="LLD Topics" 
            active={activeSection === 'lld'} 
            onClick={() => setActiveSection('lld')} 
          />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-indigo-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Overall Progress</p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold text-indigo-900">{stats.overallProgress}%</span>
              <span className="text-xs text-indigo-600 font-medium">{stats.completedQuestions}/{stats.totalQuestions}</span>
            </div>
            <div className="h-2 bg-indigo-200 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats.overallProgress}%` }}
                className="h-full bg-indigo-600"
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header with Search */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 capitalize">{activeSection}</h2>
              <p className="text-slate-500 text-sm">Track your progress and master concepts.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search topics or questions..."
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {activeSection === 'dashboard' ? (
            <DashboardView stats={stats} />
          ) : (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-4 mb-6">
                <select 
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                >
                  <option>All Difficulties</option>
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
                <select 
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                >
                  <option>All Platforms</option>
                  <option>LeetCode</option>
                  <option>GFG</option>
                </select>
              </div>

              {filteredData
                .filter(t => t.category === activeSection.toUpperCase())
                .map(topic => (
                  <TopicCard 
                    key={topic.id}
                    topic={topic}
                    isExpanded={expandedTopics.has(topic.id)}
                    onToggle={() => toggleTopic(topic.id)}
                    onChecklistUpdate={handleChecklistUpdate}
                    onQuestionUpdate={handleQuestionUpdate}
                    onVideoUpdate={handleVideoLinkUpdate}
                    onAddQuestion={handleAddQuestion}
                  />
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        active 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function DashboardView({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard icon={<BookOpen className="text-blue-600" />} label="Total Topics" value={stats.totalTopics} subValue={`${stats.completedTopics} Completed`} color="blue" />
      <StatCard icon={<Target className="text-indigo-600" />} label="Total Questions" value={stats.totalQuestions} subValue={`${stats.completedQuestions} Completed`} color="indigo" />
      <StatCard icon={<Trophy className="text-amber-600" />} label="Success Rate" value={`${stats.overallProgress}%`} subValue="Mastery level" color="amber" />
      <StatCard icon={<CheckSquare className="text-emerald-600" />} label="Questions Done" value={stats.completedQuestions} subValue="Total solved" color="emerald" />
      
      <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold mb-6">Learning Journey</h3>
        <div className="flex items-center gap-8">
          <div className="flex-1 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Overall Completion</span>
              <span className="text-indigo-600 font-bold">{stats.overallProgress}%</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats.overallProgress}%` }}
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
              />
            </div>
          </div>
          <div className="w-32 h-32 rounded-full border-8 border-slate-100 flex items-center justify-center relative">
             <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-indigo-600"
                  strokeDasharray={351.85}
                  strokeDashoffset={351.85 - (351.85 * stats.overallProgress) / 100}
                />
             </svg>
             <span className="text-2xl font-black text-slate-800">{stats.overallProgress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subValue, color }: { icon: React.ReactNode, label: string, value: string | number, subValue: string, color: string }) {
  const bgColors: any = {
    blue: 'bg-blue-50',
    indigo: 'bg-indigo-50',
    amber: 'bg-amber-50',
    emerald: 'bg-emerald-50'
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 ${bgColors[color]} rounded-xl flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>
      <h4 className="text-2xl font-bold text-slate-900 mb-1">{value}</h4>
      <p className="text-xs text-slate-400 font-medium">{subValue}</p>
    </div>
  );
}

function TopicCard({ topic, isExpanded, onToggle, onChecklistUpdate, onQuestionUpdate, onVideoUpdate, onAddQuestion }: { 
  topic: Topic, 
  isExpanded: boolean, 
  onToggle: () => void,
  onChecklistUpdate: (id: string, field: string, val: number) => void,
  onQuestionUpdate: (id: string, val: number) => void,
  onVideoUpdate: (id: string, link: string) => void,
  onAddQuestion: (topicId: string, data: any) => void,
  key?: React.Key
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ name: '', platform: 'LeetCode', difficulty: 'Easy', link: '' });

  const progress = topic.questions.length > 0 
    ? Math.round((topic.questions.filter(q => q.completed).length / topic.questions.length) * 100) 
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.name || !newQuestion.link) {
      alert('Please fill all fields');
      return;
    }
    if (topic.questions.some(q => q.link === newQuestion.link)) {
      alert('This question link already exists in this topic');
      return;
    }
    onAddQuestion(topic.id, newQuestion);
    setNewQuestion({ name: '', platform: 'LeetCode', difficulty: 'Easy', link: '' });
    setShowAddForm(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      <div 
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${progress === 100 ? 'bg-emerald-100' : 'bg-slate-100'}`}>
            {progress === 100 ? <CheckCircle2 className="text-emerald-600" size={20} /> : (isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />)}
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{topic.name}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-400 font-medium">{topic.questions.length} Questions</span>
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[10px] font-bold text-indigo-600">{progress}%</span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100"
          >
            <div className="p-6 space-y-8">
              {/* Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ChecklistItem 
                  label="Video Watched" 
                  checked={!!topic.video_watched} 
                  completedAt={topic.video_watched_at}
                  onClick={() => onChecklistUpdate(topic.id, 'video_watched', topic.video_watched)}
                />
                <ChecklistItem 
                  label="Notes Completed" 
                  checked={!!topic.notes_completed} 
                  completedAt={topic.notes_completed_at}
                  onClick={() => onChecklistUpdate(topic.id, 'notes_completed', topic.notes_completed)}
                />
                <ChecklistItem 
                  label="Revision Done" 
                  checked={!!topic.revision_done} 
                  completedAt={topic.revision_done_at}
                  onClick={() => onChecklistUpdate(topic.id, 'revision_done', topic.revision_done)}
                />
              </div>

              {/* Video Link */}
              <div className="bg-slate-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold text-sm">
                  <Youtube className="text-red-600" size={18} />
                  Video Resource
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Paste YouTube video link here..."
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={topic.video_link || ''}
                    onChange={(e) => onVideoUpdate(topic.id, e.target.value)}
                  />
                  {topic.video_link && (
                    <a href={topic.video_link} target="_blank" rel="noopener noreferrer" className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                      <ExternalLink size={18} />
                    </a>
                  )}
                </div>
              </div>

              {/* Questions List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Target size={16} className="text-indigo-600" />
                    Practice Questions
                  </h4>
                  <button 
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    {showAddForm ? 'Cancel' : '+ Add Question'}
                  </button>
                </div>

                {showAddForm && (
                  <motion.form 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleSubmit}
                    className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Question Name</label>
                        <input 
                          type="text" 
                          required
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={newQuestion.name}
                          onChange={(e) => setNewQuestion({ ...newQuestion, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Platform</label>
                        <select 
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={newQuestion.platform}
                          onChange={(e) => setNewQuestion({ ...newQuestion, platform: e.target.value })}
                        >
                          <option>LeetCode</option>
                          <option>GFG</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Difficulty</label>
                        <select 
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={newQuestion.difficulty}
                          onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value as any })}
                        >
                          <option>Easy</option>
                          <option>Medium</option>
                          <option>Hard</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Question Link</label>
                        <input 
                          type="url" 
                          required
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={newQuestion.link}
                          onChange={(e) => setNewQuestion({ ...newQuestion, link: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button 
                        type="submit"
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                      >
                        Save Question
                      </button>
                    </div>
                  </motion.form>
                )}

                <div className="space-y-2">
                  {topic.questions.length > 0 ? (
                    topic.questions.map(q => (
                      <QuestionRow 
                        key={q.id} 
                        question={q} 
                        onToggle={() => onQuestionUpdate(q.id, q.completed)}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 italic">No questions added yet for this topic.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChecklistItem({ label, checked, completedAt, onClick }: { label: string, checked: boolean, completedAt: string | null, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
        checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-indigo-300'
      }`}
    >
      <div className="flex items-center gap-3">
        {checked ? <CheckCircle2 className="text-emerald-600" size={20} /> : <Circle className="text-slate-300" size={20} />}
        <div>
          <p className={`text-sm font-bold ${checked ? 'text-emerald-900' : 'text-slate-700'}`}>{label}</p>
          {checked && completedAt && (
            <p className="text-[10px] text-emerald-600 font-medium">Done: {completedAt}</p>
          )}
        </div>
      </div>
      {!checked && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mark Done</span>}
    </div>
  );
}

function QuestionRow({ question, onToggle }: { question: Question, onToggle: () => void, key?: React.Key }) {
  const difficultyColors = {
    Easy: 'text-emerald-600 bg-emerald-50',
    Medium: 'text-amber-600 bg-amber-50',
    Hard: 'text-rose-600 bg-rose-50'
  };

  return (
    <div className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
      question.completed ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-100 hover:border-indigo-200'
    }`}>
      <div className="flex items-center gap-4 flex-1">
        <button onClick={onToggle} className="transition-transform active:scale-90">
          {question.completed ? <CheckCircle2 className="text-emerald-600" size={20} /> : <Circle className="text-slate-300 group-hover:text-indigo-400" size={20} />}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${question.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
              {question.name}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${difficultyColors[question.difficulty]}`}>
              {question.difficulty}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{question.platform}</span>
            {question.completed && question.completed_at && (
              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 size={10} />
                Completed on {question.completed_at}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <a 
        href={question.link} 
        target="_blank" 
        rel="noopener noreferrer"
        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
      >
        <ExternalLink size={16} />
      </a>
    </div>
  );
}
