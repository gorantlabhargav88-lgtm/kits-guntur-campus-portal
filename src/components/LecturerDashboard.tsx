import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  db, 
  collection, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc,
  setDoc,
  deleteDoc
} from '../lib/firebase';
import { 
  UserProfile, 
  Assignment, 
  Submission, 
  Result, 
  Attendance, 
  CampusEvent,
  NoticeBoardItem,
  LeaveRequest
} from '../types';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  FileText, 
  GraduationCap, 
  Plus, 
  Save, 
  Sparkles, 
  User, 
  Users, 
  ChevronRight, 
  Check, 
  X, 
  AlertCircle,
  FileSpreadsheet,
  Camera
} from 'lucide-react';
import AeroAdvisor from './AeroAdvisor';
import DepartmentalCalendar from './DepartmentalCalendar';
import ProfileSettings from './ProfileSettings';

interface LecturerDashboardProps {
  lecturer: UserProfile;
}

export default function LecturerDashboard({ lecturer }: LecturerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'assignments' | 'grading' | 'results' | 'advisor' | 'notices_leaves' | 'calendar'>('attendance');
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  // Firestore datasets
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  // Notices & Leaves
  const [allNotices, setAllNotices] = useState<NoticeBoardItem[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);

  // Posting notices states
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeCategory, setNoticeCategory] = useState<'Academic' | 'Exams' | 'Placement' | 'General'>('Academic');
  const [isPostingNotice, setIsPostingNotice] = useState(false);

  // Resolving leave states
  const [resolvingLeaveId, setResolvingLeaveId] = useState<string | null>(null);
  const [deanRemarks, setDeanRemarks] = useState('');

  // Attendance marking states
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceSubject, setAttendanceSubject] = useState(
    lecturer.department === 'Computer Science & Engineering' ? 'Design & Analysis of Algorithms' : 'Analog Circuits & Signals'
  );
  const [tempAttendance, setTempAttendance] = useState<{ [studentId: string]: 'present' | 'absent' }>({});

  // Assignment creation states
  const [newAssignTitle, setNewAssignTitle] = useState('');
  const [newAssignDesc, setNewAssignDesc] = useState('');
  const [newAssignDueDate, setNewAssignDueDate] = useState('');
  const [newAssignSemester, setNewAssignSemester] = useState('Semester 3');
  const [simulatedPdfName, setSimulatedPdfName] = useState('lecture_materials.pdf');
  const [simulatedPdfUrl, setSimulatedPdfUrl] = useState('https://web.stanford.edu/class/ee261/reader.pdf');
  const [isCreatingAssign, setIsCreatingAssign] = useState(false);

  // Coursework grading states
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [gradeInput, setGradeInput] = useState('AA (Outstanding)');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isGrading, setIsGrading] = useState(false);

  // Record Results states
  const [selectedResultStudent, setSelectedResultStudent] = useState('');
  const [resultExamType, setResultExamType] = useState('Midterm');
  const [resultMarks, setResultMarks] = useState<number>(40);
  const [resultMaxMarks, setResultMaxMarks] = useState<number>(50);
  const [resultGrade, setResultGrade] = useState('AA (Outstanding)');
  const [isSavingResult, setIsSavingResult] = useState(false);

  // Quick Exam Correction States
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [editedResultMarks, setEditedResultMarks] = useState<number>(0);
  const [editedResultMaxMarks, setEditedResultMaxMarks] = useState<number>(0);
  const [editedResultGrade, setEditedResultGrade] = useState('AA (Outstanding)');
  const [isUpdatingResult, setIsUpdatingResult] = useState(false);

  // Refined Attendance States
  const [numClasses, setNumClasses] = useState<number>(1);
  const [searchRollInput, setSearchRollInput] = useState('');
  const [batchAbsentRollsInput, setBatchAbsentRollsInput] = useState('');
  const [rollActionFeedback, setRollActionFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load datasets
  useEffect(() => {
    // 1. Load students of CS / EE department depending on lecturer department
    const qStudents = query(
      collection(db, 'users'), 
      where('role', '==', 'student'),
      where('department', '==', lecturer.department)
    );
    const unsubscribeStudents = onSnapshot(qStudents, (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as UserProfile);
      });
      setStudents(list);

      // Pre-populate temp attendance map
      const initialMap: { [studentId: string]: 'present' | 'absent' } = {};
      list.forEach(s => {
        initialMap[s.id] = 'present';
      });
      setTempAttendance(initialMap);

      if (list.length > 0 && !selectedResultStudent) {
        setSelectedResultStudent(list[0].id);
      }
    });

    // 2. Load lecturer's assignments
    const qAssign = query(
      collection(db, 'assignments'),
      where('uploadedBy', '==', lecturer.id)
    );
    const unsubscribeAssign = onSnapshot(qAssign, (snapshot) => {
      const list: Assignment[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if (!d.archived) {
          list.push({ id: doc.id, ...d } as Assignment);
        }
      });
      setAssignments(list);
    });

    // 3. Load coursework submissions
    const unsubscribeSubmissions = onSnapshot(collection(db, 'submissions'), (snapshot) => {
      const list: Submission[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Submission);
      });
      setSubmissions(list);
    });

    // 4. Load exam results
    const qRes = query(
      collection(db, 'results'),
      where('recordedBy', '==', lecturer.id)
    );
    const unsubscribeResults = onSnapshot(qRes, (snapshot) => {
      const list: Result[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if (!d.archived) {
          list.push({ id: doc.id, ...d } as Result);
        }
      });
      setResults(list);
    });

    // 5. Load attendance logs marked by lecturer
    const qAtt = query(
      collection(db, 'attendance'),
      where('markedBy', '==', lecturer.id)
    );
    const unsubscribeAtt = onSnapshot(qAtt, (snapshot) => {
      const list: Attendance[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if (!d.archived) {
          list.push({ id: doc.id, ...d } as Attendance);
        }
      });
      setAttendance(list);
    });

    // 6. Notices Subscription
    const qNotices = query(collection(db, 'notices'));
    const unsubscribeNotices = onSnapshot(qNotices, (snapshot) => {
      const list: NoticeBoardItem[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as NoticeBoardItem);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllNotices(list);
    });

    // 7. Department-specific Leave Requests
    const qLeaves = query(
      collection(db, 'leave_requests'),
      where('department', '==', lecturer.department)
    );
    const unsubscribeLeaves = onSnapshot(qLeaves, (snapshot) => {
      const list: LeaveRequest[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as LeaveRequest);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllLeaves(list);
    });

    return () => {
      unsubscribeStudents();
      unsubscribeAssign();
      unsubscribeSubmissions();
      unsubscribeResults();
      unsubscribeAtt();
      unsubscribeNotices();
      unsubscribeLeaves();
    };
  }, [lecturer.id, lecturer.department]);

  // Post Notice Board Circular
  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      alert("Error: Please provide both notice title and content description.");
      return;
    }
    setIsPostingNotice(true);
    try {
      const noticeId = 'notice_' + Date.now();
      const item: NoticeBoardItem = {
        id: noticeId,
        title: noticeTitle.trim(),
        content: noticeContent.trim(),
        category: noticeCategory,
        postedBy: lecturer.id,
        postedByName: lecturer.name,
        postedByRole: 'Lecturer / Faculty',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'notices', noticeId), item);
      setNoticeTitle('');
      setNoticeContent('');
      alert("Success: Official announcement posted to notice board!");
    } catch (err) {
      console.error("Failed to post notice:", err);
      alert("Error posting notice circular. Try again.");
    } finally {
      setIsPostingNotice(false);
    }
  };

  // Resolve Student Leave/OD application
  const handleResolveLeave = async (leaveId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'leave_requests', leaveId), {
        status,
        remarks: deanRemarks.trim() || `${status === 'approved' ? 'Approved' : 'Rejected'} by Department Faculty Advisor`
      });
      setResolvingLeaveId(null);
      setDeanRemarks('');
      alert(`Success: Leave request marked as ${status}!`);
    } catch (err) {
      console.error("Failed to resolve leave request:", err);
      alert("Error updating leave request status. Try again.");
    }
  };

  // Mark Daily Attendance register in batch
  const handleMarkAttendance = async () => {
    try {
      const batchPromises = Object.entries(tempAttendance).map(async ([studentId, status]) => {
        const studentObj = students.find(s => s.id === studentId);
        if (!studentObj) return;

        const attId = `att_${studentId}_${attendanceSubject}_${attendanceDate}`;
        await setDoc(doc(db, 'attendance', attId), {
          attendanceId: attId,
          studentId,
          studentName: studentObj.name,
          subject: attendanceSubject,
          date: attendanceDate,
          status,
          semester: studentObj.semester || 'Semester 3',
          markedBy: lecturer.id,
          numClasses: Number(numClasses) || 1
        });
      });

      await Promise.all(batchPromises);
      alert(`Success: Class attendance (${numClasses} class(es)) for ${attendanceSubject} on ${attendanceDate} successfully synchronized to cloud!`);
    } catch (err) {
      console.error("Failed marking class attendance:", err);
      alert("Error: Failed to synchronize attendance to cloud.");
    }
  };

  // Single Roll Number Quick Mark
  const handleSingleRollAttendance = (status: 'present' | 'absent') => {
    const normalizedInput = searchRollInput.trim().toUpperCase();
    if (!normalizedInput) return;

    const foundStudent = students.find(s => s.rollNumber && s.rollNumber.trim().toUpperCase() === normalizedInput);
    if (foundStudent) {
      setTempAttendance(prev => ({
        ...prev,
        [foundStudent.id]: status
      }));
      setRollActionFeedback({
        type: 'success',
        text: `Marked Roll ${foundStudent.rollNumber} (${foundStudent.name}) as ${status.toUpperCase()}!`
      });
      setSearchRollInput('');
      setTimeout(() => setRollActionFeedback(null), 4000);
    } else {
      setRollActionFeedback({
        type: 'error',
        text: `Student with Roll Number "${normalizedInput}" not found in your department.`
      });
      setTimeout(() => setRollActionFeedback(null), 4000);
    }
  };

  // Batch Absentees by Roll Numbers
  const handleBatchAbsentRolls = () => {
    if (!batchAbsentRollsInput.trim()) return;
    const rollList = batchAbsentRollsInput
      .split(/[\s,;\n]+/)
      .map(r => r.trim().toUpperCase())
      .filter(r => r.length > 0);

    if (rollList.length === 0) return;

    let successCount = 0;
    let failedRolls: string[] = [];

    const updatedAttendance = { ...tempAttendance };

    rollList.forEach(roll => {
      const found = students.find(s => s.rollNumber && s.rollNumber.trim().toUpperCase() === roll);
      if (found) {
        updatedAttendance[found.id] = 'absent';
        successCount++;
      } else {
        failedRolls.push(roll);
      }
    });

    setTempAttendance(updatedAttendance);
    
    if (failedRolls.length > 0) {
      setRollActionFeedback({
        type: 'success',
        text: `Successfully marked ${successCount} students as ABSENT. Warning: ${failedRolls.length} rolls not found (${failedRolls.join(', ')}).`
      });
    } else {
      setRollActionFeedback({
        type: 'success',
        text: `Successfully marked all ${successCount} input roll numbers as ABSENT!`
      });
      setBatchAbsentRollsInput('');
    }
    
    setTimeout(() => setRollActionFeedback(null), 6000);
  };

  // Reset all class register states
  const handleResetAllAttendance = (status: 'present' | 'absent') => {
    const resetMap: { [studentId: string]: 'present' | 'absent' } = {};
    students.forEach(s => {
      resetMap[s.id] = status;
    });
    setTempAttendance(resetMap);
    setRollActionFeedback({
      type: 'success',
      text: `Reset entire class register status to ${status.toUpperCase()}!`
    });
    setTimeout(() => setRollActionFeedback(null), 3000);
  };

  // Create Assignment upload
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignTitle.trim() || !newAssignDueDate || isCreatingAssign) return;
    setIsCreatingAssign(true);

    try {
      const assignId = `assign_${Date.now()}`;
      await setDoc(doc(db, 'assignments', assignId), {
        id: assignId,
        title: newAssignTitle,
        description: newAssignDesc,
        subject: attendanceSubject,
        dueDate: newAssignDueDate,
        semester: newAssignSemester,
        uploadedBy: lecturer.id,
        pdfName: simulatedPdfName,
        pdfUrl: simulatedPdfUrl,
        createdAt: new Date().toISOString()
      });

      setNewAssignTitle('');
      setNewAssignDesc('');
      setNewAssignDueDate('');
      alert('Success: Assignment with PDF resources uploaded and broadcasted to students!');
    } catch (err) {
      console.error("Failed creating coursework:", err);
    } finally {
      setIsCreatingAssign(false);
    }
  };

  // Grade Homework Submissions
  const handleGradeSubmission = async () => {
    if (!selectedSub || isGrading) return;
    setIsGrading(true);

    try {
      await updateDoc(doc(db, 'submissions', selectedSub.id), {
        grade: gradeInput,
        feedback: feedbackInput,
        status: 'graded'
      });
      setSelectedSub(null);
      setFeedbackInput('');
      alert('Success: Student coursework grade compiled and published!');
    } catch (err) {
      console.error("Failed to compile grades:", err);
    } finally {
      setIsGrading(false);
    }
  };

  // Publish student exam marks
  const handlePublishResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResultStudent || isSavingResult) return;
    setIsSavingResult(true);

    try {
      const studentObj = students.find(s => s.id === selectedResultStudent);
      if (!studentObj) return;

      const resId = `res_${studentIdShortener(selectedResultStudent)}_${attendanceSubject}_${resultExamType}`;
      await setDoc(doc(db, 'results', resId), {
        id: resId,
        studentId: selectedResultStudent,
        studentName: studentObj.name,
        subject: attendanceSubject,
        examType: resultExamType,
        marks: Number(resultMarks),
        maxMarks: Number(resultMaxMarks),
        grade: resultGrade,
        semester: studentObj.semester || 'Semester 3',
        recordedBy: lecturer.id,
        createdAt: new Date().toISOString()
      });

      alert(`Success: Published ${resultExamType} grade for ${studentObj.name}!`);
    } catch (err) {
      console.error("Failed recording exam grade:", err);
    } finally {
      setIsSavingResult(false);
    }
  };

  // Update result record
  const handleUpdateResultRecord = async (resultId: string) => {
    setIsUpdatingResult(true);
    try {
      await updateDoc(doc(db, 'results', resultId), {
        marks: Number(editedResultMarks),
        maxMarks: Number(editedResultMaxMarks),
        grade: editedResultGrade
      });
      setEditingResultId(null);
      alert('Success: Updated student exam score card successfully.');
    } catch (err) {
      console.error("Failed to update exam marks:", err);
      alert('Error: Failed to update exam marks in Firestore.');
    } finally {
      setIsUpdatingResult(false);
    }
  };

  // Delete result record
  const handleDeleteResultRecord = async (resultId: string, studentName: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete the exam record for ${studentName}?`);
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'results', resultId));
      alert('Success: Student exam record deleted.');
    } catch (err) {
      console.error("Failed to delete exam record:", err);
      alert('Error: Failed to delete exam record from Firestore.');
    }
  };

  const studentIdShortener = (id: string) => id.replace('stud_', '');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      id="lecturer_dashboard" 
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative"
    >
      {/* Profile Settings Modal Overlay */}
      {showProfileSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg text-slate-800 dark:text-slate-200"
          >
            <ProfileSettings 
              user={lecturer} 
              onClose={() => setShowProfileSettings(false)} 
            />
          </motion.div>
        </div>
      )}
      {/* Sidebar navigation */}
      <motion.div 
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="lg:col-span-3 flex flex-col gap-3"
      >
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            {lecturer.photoURL ? (
              <img 
                src={lecturer.photoURL} 
                alt={lecturer.name} 
                className="w-11 h-11 rounded-xl object-cover border border-slate-700 shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <GraduationCap size={20} />
              </div>
            )}
            <div>
              <h3 className="font-bold text-sm leading-tight">{lecturer.name}</h3>
              <p className="text-[10px] text-amber-400 font-mono mt-0.5 max-w-[150px] truncate">{lecturer.email}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Dept:</span>
              <span className="font-medium">{lecturer.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Dept HoD:</span>
              <span className="font-medium text-amber-400">
                {lecturer.department === 'Computer Science & Engineering' ? 'Prof. R. Ramesh' : 'Dr. N. Adinarayana'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Class:</span>
              <span className="font-medium">{attendanceSubject}</span>
            </div>
          </div>

          <button
            onClick={() => setShowProfileSettings(true)}
            className="mt-3 w-full py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold text-[10.5px] rounded-xl border border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <Camera size={12} />
            Update Profile Photo
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {[
            { id: 'attendance', label: 'Class Attendance Log', icon: Users },
            { id: 'calendar', label: 'Departmental Calendar', icon: Calendar },
            { id: 'assignments', label: 'Create Assignments', icon: Plus },
            { id: 'grading', label: 'Coursework Grading', icon: CheckCircle, badge: submissions.filter(s => s.status === 'submitted').length },
            { id: 'results', label: 'Record Exam Results', icon: FileSpreadsheet },
            { id: 'notices_leaves', label: 'Notices & student Leaves', icon: FileSpreadsheet, badge: allLeaves.filter(l => l.status === 'pending').length },
            { id: 'advisor', label: 'AeroAdvisor AI', icon: Sparkles }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-100 dark:shadow-none' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </div>
                {tab.badge && tab.badge > 0 ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-white text-amber-600' : 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400'}`}>
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </motion.div>

      {/* Main Content Pane */}
      <motion.div 
        key={activeTab}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="lg:col-span-9 space-y-6"
      >

        {/* DEPARTMENTAL EVENT CALENDAR SUITE */}
        {activeTab === 'calendar' && (
          <div className="animate-in fade-in duration-200">
            <DepartmentalCalendar 
              userRole="lecturer" 
              userDepartment={lecturer.department || "All"} 
              userId={lecturer.id} 
              userName={lecturer.name} 
            />
          </div>
        )}

        {/* NOTICES AND STUDENT LEAVE APPLICATIONS */}
        {activeTab === 'notices_leaves' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Notices Panel */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <span>📢</span> JNTU Notice Publisher
                </h3>
                <p className="text-xs text-slate-500">Publish academic notices, exam announcements, or placement criteria to the student community.</p>
              </div>

              <form onSubmit={handlePostNotice} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Notice Category</label>
                  <select
                    value={noticeCategory}
                    onChange={(e) => setNoticeCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="Academic">📚 Academic Circular</option>
                    <option value="Exams">✍️ Exams & Results</option>
                    <option value="Placement">🚀 Placement Drive</option>
                    <option value="General">🔔 General Campus Notice</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Notice Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Mid-Term Exam Rescheduling Notice"
                    value={noticeTitle}
                    onChange={(e) => setNoticeTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Announcement Details</label>
                  <textarea
                    rows={4}
                    placeholder="Provide details about dates, syllabus, classrooms, eligibility, instructions..."
                    value={noticeContent}
                    onChange={(e) => setNoticeContent(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPostingNotice}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {isPostingNotice ? "Publishing Circular..." : "Publish Official Notice"}
                </button>
              </form>

              {/* Your recent posts */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Your Recent Notices</span>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {allNotices.filter(n => n.postedBy === lecturer.id).length > 0 ? (
                    allNotices.filter(n => n.postedBy === lecturer.id).map(n => (
                      <div key={n.id} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{n.title}</span>
                          <span className="text-[9px] text-slate-400 shrink-0">{new Date(n.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{n.content}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-400 italic py-2 text-center">You haven't posted any circulars yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Leaves Resolver Panel */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <span>📝</span> Student Leaves & OD Approvals
                </h3>
                <p className="text-xs text-slate-500">Review, approve, or reject casual leaves and On-Duty requests submitted by {lecturer.department} students.</p>
              </div>

              <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
                {allLeaves.length > 0 ? (
                  allLeaves.map((l) => (
                    <div key={l.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-3">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">{l.studentName}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{l.rollNumber} • {l.department}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            l.type === 'On-Duty' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {l.type}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                            l.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                            l.status === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                            'bg-slate-100 text-slate-600 dark:bg-slate-800 text-slate-300'
                          }`}>
                            {l.status}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Reason:</span>
                        "{l.reason}"
                      </div>

                      <div className="text-[10px] text-slate-400 flex justify-between">
                        <span>Requested dates: <strong>{l.startDate}</strong> to <strong>{l.endDate}</strong></span>
                        <span>Submitted {new Date(l.createdAt).toLocaleDateString()}</span>
                      </div>

                      {l.status === 'pending' ? (
                        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {resolvingLeaveId === l.id ? (
                            <div className="space-y-3">
                              <input
                                type="text"
                                placeholder="Add custom dean/advisor remarks or instructions..."
                                value={deanRemarks}
                                onChange={(e) => setDeanRemarks(e.target.value)}
                                className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleResolveLeave(l.id, 'approved')}
                                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                                >
                                  Confirm Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResolveLeave(l.id, 'rejected')}
                                  className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                                >
                                  Confirm Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResolvingLeaveId(null);
                                    setDeanRemarks('');
                                  }}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-lg transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setResolvingLeaveId(l.id);
                                setDeanRemarks('');
                              }}
                              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              Resolve Leave Application
                            </button>
                          )}
                        </div>
                      ) : (
                        l.remarks && (
                          <div className="p-2.5 bg-slate-100/50 dark:bg-slate-950/20 rounded-lg border border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-500">
                            <strong>Dean/HoD Remarks:</strong> {l.remarks}
                          </div>
                        )
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 space-y-2">
                    <span className="text-3xl">🌴</span>
                    <p className="text-xs text-slate-400 italic">No leaves or OD attendance requests submitted from your department.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 1. CLASS ATTENDANCE LOG */}
        {activeTab === 'attendance' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            {lecturer.permissions?.markAttendance === false ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-full border border-rose-100 dark:border-rose-900/30">
                  <AlertCircle size={36} className="animate-bounce" />
                </div>
                <div className="max-w-md space-y-1">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Attendance Logging Suspended</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    The College Management has suspended your authorization to log daily classroom attendance registers. Please consult the administrative board to configure permissions.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-50 flex items-center gap-2">
                      📋 Mark Classroom Register
                    </h3>
                    <p className="text-xs text-slate-500">
                      Configure class details, log attendance using roll numbers, or verify via the student roster below.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Department:</span>
                    <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-bold rounded-lg text-xs">
                      {lecturer.department}
                    </span>
                  </div>
                </div>

                {/* REDESIGNED CONTROLS CONTAINER */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 p-5 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800/80 rounded-2xl">
                  
                  {/* COLUMN 1: DATE & CLASS PERIODS CONFIG */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                      1. Session Schedule & Load
                    </h4>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                        Attendance Date
                      </label>
                      <input
                        type="date"
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 flex items-center justify-between">
                        <span>Number of Classes (Periods)</span>
                        <span className="text-amber-600 font-mono text-[11px] font-bold">{numClasses} hr(s)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNumClasses(prev => Math.max(1, prev - 1))}
                          className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-bold text-xs"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={8}
                          value={numClasses}
                          onChange={(e) => setNumClasses(Math.max(1, Number(e.target.value) || 1))}
                          className="w-full text-center text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setNumClasses(prev => Math.min(8, prev + 1))}
                          className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-bold text-xs"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Specify how many class hours this entry counts as.</p>
                    </div>
                  </div>

                  {/* COLUMN 2: SINGLE ROLL NUMBER TOOL */}
                  <div className="space-y-4 lg:border-l lg:border-r lg:border-slate-200/60 lg:dark:border-slate-800/60 lg:px-5">
                    <h4 className="text-xs font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                      2. Entry by Roll Number
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                          Scan / Type Student Roll Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 22JR1A0501"
                          value={searchRollInput}
                          onChange={(e) => setSearchRollInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSingleRollAttendance('present');
                            }
                          }}
                          className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono tracking-wider"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleSingleRollAttendance('present')}
                          className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-xl text-[10px] font-bold border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center gap-1 cursor-pointer transition"
                        >
                          <Check size={12} /> Mark Present
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSingleRollAttendance('absent')}
                          className="py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-xl text-[10px] font-bold border border-rose-100 dark:border-rose-900/30 flex items-center justify-center gap-1 cursor-pointer transition"
                        >
                          <X size={12} /> Mark Absent
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">Type roll number and select action to instantly update status.</p>
                    </div>
                  </div>

                  {/* COLUMN 3: BATCH ABSENTEES & BULK ACTIONS */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                      3. Bulk & Batch Action Register
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                          Bulk Absentees (Comma Separated)
                        </label>
                        <textarea
                          placeholder="e.g. 22JR1A0502, 22JR1A0512, 22JR1A0524"
                          value={batchAbsentRollsInput}
                          onChange={(e) => setBatchAbsentRollsInput(e.target.value)}
                          rows={2}
                          className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-xs placeholder:font-sans placeholder:tracking-normal"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleBatchAbsentRolls}
                          className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-850 dark:bg-amber-600 dark:hover:bg-amber-700 text-white rounded-xl text-[10px] font-bold shadow transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          Mark Batch Absent
                        </button>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleResetAllAttendance('present')}
                            title="Set everyone in roster to Present"
                            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-extrabold cursor-pointer border border-slate-200/50 dark:border-slate-700"
                          >
                            All ✔
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResetAllAttendance('absent')}
                            title="Set everyone in roster to Absent"
                            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-extrabold cursor-pointer border border-slate-200/50 dark:border-slate-700"
                          >
                            All ✖
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* VISUAL ACTION TOASTS FEEDBACK */}
                {rollActionFeedback && (
                  <div className={`p-3 rounded-xl border flex items-center gap-2 animate-pulse text-xs font-bold ${
                    rollActionFeedback.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
                  }`}>
                    {rollActionFeedback.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    <span>{rollActionFeedback.text}</span>
                  </div>
                )}

                {/* CURRENT ROSTER HEADLINE */}
                <div className="p-4 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/10 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Active Course: {attendanceSubject}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Roster synchronized with {lecturer.department} department databases.
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500">Seeded Students: <strong className="text-slate-700 dark:text-slate-300 font-mono">{students.length}</strong></span>
                    <span className="h-4 w-px bg-slate-200 dark:bg-slate-800"></span>
                    <span className="text-emerald-600 font-bold">Present: {Object.values(tempAttendance).filter(v => v === 'present').length}</span>
                    <span className="text-rose-600 font-bold">Absent: {Object.values(tempAttendance).filter(v => v === 'absent').length}</span>
                  </div>
                </div>

                {/* Attendance Register Table */}
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-slate-100 dark:border-slate-850 rounded-2xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-150 dark:border-slate-850 text-slate-400 dark:text-slate-500 bg-slate-50/55 dark:bg-slate-950/30">
                          <th className="py-3 px-4 font-bold uppercase text-[10px]">Student Name</th>
                          <th className="py-3 px-4 font-bold uppercase text-[10px]">Roll Number</th>
                          <th className="py-3 px-4 font-bold uppercase text-[10px]">Current Semester</th>
                          <th className="py-3 px-4 font-bold uppercase text-[10px] text-right">Status Option</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                        {students.map(s => {
                          const currentStatus = tempAttendance[s.id] || 'present';
                          return (
                            <tr key={s.id} className="text-slate-850 dark:text-slate-200 hover:bg-slate-50/40 dark:hover:bg-slate-950/10 transition">
                              <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">{s.name}</td>
                              <td className="py-3 px-4 text-slate-500 font-mono font-bold">{s.rollNumber}</td>
                              <td className="py-3 px-4 text-slate-400">{s.semester}</td>
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-850 overflow-hidden shadow-sm">
                                  <button
                                    onClick={() => setTempAttendance(prev => ({ ...prev, [s.id]: 'present' }))}
                                    className={`px-3 py-1.5 text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                                      currentStatus === 'present' 
                                        ? 'bg-emerald-600 text-white' 
                                        : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    <Check size={11} /> Present
                                  </button>
                                  <button
                                    onClick={() => setTempAttendance(prev => ({ ...prev, [s.id]: 'absent' }))}
                                    className={`px-3 py-1.5 text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                                      currentStatus === 'absent' 
                                        ? 'bg-rose-600 text-white' 
                                        : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    <X size={11} /> Absent
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {students.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center italic text-slate-400 dark:text-slate-500">
                              No students registered in the {lecturer.department} department.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-150 dark:border-slate-850">
                    <button
                      onClick={handleMarkAttendance}
                      className="px-5 py-2.5 bg-[#002147] hover:bg-[#002f63] dark:bg-amber-600 dark:hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-transform transform active:scale-95"
                    >
                      <Save size={14} /> Synchronize to Cloud
                    </button>
                  </div>
                </div>
            </>
            )}
          </div>
        )}

        {/* 2. CREATE ASSIGNMENTS / SYLLABUS */}
        {activeTab === 'assignments' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-50">Upload Assignment & Coursework</h3>
              <p className="text-xs text-slate-500">Provide coursework details and upload reference PDFs for students to download.</p>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Course Assignment Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Problem Set 3: Matrix Transformations"
                    value={newAssignTitle}
                    onChange={(e) => setNewAssignTitle(e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Target Semester Group</label>
                  <select
                    value={newAssignSemester}
                    onChange={(e) => setNewAssignSemester(e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="Semester 3">Semester 3</option>
                    <option value="Semester 4">Semester 4</option>
                    <option value="Semester 5">Semester 5</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newAssignDueDate}
                    onChange={(e) => setNewAssignDueDate(e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Subject Course</label>
                  <input
                    type="text"
                    disabled
                    value={attendanceSubject}
                    className="w-full text-xs p-3 bg-slate-100 dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              {/* Simulated PDF upload fields */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText size={14} className="text-rose-600" />
                  PDF Attachment Resource (KITS Guntur Course Materials)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1">Simulated File Name</label>
                    <input
                      type="text"
                      value={simulatedPdfName}
                      onChange={(e) => setSimulatedPdfName(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1">Simulated Cloud URL Path</label>
                    <input
                      type="text"
                      value={simulatedPdfUrl}
                      onChange={(e) => setSimulatedPdfUrl(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Detailed Assignment Syllabus & Instructions</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide complete problem formulation, question links, and required formats..."
                  value={newAssignDesc}
                  onChange={(e) => setNewAssignDesc(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isCreatingAssign}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-750 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  {isCreatingAssign ? 'Publishing...' : 'Broadcast Assignment with PDF'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3. COURSEWORK GRADING */}
        {activeTab === 'grading' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-50">Grade Student Homeworks</h3>
              <p className="text-xs text-slate-500">Review student answer uploads and publish marks/constructive remarks instantly.</p>
            </div>

            <div className="space-y-4">
              {submissions.filter(s => s.status === 'submitted').length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {submissions
                    .filter(s => s.status === 'submitted')
                    .map(sub => (
                      <div key={sub.id} className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col justify-between md:flex-row md:items-center gap-4">
                        <div>
                          <span className="text-[9px] px-2 py-0.5 bg-amber-50 dark:bg-amber-950 border border-amber-100 dark:border-amber-900 text-amber-700 font-bold rounded">
                            Pending Grade
                          </span>
                          <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100 mt-2">
                            {sub.studentName} — Course Assignment Answers
                          </h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Submitted: {new Date(sub.submittedAt).toLocaleString()}</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedSub(sub);
                            setFeedbackInput(sub.feedback || '');
                          }}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                        >
                          Review & Grade
                        </button>
                      </div>
                    ))
                  }
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-slate-400">
                  All submitted student courseworks are fully graded! Nice work!
                </div>
              )}
            </div>

            {/* GRADING MODAL */}
            {selectedSub && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 w-full max-w-lg">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">
                    Evaluate Answers: {selectedSub.studentName}
                  </h4>
                  <p className="text-xs text-slate-500 mb-3">Read student's response body, then assign grade.</p>

                  <div className="p-4 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300 rounded-xl border border-slate-100 dark:border-slate-800 max-h-40 overflow-y-auto mb-4 font-mono leading-relaxed whitespace-pre-wrap">
                    {selectedSub.content}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assign Grade Letter</label>
                      <select
                        value={gradeInput}
                        onChange={(e) => setGradeInput(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                      >
                        <option value="AA (Outstanding)">AA (Outstanding) [10 Pts]</option>
                        <option value="AB (Excellent)">AB (Excellent) [9 Pts]</option>
                        <option value="BB (Very Good)">BB (Very Good) [8 Pts]</option>
                        <option value="BC (Good)">BC (Good) [7 Pts]</option>
                        <option value="CC (Average)">CC (Average) [6 Pts]</option>
                        <option value="CD (Pass)">CD (Pass) [5 Pts]</option>
                        <option value="F (Fail)">F (Fail) [0 Pts]</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Feedback Remarks</label>
                    <textarea
                      rows={3}
                      placeholder="Add developmental remarks or feedback..."
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 mt-5">
                    <button
                      onClick={() => setSelectedSub(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGradeSubmission}
                      disabled={isGrading}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow"
                    >
                      {isGrading ? 'Publishing...' : 'Publish Evaluation'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. RECORD EXAM RESULTS */}
        {activeTab === 'results' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-50">Publish Student Exam Marks</h3>
              <p className="text-xs text-slate-500">Add official midterm, endsem, or quiz markings. Results are dynamically aggregated for student CGPA analysis.</p>
            </div>

            <form onSubmit={handlePublishResult} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Target Student Profile</label>
                  <select
                    value={selectedResultStudent}
                    onChange={(e) => setSelectedResultStudent(e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Evaluation Exam Type</label>
                  <select
                    value={resultExamType}
                    onChange={(e) => setResultExamType(e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  >
                    <option value="Midterm">Midterm Examination</option>
                    <option value="Endsem">End-Semester Evaluation</option>
                    <option value="Quiz">Class Quiz Assessment</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Marks Obtained</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={resultMarks}
                    onChange={(e) => setResultMarks(Number(e.target.value))}
                    className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Maximum Marks</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={resultMaxMarks}
                    onChange={(e) => setResultMaxMarks(Number(e.target.value))}
                    className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Assigned Grade Letter</label>
                  <select
                    value={resultGrade}
                    onChange={(e) => setResultGrade(e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  >
                    <option value="AA (Outstanding)">AA (Outstanding)</option>
                    <option value="AB (Excellent)">AB (Excellent)</option>
                    <option value="BB (Very Good)">BB (Very Good)</option>
                    <option value="BC (Good)">BC (Good)</option>
                    <option value="CC (Average)">CC (Average)</option>
                    <option value="CD (Pass)">CD (Pass)</option>
                    <option value="F (Fail)">F (Fail)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingResult}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-650 dark:hover:bg-amber-750 text-white font-bold text-xs rounded-xl shadow flex items-center gap-2 cursor-pointer"
                >
                  <Save size={14} /> Publish official score
                </button>
              </div>
            </form>

            {/* REGISTRY HISTORY OF PUBLISHED EXAM RESULTS */}
            <div className="pt-6 border-t border-slate-150 dark:border-slate-850 space-y-4">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  📁 Published Grades Registry ({results.filter(r => r.recordedBy === lecturer.id).length} Records)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Below is the historical registry of exam grades published by you. Use inline edit controls to make quick grade corrections.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-450 dark:text-slate-500 font-bold">
                      <th className="py-2.5">Student Name</th>
                      <th className="py-2.5">Exam Subject</th>
                      <th className="py-2.5">Exam Type</th>
                      <th className="py-2.5">Marks Obtained</th>
                      <th className="py-2.5">Grade Assigned</th>
                      <th className="py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {results
                      .filter(r => r.recordedBy === lecturer.id)
                      .map(r => {
                        const isEditing = editingResultId === r.id;
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                            <td className="py-3 font-bold text-slate-800 dark:text-slate-200">
                              {r.studentName}
                            </td>
                            <td className="py-3 text-slate-600 dark:text-slate-400">
                              {r.subject}
                            </td>
                            <td className="py-3 font-medium text-slate-500">
                              {r.examType}
                            </td>
                            <td className="py-3">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={editedResultMarks}
                                    onChange={(e) => setEditedResultMarks(Number(e.target.value))}
                                    className="w-14 p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 rounded text-xs"
                                  />
                                  <span className="text-slate-400">/</span>
                                  <input
                                    type="number"
                                    value={editedResultMaxMarks}
                                    onChange={(e) => setEditedResultMaxMarks(Number(e.target.value))}
                                    className="w-14 p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 rounded text-xs"
                                  />
                                </div>
                              ) : (
                                <span className="font-mono font-bold">
                                  {r.marks} / {r.maxMarks}
                                </span>
                              )}
                            </td>
                            <td className="py-3">
                              {isEditing ? (
                                <select
                                  value={editedResultGrade}
                                  onChange={(e) => setEditedResultGrade(e.target.value)}
                                  className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 rounded text-xs focus:outline-none"
                                >
                                  <option value="AA (Outstanding)">AA (Outstanding)</option>
                                  <option value="AB (Excellent)">AB (Excellent)</option>
                                  <option value="BB (Very Good)">BB (Very Good)</option>
                                  <option value="BC (Good)">BC (Good)</option>
                                  <option value="CC (Average)">CC (Average)</option>
                                  <option value="CD (Pass)">CD (Pass)</option>
                                  <option value="F (Fail)">F (Fail)</option>
                                </select>
                              ) : (
                                <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 text-[10px] font-bold rounded">
                                  {r.grade}
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              {isEditing ? (
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => handleUpdateResultRecord(r.id)}
                                    disabled={isUpdatingResult}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingResultId(null)}
                                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded text-[10px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setEditingResultId(r.id);
                                      setEditedResultMarks(r.marks);
                                      setEditedResultMaxMarks(r.maxMarks);
                                      setEditedResultGrade(r.grade);
                                    }}
                                    className="px-2 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded font-bold text-[10px] hover:bg-amber-500/20 cursor-pointer"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteResultRecord(r.id, r.studentName)}
                                    className="px-2 py-1 bg-red-500/10 text-red-600 border border-red-500/20 rounded font-bold text-[10px] hover:bg-red-500/20 cursor-pointer"
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    {results.filter(r => r.recordedBy === lecturer.id).length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 italic text-xs">
                          You have not published any student exam result grades yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. AI ADVISOR CHATBOT */}
        {activeTab === 'advisor' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-50">Lecturer AI Copilot</h3>
              <p className="text-xs text-slate-500">Generate syllabus timelines, draft tough midterm problem formulas, or analyze average class grade histograms.</p>
            </div>
            <AeroAdvisor userProfile={lecturer} />
          </div>
        )}

      </motion.div>
    </motion.div>
  );
}
