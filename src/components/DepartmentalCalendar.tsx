import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  db, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc,
  OperationType,
  handleFirestoreError
} from '../lib/firebase';
import { CampusEvent } from '../types';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Bell, 
  BookOpen, 
  AlertCircle,
  Tag,
  Bookmark,
  Filter
} from 'lucide-react';

interface DepartmentalCalendarProps {
  userRole: 'admin' | 'lecturer' | 'student';
  userDepartment: string;
  userId: string;
  userName: string;
}

export default function DepartmentalCalendar({ 
  userRole, 
  userDepartment, 
  userId, 
  userName 
}: DepartmentalCalendarProps) {
  // Real-time events list
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filterType, setFilterType] = useState<'all' | 'event' | 'deadline'>('all');
  const [filterDept, setFilterDept] = useState<string>('all'); // 'all', 'CSE', 'ECE', 'EEE', 'IT'
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Month navigation states
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Create Form States (Admin Only)
  const [showAddForm, setShowAddForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formCategory, setFormCategory] = useState<'academic' | 'exam' | 'cultural' | 'sports' | 'workshop'>('academic');
  const [formDept, setFormDept] = useState<string>('All');
  const [formType, setFormType] = useState<'event' | 'deadline'>('event');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize and load real-time events
  useEffect(() => {
    setLoading(true);
    const path = 'events';
    const unsubscribe = onSnapshot(
      collection(db, path),
      (snapshot) => {
        const list: CampusEvent[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as CampusEvent);
        });
        // Sort chronologically
        list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEvents(list);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribe();
  }, []);

  // For students and lecturers, filterDept defaults to their department or All
  useEffect(() => {
    if (userRole !== 'admin') {
      setFilterDept('my-dept');
    }
  }, [userRole]);

  // Handle Event / Deadline creation
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate || !formLocation.trim()) {
      alert("Error: Please provide title, scheduled date, and venue location.");
      return;
    }

    setIsSubmitting(true);
    const path = 'events';
    const newEventId = 'event_' + Date.now();
    const eventPayload: CampusEvent = {
      id: newEventId,
      title: formTitle.trim(),
      description: formDescription.trim() || 'No description provided.',
      date: formDate,
      location: formLocation.trim(),
      category: formCategory,
      createdBy: userName,
      department: formDept,
      type: formType
    };

    try {
      await setDoc(doc(db, path, newEventId), eventPayload);
      setFormTitle('');
      setFormDescription('');
      setFormDate('');
      setFormLocation('');
      setFormCategory('academic');
      setFormDept('All');
      setFormType('event');
      setShowAddForm(false);
      alert("Success: Departmental milestone published successfully!");
    } catch (err) {
      console.error("Failed to post event:", err);
      alert("Error: Could not save the event or deadline. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Event deletion
  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm("Are you sure you want to delete this event/deadline from the shared calendar?")) {
      return;
    }
    const path = `events/${eventId}`;
    try {
      await deleteDoc(doc(db, 'events', eventId));
      alert("Success: Event removed from the academic calendar.");
    } catch (err) {
      console.error("Failed to delete event:", err);
      alert("Error: Could not remove event from Firestore.");
    }
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar dates generation
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const totalDays = new Date(year, month + 1, 0).getDate();
  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Filter events based on selections
  const filteredEvents = events.filter(e => {
    // 1. Filter by Type
    if (filterType !== 'all') {
      const actualType = e.type || 'event';
      if (actualType !== filterType) return false;
    }

    // 2. Filter by Category
    if (filterCategory !== 'all' && e.category !== filterCategory) {
      return false;
    }

    // 3. Filter by Department
    if (userRole === 'admin') {
      if (filterDept !== 'all') {
        const dept = e.department || 'All';
        if (dept !== 'All' && dept !== filterDept) return false;
      }
    } else {
      // Students and Lecturers: 'my-dept' filters by their actual dept, 'all' shows everything
      if (filterDept === 'my-dept') {
        const dept = e.department || 'All';
        if (dept !== 'All' && dept !== userDepartment) return false;
      }
    }

    // 4. Filter by Calendar Selected Day
    if (selectedDay !== null) {
      const eventDate = new Date(e.date);
      if (
        eventDate.getFullYear() !== year ||
        eventDate.getMonth() !== month ||
        eventDate.getDate() !== selectedDay
      ) {
        return false;
      }
    }

    return true;
  });

  // Check if a specific day has events
  const getDayEvents = (dayNum: number) => {
    return events.filter(e => {
      const eventDate = new Date(e.date);
      return (
        eventDate.getFullYear() === year &&
        eventDate.getMonth() === month &&
        eventDate.getDate() === dayNum &&
        // apply global filters (except selected day filter itself)
        (filterType === 'all' || (e.type || 'event') === filterType) &&
        (filterCategory === 'all' || e.category === filterCategory) &&
        (userRole === 'admin' 
          ? (filterDept === 'all' || (e.department || 'All') === 'All' || (e.department || 'All') === filterDept)
          : (filterDept === 'all' || (e.department || 'All') === 'All' || (e.department || 'All') === userDepartment)
        )
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Stats */}
      <div className="bg-gradient-to-r from-slate-900 to-[#002147] p-6 rounded-2xl border border-slate-800 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30 uppercase tracking-wider">
            Academic Portal Synchronizer
          </span>
          <h2 className="text-xl font-extrabold tracking-tight mt-1">Shared Departmental Calendar</h2>
          <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
            Real-time hub for university schedules, mid-term examinations, assignment deadlines, and departmental activities.
          </p>
        </div>

        {/* Action Button for Admins */}
        {userRole === 'admin' && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-950/20 transition-all duration-150 cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>{showAddForm ? "Hide Event Panel" : "Post New Deadline/Event"}</span>
          </button>
        )}
      </div>

      {/* Admin Event Creation Drawer */}
      {userRole === 'admin' && showAddForm && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="p-1.5 bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 rounded-lg">
              <CalendarIcon size={16} />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-50">Publish New Milestone</h3>
              <p className="text-[10px] text-slate-400">Post academic events or assignment/exam deadlines that update immediately across all panels.</p>
            </div>
          </div>

          <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. CSE Mid-Semester Exam"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Department</label>
                <select
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-rose-500"
                >
                  <option value="All">📢 All Departments (General)</option>
                  <option value="CSE">CSE (Computer Science)</option>
                  <option value="ECE">ECE (Electronics & Comm)</option>
                  <option value="EEE">EEE (Electrical)</option>
                  <option value="IT">IT (Information Tech)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-rose-500"
                  >
                    <option value="event">🎉 Campus Event</option>
                    <option value="deadline">⏰ Critical Deadline</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none"
                  >
                    <option value="academic">Academic</option>
                    <option value="exam">Exam Milestone</option>
                    <option value="cultural">Cultural / Fest</option>
                    <option value="sports">Sports</option>
                    <option value="workshop">Technical Workshop</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  rows={4}
                  placeholder="Details, eligibility criteria, guidelines, specific syllabus, or important instructions..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-rose-500 font-sans"
                />
              </div>
            </div>

            <div className="md:col-span-3 flex flex-col justify-between space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Venue / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Block A, Exam Hall 102"
                  required
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
              >
                {isSubmitting ? "Publishing..." : "Publish to Calendar"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Main Grid: Filters, Calendar (Left) & Scheduled Details (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: interactive Monthly Calendar and Filter Panels */}
        <div className="lg:col-span-5 space-y-5">
          {/* Filters card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Filter size={12} className="text-indigo-500" />
              Calendar Filter Options
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              {/* Type Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Milestone Type</label>
                <div className="flex gap-1.5">
                  {(['all', 'event', 'deadline'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterType(type)}
                      className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-lg capitalize border cursor-pointer transition-all ${
                        filterType === type 
                          ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Target Audience</label>
                {userRole === 'admin' ? (
                  <select
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    className="w-full p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="all">🌐 Show All Departments</option>
                    <option value="CSE">CSE Stream Only</option>
                    <option value="ECE">ECE Stream Only</option>
                    <option value="EEE">EEE Stream Only</option>
                    <option value="IT">IT Stream Only</option>
                  </select>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFilterDept('all')}
                      className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                        filterDept === 'all'
                          ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300'
                      }`}
                    >
                      All University
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterDept('my-dept')}
                      className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                        filterDept === 'my-dept'
                          ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300'
                      }`}
                    >
                      My Dept ({userDepartment})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Category selection */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Academic Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">🎓 All Categories</option>
                <option value="academic">Academic Schedules</option>
                <option value="exam">Exam Milestones</option>
                <option value="cultural">Cultural / Festivals</option>
                <option value="sports">Sports Events</option>
                <option value="workshop">Technical Workshops</option>
              </select>
            </div>
          </div>

          {/* Interactive Month Grid */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-extrabold text-sm text-slate-850 dark:text-slate-100 font-mono">
                {monthLabel}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Month Day Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 dark:border-slate-800/50 pb-2">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Month Day Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Padding cells */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <div key={`pad-${idx}`} className="h-10 text-slate-300 dark:text-slate-800" />
              ))}

              {/* Day cells */}
              {Array.from({ length: totalDays }).map((_, idx) => {
                const dayNum = idx + 1;
                const isSelected = selectedDay === dayNum;
                const dayEventsList = getDayEvents(dayNum);
                const hasEvents = dayEventsList.length > 0;
                
                // Check if any event is a deadline
                const hasDeadlines = dayEventsList.some(e => e.type === 'deadline');

                return (
                  <button
                    key={`day-${dayNum}`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedDay(null); // Deselect
                      } else {
                        setSelectedDay(dayNum);
                      }
                    }}
                    className={`h-10 rounded-lg flex flex-col justify-between items-center p-1 cursor-pointer relative transition-all ${
                      isSelected 
                        ? 'bg-rose-600 text-white font-extrabold'
                        : 'bg-slate-50/50 hover:bg-slate-100 dark:bg-slate-950/20 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-mono">{dayNum}</span>
                    
                    {/* Visual markers for events and deadlines */}
                    {hasEvents && (
                      <div className="flex gap-0.5 justify-center w-full mb-0.5">
                        {hasDeadlines ? (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-rose-500'}`} />
                        ) : null}
                        {dayEventsList.some(e => (e.type || 'event') === 'event') ? (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                        ) : null}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDay !== null && (
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 text-[11px]">
                <span className="text-slate-500">
                  Showing events on <strong className="text-slate-700 dark:text-slate-200">{monthLabel.split(' ')[0]} {selectedDay}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: List of Scheduled Milestones */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-50 flex items-center gap-1.5">
                <Bookmark size={15} className="text-rose-600" />
                Scheduled Academic Timeline ({filteredEvents.length})
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Showing scheduled items matching your filters.</p>
            </div>
            
            {/* Legend info */}
            <div className="hidden sm:flex gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                Deadlines
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                Events
              </span>
            </div>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                <span>🔄 Synchronizing timeline registry...</span>
              </div>
            ) : filteredEvents.length > 0 ? (
              filteredEvents.map((e) => {
                const isDeadline = e.type === 'deadline';
                const eventDate = new Date(e.date);
                const formattedDate = eventDate.toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });

                return (
                  <div
                    key={e.id}
                    className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all hover:shadow-sm space-y-3 ${
                      isDeadline 
                        ? 'border-l-4 border-l-rose-500 border-slate-200 dark:border-slate-800'
                        : 'border-l-4 border-l-indigo-500 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isDeadline ? (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-extrabold text-[9px] uppercase tracking-wide flex items-center gap-1">
                              <Bell size={10} />
                              Deadline
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-[9px] uppercase tracking-wide flex items-center gap-1">
                              <CalendarIcon size={10} />
                              Event
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 font-semibold text-[9px]">
                            Department: {e.department || 'All'}
                          </span>

                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium text-[9px] capitalize">
                            {e.category}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mt-1">
                          {e.title}
                        </h4>
                      </div>

                      {/* Admin Deletion Action */}
                      {userRole === 'admin' && (
                        <button
                          onClick={() => handleDeleteEvent(e.id)}
                          title="Delete Milestone"
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {e.description}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock size={12} className="text-slate-400" />
                        <span>{formattedDate}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-slate-400" />
                        <span className="truncate" title={e.location}>{e.location}</span>
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-400 text-right italic pt-1">
                      Published by: {e.createdBy || 'Academic Coordinator'}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white dark:bg-slate-900 py-16 text-center border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                <span className="text-4xl">🌴</span>
                <p className="text-xs text-slate-400 font-medium italic">
                  No deadlines or events found matching the selected filters.
                </p>
                {selectedDay !== null && (
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="text-[11px] font-bold text-indigo-600 hover:underline mt-1"
                  >
                    View all dates in this month
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
