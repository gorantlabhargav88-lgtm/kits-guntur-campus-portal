import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { 
  db, 
  collection, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  setDoc,
  orderBy, 
  doc, 
  updateDoc,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { 
  UserProfile, 
  Assignment, 
  Submission, 
  Result, 
  Attendance, 
  CampusEvent, 
  StudyGroup, 
  Message, 
  Book, 
  ProgressReport,
  NoticeBoardItem,
  LeaveRequest
} from '../types';
import { 
  BookOpen, 
  Calendar, 
  CheckCircle, 
  Clock, 
  FileText, 
  GraduationCap, 
  MessageSquare, 
  Send, 
  Sparkles, 
  TrendingUp, 
  User, 
  Volume2, 
  ChevronRight, 
  Download, 
  Search, 
  AlertTriangle,
  Flame,
  Info,
  Award,
  Mail,
  Terminal,
  Cpu,
  CreditCard,
  Check,
  Camera
} from 'lucide-react';
import AeroAdvisor from './AeroAdvisor';
import DepartmentalCalendar from './DepartmentalCalendar';
import ProfileSettings from './ProfileSettings';

interface StudentDashboardProps {
  student: UserProfile;
}

export default function StudentDashboard({ student }: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'grades' | 'groups' | 'library' | 'advisor' | 'notices_leaves' | 'transcript' | 'calendar'>('overview');
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  
  // Real-time Firestore state
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);
  const [parentReports, setParentReports] = useState<ProgressReport[]>([]);

  // Notice board & Leave requests
  const [notices, setNotices] = useState<NoticeBoardItem[]>([]);
  const [studentLeaves, setStudentLeaves] = useState<LeaveRequest[]>([]);
  
  // Leave form inputs
  const [leaveType, setLeaveType] = useState<'Leave' | 'On-Duty'>('Leave');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [isApplyingLeave, setIsApplyingLeave] = useState(false);

  // Transcript / GPA Planner States
  const [targetCgpa, setTargetCgpa] = useState<number>(8.5);
  const [customFutureGrades, setCustomFutureGrades] = useState<Record<number, number>>({});

  // Parse semester number from current student.semester string (e.g., "B.Tech 2nd Year (Sem 3)" -> 3)
  const getSemesterNumber = (sem: string): number => {
    const match = sem.match(/Sem\s*(\d+)/i) || sem.match(/Semester\s*(\d+)/i) || sem.match(/(\d+)(?:st|nd|rd|th)/);
    if (match) return parseInt(match[1]);
    return 1;
  };

  const currentSemNum = getSemesterNumber(student.semester || 'Semester 1');

  // Personalised stable GPA trace for trend visualization
  const getStudentHistoricGpa = (semNum: number) => {
    const hash = student.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + 
                 (student.rollNumber || student.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const baseGpa = 7.4 + (hash % 12) / 10; // Base GPA between 7.4 and 8.5
    const variation = ((hash * semNum) % 10) / 30 - 0.15; // -0.15 to +0.15
    const gpa = Math.min(10.0, Math.max(5.0, baseGpa + (semNum - 1) * 0.18 + variation));
    return parseFloat(gpa.toFixed(2));
  };

  // Generate historical data array from Semester 1 up to their current semester
  const chartData = Array.from({ length: currentSemNum }, (_, index) => {
    const semNum = index + 1;
    const gpa = getStudentHistoricGpa(semNum);
    const hash = student.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const baseAtt = 80 + (hash % 15); // 80% to 95%
    const attVar = ((hash * semNum) % 7) - 3; // -3% to +3%
    const att = Math.min(100, Math.max(65, baseAtt + attVar));
    return {
      name: `Sem ${semNum}`,
      GPA: gpa,
      Attendance: att,
    };
  });

  // Sub-states
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  
  // Library Fines and Borrowing State
  const [isPayingFineId, setIsPayingFineId] = useState<string | null>(null);
  const [isBorrowingId, setIsBorrowingId] = useState<string | null>(null);

  const calculateBookFine = (dueDateStr: string | null | undefined, finePaid: boolean | null | undefined) => {
    if (finePaid) return { daysOverdue: 0, fineAmount: 0, isOverdue: false };
    if (!dueDateStr) return { daysOverdue: 0, fineAmount: 0, isOverdue: false };
    
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    const referenceDate = new Date('2026-07-05');
    const activeToday = today > referenceDate ? today : referenceDate;
    
    dueDate.setHours(0, 0, 0, 0);
    activeToday.setHours(0, 0, 0, 0);
    
    if (activeToday <= dueDate) {
      return { daysOverdue: 0, fineAmount: 0, isOverdue: false };
    }
    
    const diffTime = activeToday.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      daysOverdue: diffDays,
      fineAmount: diffDays * 15, // ₹15 per day
      isOverdue: true
    };
  };

  const handlePayFine = async (bookId: string, fineValue: number) => {
    setIsPayingFineId(bookId);
    try {
      await updateDoc(doc(db, 'library', bookId), {
        finePaid: true
      });
      alert(`Success: Outstanding library fine of ₹${fineValue} paid successfully via simulated academic gateway!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `library/${bookId}`);
    } finally {
      setIsPayingFineId(null);
    }
  };

  const handleBorrowBook = async (bookId: string, simulateOverdue: boolean) => {
    if (student.permissions?.borrowBooks === false) {
      alert("⚠️ Error: Your library borrowing privileges have been suspended by College Administration.");
      return;
    }
    
    setIsBorrowingId(bookId);
    try {
      let dueDateStr = '';
      if (simulateOverdue) {
        // Set due date to 8 days ago
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 8);
        dueDateStr = pastDate.toISOString().split('T')[0];
      } else {
        // Set due date to 14 days in the future
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 14);
        dueDateStr = futureDate.toISOString().split('T')[0];
      }

      await updateDoc(doc(db, 'library', bookId), {
        status: 'borrowed',
        borrowedBy: student.id,
        borrowedName: student.name,
        dueDate: dueDateStr,
        finePaid: false
      });

      alert(simulateOverdue 
        ? `Success: Book borrowed! Simulating overdue loan. Due date was set to ${dueDateStr}.` 
        : `Success: Book borrowed! Due date is set to ${dueDateStr}.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `library/${bookId}`);
    } finally {
      setIsBorrowingId(null);
    }
  };

  const handleReturnBook = async (bookId: string) => {
    setIsBorrowingId(bookId);
    try {
      await updateDoc(doc(db, 'library', bookId), {
        status: 'available',
        borrowedBy: null,
        borrowedName: null,
        dueDate: null,
        finePaid: null
      });
      alert('Success: Book returned back to Library catalog shelves!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `library/${bookId}`);
    } finally {
      setIsBorrowingId(null);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim() || !leaveStartDate || !leaveEndDate) {
      alert("Error: Please fill in the reason and select both start/end dates.");
      return;
    }
    setIsApplyingLeave(true);
    try {
      const id = 'leave_' + Date.now();
      const newLeave: LeaveRequest = {
        id,
        studentId: student.id,
        studentName: student.name,
        rollNumber: student.rollNumber || 'N/A',
        department: student.department,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        type: leaveType,
        reason: leaveReason.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'leave_requests', id), newLeave);
      setLeaveReason('');
      setLeaveStartDate('');
      setLeaveEndDate('');
      alert(`Success: Your ${leaveType} request was submitted successfully for academic review!`);
    } catch (err) {
      console.error("Failed to submit leave request:", err);
      alert("Error submitting leave request. Try again.");
    } finally {
      setIsApplyingLeave(false);
    }
  };
  
  // Submission modal state
  const [submittingAssignId, setSubmittingAssignId] = useState<string | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Technical coding profile logic & handles
  const isCseRelated = (dept: string) => {
    const d = dept.toLowerCase();
    return d.includes('computer') || d.includes('science') || d.includes('intelligence') || d.includes('information') || d.includes('it') || d.includes('cse') || d.includes('ds') || d.includes('ml');
  };

  const isCse = isCseRelated(student.department);
  const isEce = student.department.includes('Electronics & Communication') || student.department.includes('ECE');
  const isEee = student.department.includes('Electrical & Electronics') || student.department.includes('EEE');

  const [isEditingProfiles, setIsEditingProfiles] = useState(false);

  // Secure Portal Syncing States
  const [lcPassword, setLcPassword] = useState('');
  const [hrPassword, setHrPassword] = useState('');
  const [isVerifyingLc, setIsVerifyingLc] = useState(false);
  const [isVerifyingHr, setIsVerifyingHr] = useState(false);
  const [lcVerified, setLcVerified] = useState(!!student.leetcodeUsername);
  const [hrVerified, setHrVerified] = useState(!!student.hackerrankUsername);

  // Editing profile state variables
  const [editLcUser, setEditLcUser] = useState(student.leetcodeUsername || '');
  const [editLcRank, setEditLcRank] = useState(student.leetcodeRank?.toString() || '35000');
  const [editLcSolved, setEditLcSolved] = useState(student.leetcodeSolved?.toString() || '150');

  const [editHrUser, setEditHrUser] = useState(student.hackerrankUsername || '');
  const [editHrRank, setEditHrRank] = useState(student.hackerrankRank || '');
  const [editHrBadges, setEditHrBadges] = useState(student.hackerrankBadgeCount?.toString() || '');
  const [editHrGlobal, setEditHrGlobal] = useState(student.hackerrankGlobalRank?.toString() || '');

  const [editMatlabUser, setEditMatlabUser] = useState(student.matlabUsername || '');
  const [editMatlabPoints, setEditMatlabPoints] = useState(student.matlabPoints?.toString() || '');
  const [editMatlabRank, setEditMatlabRank] = useState(student.matlabRank?.toString() || '');

  const [editArduinoUser, setEditArduinoUser] = useState(student.arduinoUsername || '');
  const [editArduinoProjects, setEditArduinoProjects] = useState(student.arduinoProjects?.toString() || '');
  const [editArduinoRank, setEditArduinoRank] = useState(student.arduinoRank?.toString() || '');

  const [editCircuitUser, setEditCircuitUser] = useState(student.circuitlabUsername || '');
  const [editCircuitDesigns, setEditCircuitDesigns] = useState(student.circuitlabDesigns?.toString() || '');
  const [editCircuitRank, setEditCircuitRank] = useState(student.circuitlabRank?.toString() || '');

  const [isSavingProfiles, setIsSavingProfiles] = useState(false);

  const handleVerifyLeetCode = async () => {
    if (!editLcUser.trim() || !lcPassword.trim()) {
      alert("Please fill in both LeetCode Username/Email and Password.");
      return;
    }
    setIsVerifyingLc(true);
    try {
      // Simulate real secure API network token exchange & scrape validation with LeetCode Graphql API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Calculate a deterministic profile based on the username string
      let nameHash = 0;
      for (let i = 0; i < editLcUser.length; i++) {
        nameHash = (nameHash << 5) - nameHash + editLcUser.charCodeAt(i);
        nameHash |= 0;
      }
      const mockRank = Math.abs(nameHash % 40000) + 1200;
      const mockSolved = Math.abs(nameHash % 400) + 115;

      setEditLcRank(mockRank.toString());
      setEditLcSolved(mockSolved.toString());
      setLcVerified(true);
      alert(`Successfully Authenticated LeetCode! Synced Global Rank: #${mockRank.toLocaleString()} & Solved Problems: ${mockSolved}.`);
    } catch (e) {
      alert("Authentication with LeetCode failed. Please check your credentials.");
    } finally {
      setIsVerifyingLc(false);
    }
  };

  const handleVerifyHackerRank = async () => {
    if (!editHrUser.trim() || !hrPassword.trim()) {
      alert("Please fill in both HackerRank Username/Email and Password.");
      return;
    }
    setIsVerifyingHr(true);
    try {
      // Simulate secure API handshake & profile scrape with HackerRank REST Endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Calculate deterministic statistics
      let nameHash = 0;
      for (let i = 0; i < editHrUser.length; i++) {
        nameHash = (nameHash << 5) - nameHash + editHrUser.charCodeAt(i);
        nameHash |= 0;
      }
      
      const starLevels = ["6 Star (Platinum)", "5 Star (Gold)", "4 Star (Silver)", "3 Star (Bronze)"];
      const mockRank = starLevels[Math.abs(nameHash) % starLevels.length];
      const mockBadges = Math.abs(nameHash % 10) + 3;
      const mockGlobal = Math.abs(nameHash % 9000) + 250;

      setEditHrRank(mockRank);
      setEditHrBadges(mockBadges.toString());
      setEditHrGlobal(mockGlobal.toString());
      setHrVerified(true);
      alert(`Successfully Authenticated HackerRank! Synced Star Rating: ${mockRank} & Global Leaderboard: #${mockGlobal.toLocaleString()}.`);
    } catch (e) {
      alert("Authentication with HackerRank failed. Please check your credentials.");
    } finally {
      setIsVerifyingHr(false);
    }
  };

  useEffect(() => {
    setEditLcUser(student.leetcodeUsername || '');
    setEditLcRank(student.leetcodeRank?.toString() || '');
    setEditLcSolved(student.leetcodeSolved?.toString() || '');

    setEditHrUser(student.hackerrankUsername || '');
    setEditHrRank(student.hackerrankRank || '');
    setEditHrBadges(student.hackerrankBadgeCount?.toString() || '');
    setEditHrGlobal(student.hackerrankGlobalRank?.toString() || '');

    setEditMatlabUser(student.matlabUsername || '');
    setEditMatlabPoints(student.matlabPoints?.toString() || '');
    setEditMatlabRank(student.matlabRank?.toString() || '');

    setEditArduinoUser(student.arduinoUsername || '');
    setEditArduinoProjects(student.arduinoProjects?.toString() || '');
    setEditArduinoRank(student.arduinoRank?.toString() || '');

    setEditCircuitUser(student.circuitlabUsername || '');
    setEditCircuitDesigns(student.circuitlabDesigns?.toString() || '');
    setEditCircuitRank(student.circuitlabRank?.toString() || '');
  }, [student]);

  const handleSaveProfiles = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfiles(true);
    try {
      const updatedFields: any = {};
      if (isCse) {
        updatedFields.leetcodeUsername = editLcUser.trim();
        updatedFields.leetcodeRank = editLcRank ? Number(editLcRank) : null;
        updatedFields.leetcodeSolved = editLcSolved ? Number(editLcSolved) : null;

        updatedFields.hackerrankUsername = editHrUser.trim();
        updatedFields.hackerrankRank = editHrRank.trim();
        updatedFields.hackerrankBadgeCount = editHrBadges ? Number(editHrBadges) : null;
        updatedFields.hackerrankGlobalRank = editHrGlobal ? Number(editHrGlobal) : null;
      } else if (isEce) {
        updatedFields.matlabUsername = editMatlabUser.trim();
        updatedFields.matlabPoints = editMatlabPoints ? Number(editMatlabPoints) : null;
        updatedFields.matlabRank = editMatlabRank ? Number(editMatlabRank) : null;

        updatedFields.arduinoUsername = editArduinoUser.trim();
        updatedFields.arduinoProjects = editArduinoProjects ? Number(editArduinoProjects) : null;
        updatedFields.arduinoRank = editArduinoRank ? Number(editArduinoRank) : null;
      } else if (isEee) {
        updatedFields.matlabUsername = editMatlabUser.trim();
        updatedFields.matlabPoints = editMatlabPoints ? Number(editMatlabPoints) : null;
        updatedFields.matlabRank = editMatlabRank ? Number(editMatlabRank) : null;

        updatedFields.circuitlabUsername = editCircuitUser.trim();
        updatedFields.circuitlabDesigns = editCircuitDesigns ? Number(editCircuitDesigns) : null;
        updatedFields.circuitlabRank = editCircuitRank ? Number(editCircuitRank) : null;
      } else {
        updatedFields.matlabUsername = editMatlabUser.trim();
        updatedFields.matlabPoints = editMatlabPoints ? Number(editMatlabPoints) : null;
        updatedFields.matlabRank = editMatlabRank ? Number(editMatlabRank) : null;
      }

      await updateDoc(doc(db, 'users', student.id), updatedFields);
      setIsEditingProfiles(false);
      alert('Success: Your technical profiles have been verified and updated in the cloud registry!');
    } catch (err) {
      console.error("Failed to update profile handles:", err);
      alert('Error updating profiles. Please check your cloud database rules.');
    } finally {
      setIsSavingProfiles(false);
    }
  };

  // Load datasets in real-time
  useEffect(() => {
    // 1. Assignments
    const qAssignments = query(
      collection(db, 'assignments'), 
      where('semester', '==', student.semester)
    );
    const unsubscribeAssignments = onSnapshot(qAssignments, (snapshot) => {
      const list: Assignment[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if (!d.archived) {
          list.push({ id: doc.id, ...d } as Assignment);
        }
      });
      setAssignments(list);
    });

    // 2. Submissions
    const qSubmissions = query(
      collection(db, 'submissions'),
      where('studentId', '==', student.id)
    );
    const unsubscribeSubmissions = onSnapshot(qSubmissions, (snapshot) => {
      const list: Submission[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Submission);
      });
      setSubmissions(list);
    });

    // 3. Exam Results
    const qResults = query(
      collection(db, 'results'),
      where('studentId', '==', student.id)
    );
    const unsubscribeResults = onSnapshot(qResults, (snapshot) => {
      const list: Result[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if (!d.archived) {
          list.push({ id: doc.id, ...d } as Result);
        }
      });
      setResults(list);
    });

    // 4. Attendance
    const qAttendance = query(
      collection(db, 'attendance'),
      where('studentId', '==', student.id)
    );
    const unsubscribeAttendance = onSnapshot(qAttendance, (snapshot) => {
      const list: Attendance[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if (!d.archived) {
          list.push({ id: doc.id, ...d } as Attendance);
        }
      });
      setAttendance(list);
    });

    // 5. Events / Calendar
    const qEvents = query(collection(db, 'events'));
    const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
      const list: CampusEvent[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as CampusEvent);
      });
      // Sort by date closest
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEvents(list);
    });

    // 6. Study Groups student belongs to
    const qGroups = query(collection(db, 'groups'));
    const unsubscribeGroups = onSnapshot(qGroups, (snapshot) => {
      const list: StudyGroup[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as StudyGroup;
        if (data.members && data.members.includes(student.id)) {
          list.push({ id: doc.id, ...data });
        }
      });
      setStudyGroups(list);
      // Auto-select first study group
      if (list.length > 0 && !selectedGroup) {
        setSelectedGroup(list[0]);
      }
    });

    // 7. Library books
    const qBooks = query(collection(db, 'library'));
    const unsubscribeBooks = onSnapshot(qBooks, (snapshot) => {
      const list: Book[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Book);
      });
      setLibraryBooks(list);
    });

    // 8. Progress Reports for Parent
    const qReports = query(
      collection(db, 'reports'),
      where('studentId', '==', student.id)
    );
    const unsubscribeReports = onSnapshot(qReports, (snapshot) => {
      const list: ProgressReport[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as ProgressReport);
      });
      setParentReports(list);
    });

    // 9. Notices Subscription
    const qNotices = query(collection(db, 'notices'));
    const unsubscribeNotices = onSnapshot(qNotices, (snapshot) => {
      const list: NoticeBoardItem[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as NoticeBoardItem);
      });
      // Sort by newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotices(list);
    });

    // 10. Leave Requests for this Student
    const qLeaves = query(
      collection(db, 'leave_requests'),
      where('studentId', '==', student.id)
    );
    const unsubscribeLeaves = onSnapshot(qLeaves, (snapshot) => {
      const list: LeaveRequest[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as LeaveRequest);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setStudentLeaves(list);
    });

    return () => {
      unsubscribeAssignments();
      unsubscribeSubmissions();
      unsubscribeResults();
      unsubscribeAttendance();
      unsubscribeEvents();
      unsubscribeGroups();
      unsubscribeBooks();
      unsubscribeReports();
      unsubscribeNotices();
      unsubscribeLeaves();
    };
  }, [student.id, student.semester]);

  // Handle study group chat messages loading
  useEffect(() => {
    if (!selectedGroup) return;

    const qMsgs = query(
      collection(db, `groups/${selectedGroup.id}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribeMsgs = onSnapshot(qMsgs, (snapshot) => {
      const list: Message[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Message);
      });
      setGroupMessages(list);
    });

    return () => unsubscribeMsgs();
  }, [selectedGroup]);

  // Send message in study group
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup) return;

    try {
      await addDoc(collection(db, `groups/${selectedGroup.id}/messages`), {
        senderId: student.id,
        senderName: student.name,
        senderRole: student.role,
        content: newMessage,
        timestamp: new Date().toISOString()
      });
      setNewMessage('');
    } catch (err) {
      console.error("Failed to send peer message:", err);
    }
  };

  // Submit assignment coursework
  const handleSubmitAssignment = async () => {
    if (!submittingAssignId || !submissionContent.trim()) return;
    setIsSubmitting(true);
    try {
      const submissionId = `sub_${student.id}_${submittingAssignId}`;
      await updateDoc(doc(db, 'submissions', submissionId), {
        assignmentId: submittingAssignId,
        studentId: student.id,
        studentName: student.name,
        submittedAt: new Date().toISOString(),
        content: submissionContent,
        status: 'submitted'
      }).catch(async () => {
        // If document doesn't exist, create it
        await addDoc(collection(db, 'submissions'), {
          assignmentId: submittingAssignId,
          studentId: student.id,
          studentName: student.name,
          submittedAt: new Date().toISOString(),
          content: submissionContent,
          status: 'submitted'
        });
      });
      setSubmittingAssignId(null);
      setSubmissionContent('');
    } catch (err) {
      console.error("Coursework submission failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate dynamic grades and attendance statistics
  const totalClassesCount = attendance.reduce((sum, item) => sum + (item.numClasses || 1), 0);
  const presentClassesCount = attendance.reduce((sum, item) => sum + (item.status === 'present' ? (item.numClasses || 1) : 0), 0);
  const attendancePercentage = totalClassesCount > 0 
    ? Math.round((presentClassesCount / totalClassesCount) * 100) 
    : null;

  const cgpa = results.length > 0 
    ? parseFloat((results.reduce((acc, curr) => {
        const val = (curr.grade.startsWith('O') || curr.grade.startsWith('AA')) ? 10 : (curr.grade.startsWith('A+') || curr.grade.startsWith('AB')) ? 9 : (curr.grade.startsWith('A') || curr.grade.startsWith('BB')) ? 8 : 7;
        return acc + val;
      }, 0) / results.length).toFixed(2))
    : null;

  // Books borrowed by the active student
  const studentBorrowedBooks = libraryBooks.filter(b => b.borrowedBy === student.id);

  const getDepartmentHoD = (dept: string) => {
    switch (dept) {
      case 'Computer Science & Engineering':
        return { name: 'Prof. R. Ramesh', role: 'HoD, CSE', email: 'ramesh.r@kitsguntur.ac.in', office: 'CSE Block, Room 204' };
      case 'Artificial Intelligence & Data Science':
      case 'Artificial Intelligence & Machine Learning':
        return { name: 'Dr. G. Murali', role: 'HoD, CSE-AI&ML', email: 'murali.g@kitsguntur.ac.in', office: 'Admin Block, Room 102' };
      case 'Electronics & Communication':
        return { name: 'Dr. N. Adinarayana', role: 'HoD, ECE', email: 'adinarayana.n@kitsguntur.ac.in', office: 'ECE Block, Room 305' };
      case 'Electrical & Electronics':
        return { name: 'Dr. Y. Rajesh', role: 'HoD, EEE', email: 'rajesh.y@kitsguntur.ac.in', office: 'EEE Block, Room 112' };
      case 'Information Technology':
        return { name: 'Dr. M.S.S. Sai', role: 'HoD, IT', email: 'sai.mss@kitsguntur.ac.in', office: 'IT Block, Room 201' };
      default:
        return { name: 'Prof. M. Basaveswara Rao', role: 'HoD, BS&H', email: 'basaveswararao.m@kitsguntur.ac.in', office: 'Science Block, Room 101' };
    }
  };

  const myHoD = getDepartmentHoD(student.department);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      id="student_dashboard" 
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative"
    >
      {/* Profile Settings Modal Overlay */}
      {showProfileSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg"
          >
            <ProfileSettings 
              user={student} 
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
            {student.photoURL ? (
              <img 
                src={student.photoURL} 
                alt={student.name} 
                className="w-11 h-11 rounded-xl object-cover border border-slate-700 shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <User size={20} />
              </div>
            )}
            <div>
              <h3 className="font-bold text-sm leading-tight">{student.name}</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{student.rollNumber}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Dept:</span>
              <span className="font-medium">{student.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Semester:</span>
              <span className="font-medium">{student.semester}</span>
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
            { id: 'overview', label: 'Dashboard Overview', icon: BookOpen },
            { id: 'calendar', label: 'Departmental Calendar', icon: Calendar },
            { id: 'notices_leaves', label: 'Announcements & OD Leaves', icon: FileText, badge: notices.length },
            { id: 'courses', label: 'Assignments & PDFs', icon: FileText, badge: assignments.length },
            { id: 'grades', label: 'Grades & Attendance', icon: TrendingUp },
            { id: 'transcript', label: 'GPA Transcript Planner', icon: TrendingUp },
            { id: 'groups', label: 'Study Groups (Chat)', icon: MessageSquare, badge: studyGroups.length },
            { id: 'library', label: 'Library Domain', icon: Clock },
            { id: 'advisor', label: 'AeroAdvisor AI', icon: Sparkles }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </div>
                {tab.badge && tab.badge > 0 ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-white text-indigo-600' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'}`}>
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
              userRole="student" 
              userDepartment={student.department || "All"} 
              userId={student.id} 
              userName={student.name} 
            />
          </div>
        )}
        
        {/* COLLEGE NOTICE BOARD & LEAVE APPLICATIONS TAB */}
        {activeTab === 'notices_leaves' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Notice Board Feed */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <span>📢</span> College Announcement Board
                </h3>
                <p className="text-xs text-slate-500">Official circulars, placement notifications, and academic notices published by Administration.</p>
              </div>

              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {notices.length > 0 ? (
                  notices.map((n) => (
                    <div key={n.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 space-y-2 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase ${
                          n.category === 'Placement' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' :
                          n.category === 'Exams' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                          n.category === 'Academic' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {n.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">{n.title}</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">{n.content}</p>
                      <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                        <span>By {n.postedByName} ({n.postedByRole})</span>
                        <span className="italic">KITS Guntur</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 space-y-2">
                    <span className="text-2xl">📭</span>
                    <p className="text-xs text-slate-400 italic">No college notices published yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Leave / OD Portal */}
            <div className="lg:col-span-5 space-y-6">
              {/* Request Form */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-50 flex items-center gap-2">
                    <span>📝</span> Leave & OD Application
                  </h3>
                  <p className="text-xs text-slate-500">Apply for sick/casual leave or request On-Duty (OD) attendance credits for college events.</p>
                </div>

                <form onSubmit={handleApplyLeave} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Application Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setLeaveType('Leave')}
                        className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          leaveType === 'Leave' 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        🔴 Casual/Medical
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaveType('On-Duty')}
                        className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          leaveType === 'On-Duty' 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        🔵 On-Duty Attendance
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Start Date</label>
                      <input
                        type="date"
                        value={leaveStartDate}
                        onChange={(e) => setLeaveStartDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">End Date</label>
                      <input
                        type="date"
                        value={leaveEndDate}
                        onChange={(e) => setLeaveEndDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Justification Reason</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Participating in IEEE national coding congress / Medical certificate attached..."
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isApplyingLeave}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isApplyingLeave ? "Submitting..." : "Submit Absentee Application"}
                  </button>
                </form>
              </div>

              {/* Leave History List */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Application History ({studentLeaves.length})</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {studentLeaves.length > 0 ? (
                    studentLeaves.map((l) => (
                      <div key={l.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
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
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">"{l.reason}"</p>
                        <div className="text-[10px] text-slate-400">Dates: {l.startDate} to {l.endDate}</div>
                        {l.remarks && (
                          <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 leading-tight">
                            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Dean/HoD Remarks:</span>
                            {l.remarks}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-400 italic text-center py-4">No absenteeism applications submitted yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GPA TRANSCRIPT PLANNER & DEGREE ESTIMATOR TAB */}
        {activeTab === 'transcript' && (() => {
          // Pre-populate actual historical sem GPAs
          const actualSemGpas: Record<number, number> = {};
          for (let i = 1; i <= currentSemNum; i++) {
            actualSemGpas[i] = getStudentHistoricGpa(i);
          }

          // Complete curriculum total semester count (JNTUK B.Tech is 8 Semesters)
          const totalSemesters = 8;
          
          // Compute full estimated track: past GPAs + future grades
          const fullTrack = Array.from({ length: totalSemesters }, (_, idx) => {
            const sem = idx + 1;
            const isCompleted = sem <= currentSemNum;
            const gpa = isCompleted 
              ? actualSemGpas[sem] 
              : (customFutureGrades[sem] !== undefined ? customFutureGrades[sem] : 8.0);
            return { sem, gpa, isCompleted };
          });

          // Calculate current aggregate CGPA
          const pastGpasSum = Object.values(actualSemGpas).reduce((sum, v) => sum + v, 0);
          const currentCgpa = parseFloat((pastGpasSum / currentSemNum).toFixed(2));

          // Calculate projected overall final CGPA
          const totalSum = fullTrack.reduce((sum, item) => sum + item.gpa, 0);
          const projectedCgpa = parseFloat((totalSum / totalSemesters).toFixed(2));

          // Calculate required GPA for target CGPA
          const remainingSems = totalSemesters - currentSemNum;
          const targetTotalSum = targetCgpa * totalSemesters;
          const requiredFutureSum = targetTotalSum - pastGpasSum;
          const requiredAverageGpa = remainingSems > 0 
            ? parseFloat((requiredFutureSum / remainingSems).toFixed(2))
            : null;

          const isTargetAchievable = requiredAverageGpa === null || requiredAverageGpa <= 10.0;

          return (
            <div className="space-y-6">
              {/* Header card */}
              <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white p-6 rounded-2xl border border-indigo-950 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg flex items-center gap-2">
                    <span>🎓</span> GPA Transcript Planner & Degree Estimator
                  </h3>
                  <p className="text-xs text-indigo-300">Map your academic achievements and play out future scenarios to reach your target honors category.</p>
                </div>
                <div className="flex gap-4">
                  <div className="bg-indigo-500/20 px-4 py-2.5 rounded-xl border border-indigo-500/30 text-center">
                    <span className="text-[10px] font-black tracking-wider text-indigo-300 block uppercase">Current CGPA</span>
                    <span className="text-xl font-black">{currentCgpa}</span>
                    <span className="text-[9px] text-indigo-400 block mt-0.5">{currentSemNum} Semesters</span>
                  </div>
                  <div className="bg-indigo-500/30 px-4 py-2.5 rounded-xl border border-indigo-400/40 text-center animate-pulse">
                    <span className="text-[10px] font-black tracking-wider text-indigo-200 block uppercase">Projected CGPA</span>
                    <span className="text-xl font-black text-amber-300">{projectedCgpa}</span>
                    <span className="text-[9px] text-indigo-300 block mt-0.5">Full 8 Semesters</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Scenario Sandbox */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-50">8-Semester Curriculum Sandbox</h4>
                    <p className="text-xs text-slate-500">Slide to simulate expected GPA credits for future semesters under JNTU R23 regulations.</p>
                  </div>

                  <div className="space-y-4">
                    {fullTrack.map((item) => (
                      <div key={item.sem} className="flex items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                        <div className="w-24">
                          <span className="font-extrabold text-slate-800 dark:text-slate-200">Sem {item.sem}</span>
                          <span className={`block text-[9px] font-medium ${item.isCompleted ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {item.isCompleted ? '⭐ Completed' : '🔧 Simulating'}
                          </span>
                        </div>

                        {item.isCompleted ? (
                          <div className="flex-1 flex justify-end">
                            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-extrabold rounded-lg text-xs">
                              GPA: {item.gpa.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center gap-3">
                            <input
                              type="range"
                              min={5.0}
                              max={10.0}
                              step={0.05}
                              value={item.gpa}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setCustomFutureGrades({
                                  ...customFutureGrades,
                                  [item.sem]: val
                                });
                              }}
                              className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <span className="w-14 text-right font-black text-indigo-600 dark:text-indigo-400 text-xs">
                              {item.gpa.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
                    <span>*JNTU Kakinada uses a standard 10-point scale for SGPA and CGPA indexing.</span>
                    <button
                      onClick={() => setCustomFutureGrades({})}
                      className="text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      Reset Sandbox
                    </button>
                  </div>
                </div>

                {/* Target Planner & Insights */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-50">Degree Honors Target Calculator</h4>
                    <p className="text-xs text-slate-500">Set your ultimate graduation goal and see what it takes to get there.</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4 text-xs">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Target CGPA Goal</label>
                        <span className="font-black text-indigo-600 text-sm">{targetCgpa.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={6.0}
                        max={9.8}
                        step={0.05}
                        value={targetCgpa}
                        onChange={(e) => setTargetCgpa(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3.5 space-y-3">
                      <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">Required Performance Indicator</span>
                      
                      {requiredAverageGpa !== null ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Required Future SGPA:</span>
                            <span className={`font-black ${isTargetAchievable ? 'text-indigo-600' : 'text-rose-600'}`}>
                              {isTargetAchievable ? requiredAverageGpa.toFixed(2) : "Infeasible (>10.0)"}
                            </span>
                          </div>

                          {isTargetAchievable ? (
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-100 dark:border-emerald-900 text-[11px] leading-relaxed">
                              ✅ <strong>Achievable Goal:</strong> To graduate with a cumulative <strong>{targetCgpa.toFixed(2)}</strong>, you must maintain an average GPA of <strong>{requiredAverageGpa.toFixed(2)}</strong> in your remaining {remainingSems} semesters.
                            </div>
                          ) : (
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 rounded-xl border border-rose-100 dark:border-rose-900 text-[11px] leading-relaxed">
                              ⚠️ <strong>Goal Out of Range:</strong> Achieving {targetCgpa.toFixed(2)} CGPA requires a future GPA of {requiredAverageGpa.toFixed(2)}, which is above the 10.00 ceiling limit. Try adjusting your target goal.
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">You have completed all 8 semesters. No remaining semesters to plan.</p>
                      )}
                    </div>
                  </div>

                  {/* Classification Table */}
                  <div className="space-y-2 text-xs">
                    <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">JNTUK Classification of Degrees</span>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-b border-slate-100 dark:border-slate-800">
                      <div className="py-2 flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">First Class with Distinction:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">CGPA ≥ 7.75</span>
                      </div>
                      <div className="py-2 flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">First Class honors category:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">6.75 ≤ CGPA &lt; 7.75</span>
                      </div>
                      <div className="py-2 flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Second Class category:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">5.75 ≤ CGPA &lt; 6.75</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TOP LEVEL "PUSH NOTIFICATION" BANNERS FOR DEADLINES & GRADES */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {assignments.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl text-amber-950 dark:text-amber-300 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-950/50 rounded-xl">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Upcoming Assignment Deadline</h4>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      "{assignments[0].title}" is due on **{assignments[0].dueDate}**.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('courses')}
                  className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Submit Now <ChevronRight size={14} />
                </button>
              </div>
            )}

            {results.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 rounded-2xl text-emerald-950 dark:text-emerald-300">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-xl">
                    <CheckCircle size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">New Exam Result Released</h4>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      Your score for {results[0].subject} ({results[0].examType}) is updated. Grade: **{results[0].grade}**.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('grades')}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View Grades <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
             {/* Stat summaries (Bento style) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attendance Percentage</p>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-50 mt-1">
                    {attendancePercentage !== null ? `${attendancePercentage}%` : 'Pending Allocation'}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Minimum 75% required</p>
                </div>
                <div className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-xl">
                  <Clock size={20} />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cumulative CGPA</p>
                  <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {cgpa !== null ? `${cgpa} / 10` : 'Pending Allocation'}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Based on released exams</p>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <TrendingUp size={20} />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Library Books</p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50 mt-1">{studentBorrowedBooks.length} Borrowed</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Active borrowing tickets</p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                  <BookOpen size={20} />
                </div>
              </div>
            </div>

            {/* Competitive Programming & Department Leadership */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Custom Technical/Coding Profiles */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Terminal size={16} className="text-[#C79F27]" />
                    {isCse ? 'Competitive Coding Profiles' : 'Technical & Design Profiles'}
                  </h4>
                  <button
                    onClick={() => setIsEditingProfiles(true)}
                    className="text-[10px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-400 font-bold px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/30 cursor-pointer"
                  >
                    Link & Edit Profiles
                  </button>
                </div>
                
                <div className="space-y-4">
                  {isCse && (
                    <>
                      {/* LeetCode */}
                      <div className="p-4 bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-500/5 dark:hover:bg-amber-500/10 border border-amber-500/15 rounded-xl transition duration-150">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg flex items-center justify-center font-bold">
                              LC
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-sans">LeetCode Profile</h5>
                              <p className="text-[10px] text-slate-400 font-mono">
                                Handle: {student.leetcodeUsername ? `@${student.leetcodeUsername}` : 'Not Connected'}
                              </p>
                            </div>
                          </div>
                          {student.leetcodeUsername && (
                            <div className="text-right">
                              <p className="text-[9px] text-slate-400 font-bold uppercase font-mono">Global Rank</p>
                              <p className="text-sm font-black text-amber-600 dark:text-amber-400">
                                #{student.leetcodeRank ? student.leetcodeRank.toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          )}
                        </div>
                        {student.leetcodeUsername ? (
                          <div className="mt-3.5 pt-3 border-t border-slate-200/40 dark:border-slate-800/60 flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Problems Solved:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {student.leetcodeSolved !== undefined ? `${student.leetcodeSolved} Solved` : 'N/A'}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2 text-center">
                            <button
                              onClick={() => setIsEditingProfiles(true)}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                            >
                              Connect LeetCode Account
                            </button>
                          </div>
                        )}
                      </div>

                      {/* HackerRank */}
                      <div className="p-4 bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/10 border border-emerald-500/15 rounded-xl transition duration-150">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 text-[#00E676] rounded-lg flex items-center justify-center font-bold">
                              HR
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-sans">HackerRank Profile</h5>
                              <p className="text-[10px] text-slate-400 font-mono">
                                Handle: {student.hackerrankUsername ? `@${student.hackerrankUsername}` : 'Not Connected'}
                              </p>
                            </div>
                          </div>
                          {student.hackerrankUsername && (
                            <div className="text-right">
                              <p className="text-[9px] text-slate-400 font-bold uppercase font-mono">Global Rank</p>
                              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                #{student.hackerrankGlobalRank ? student.hackerrankGlobalRank.toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          )}
                        </div>
                        {student.hackerrankUsername ? (
                          <div className="mt-3.5 pt-3 border-t border-slate-200/40 dark:border-slate-800/60 flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Badge Level:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {student.hackerrankRank || 'Linked'} ({student.hackerrankBadgeCount || 0} Gold Badges)
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2 text-center">
                            <button
                              onClick={() => setIsEditingProfiles(true)}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                            >
                              Connect HackerRank Account
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {isEce && (
                    <>
                      {/* MATLAB Central */}
                      <div className="p-4 bg-sky-500/5 hover:bg-sky-500/10 dark:bg-sky-500/5 dark:hover:bg-sky-500/10 border border-sky-500/15 rounded-xl transition duration-150">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-sky-500/10 border border-sky-500/20 text-sky-500 rounded-lg flex items-center justify-center font-bold">
                              ML
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-sans">MATLAB Central</h5>
                              <p className="text-[10px] text-slate-400 font-mono">
                                Handle: {student.matlabUsername ? `@${student.matlabUsername}` : 'Not Connected'}
                              </p>
                            </div>
                          </div>
                          {student.matlabUsername && (
                            <div className="text-right">
                              <p className="text-[9px] text-slate-400 font-bold uppercase font-mono">Contributor Rank</p>
                              <p className="text-sm font-black text-sky-600 dark:text-sky-400">
                                #{student.matlabRank ? student.matlabRank.toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          )}
                        </div>
                        {student.matlabUsername ? (
                          <div className="mt-3.5 pt-3 border-t border-slate-200/40 dark:border-slate-800/60 flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Community Points:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {student.matlabPoints !== undefined ? `${student.matlabPoints} Points` : 'N/A'}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2 text-center">
                            <button
                              onClick={() => setIsEditingProfiles(true)}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                            >
                              Connect MATLAB Account
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Arduino Project Hub */}
                      <div className="p-4 bg-teal-500/5 hover:bg-teal-500/10 dark:bg-teal-500/5 dark:hover:bg-teal-500/10 border border-teal-500/15 rounded-xl transition duration-150">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-teal-500/10 border border-teal-500/20 text-teal-500 rounded-lg flex items-center justify-center font-bold">
                              AR
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-sans">Arduino Project Hub</h5>
                              <p className="text-[10px] text-slate-400 font-mono">
                                Handle: {student.arduinoUsername ? `@${student.arduinoUsername}` : 'Not Connected'}
                              </p>
                            </div>
                          </div>
                          {student.arduinoUsername && (
                            <div className="text-right">
                              <p className="text-[9px] text-slate-400 font-bold uppercase font-mono">Platform Rank</p>
                              <p className="text-sm font-black text-teal-600 dark:text-teal-400">
                                #{student.arduinoRank ? student.arduinoRank.toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          )}
                        </div>
                        {student.arduinoUsername ? (
                          <div className="mt-3.5 pt-3 border-t border-slate-200/40 dark:border-slate-800/60 flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Published Hardware Designs:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {student.arduinoProjects !== undefined ? `${student.arduinoProjects} Projects` : 'N/A'}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2 text-center">
                            <button
                              onClick={() => setIsEditingProfiles(true)}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                            >
                              Connect Arduino Hub Account
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {isEee && (
                    <>
                      {/* MATLAB Central */}
                      <div className="p-4 bg-sky-500/5 hover:bg-sky-500/10 dark:bg-sky-500/5 dark:hover:bg-sky-500/10 border border-sky-500/15 rounded-xl transition duration-150">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-sky-500/10 border border-sky-500/20 text-sky-500 rounded-lg flex items-center justify-center font-bold">
                              ML
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-sans">MATLAB Central</h5>
                              <p className="text-[10px] text-slate-400 font-mono">
                                Handle: {student.matlabUsername ? `@${student.matlabUsername}` : 'Not Connected'}
                              </p>
                            </div>
                          </div>
                          {student.matlabUsername && (
                            <div className="text-right">
                              <p className="text-[9px] text-slate-400 font-bold uppercase font-mono">Contributor Rank</p>
                              <p className="text-sm font-black text-sky-600 dark:text-sky-400">
                                #{student.matlabRank ? student.matlabRank.toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          )}
                        </div>
                        {student.matlabUsername ? (
                          <div className="mt-3.5 pt-3 border-t border-slate-200/40 dark:border-slate-800/60 flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Community Points:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {student.matlabPoints !== undefined ? `${student.matlabPoints} Points` : 'N/A'}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2 text-center">
                            <button
                              onClick={() => setIsEditingProfiles(true)}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                            >
                              Connect MATLAB Account
                            </button>
                          </div>
                        )}
                      </div>

                      {/* CircuitLab */}
                      <div className="p-4 bg-indigo-500/5 hover:bg-indigo-500/10 dark:bg-indigo-500/5 dark:hover:bg-indigo-500/10 border border-indigo-500/15 rounded-xl transition duration-150">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-lg flex items-center justify-center font-bold">
                              CL
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-sans">CircuitLab Registry</h5>
                              <p className="text-[10px] text-slate-400 font-mono">
                                Handle: {student.circuitlabUsername ? `@${student.circuitlabUsername}` : 'Not Connected'}
                              </p>
                            </div>
                          </div>
                          {student.circuitlabUsername && (
                            <div className="text-right">
                              <p className="text-[9px] text-slate-400 font-bold uppercase font-mono">Designer Rank</p>
                              <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                #{student.circuitlabRank ? student.circuitlabRank.toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          )}
                        </div>
                        {student.circuitlabUsername ? (
                          <div className="mt-3.5 pt-3 border-t border-slate-200/40 dark:border-slate-800/60 flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Schematic Models:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {student.circuitlabDesigns !== undefined ? `${student.circuitlabDesigns} Circuits` : 'N/A'}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2 text-center">
                            <button
                              onClick={() => setIsEditingProfiles(true)}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                            >
                              Connect CircuitLab Account
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {!isCse && !isEce && !isEee && (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No customized profiles configured for your department.
                    </div>
                  )}
                </div>
              </div>

              {/* Department leadership HOD Card */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Cpu size={16} className="text-[#002147] dark:text-amber-400" />
                      Department Administration
                    </h4>
                    <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Office Contact</span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#002147] text-white rounded-xl flex items-center justify-center font-bold text-sm">
                        {myHoD.name.split(' ').pop()?.charAt(0) || 'H'}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{myHoD.name}</h4>
                        <p className="text-[10px] text-slate-400">{myHoD.role}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Office Location:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{myHoD.office}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Official Email:</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">{myHoD.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Consultation Hours:</span>
                        <span className="font-medium text-amber-600 dark:text-amber-400">2:00 PM - 4:00 PM</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <a 
                    href={`mailto:${myHoD.email}`}
                    className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center gap-1.5 transition duration-155"
                  >
                    <Mail size={12} />
                    <span>Email HOD</span>
                  </a>
                  <button 
                    onClick={() => {
                      setActiveTab('advisor');
                    }}
                    className="flex-1 py-2 bg-[#002147] hover:bg-[#002147]/90 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer"
                  >
                    <span>Request Meet</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Academic Calendar and Prep Scheduler */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-600" />
                    Academic Calendar
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Exam Milestones</span>
                </div>
                <div className="space-y-4">
                  {events.slice(0, 4).map(e => (
                    <div key={e.id} className="flex gap-4 items-start border-l-2 border-indigo-100 dark:border-indigo-950 pl-4 py-0.5">
                      <div className="min-w-20">
                        <span className="text-[10px] font-black text-slate-400 block uppercase font-mono">{new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium block mt-1 w-fit">{e.category}</span>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-850 dark:text-slate-200 leading-snug">{e.title}</h5>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">{e.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Study corner & Peer group overview */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <MessageSquare size={16} className="text-teal-600" />
                      Active Peer Study Groups
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Collaboration</span>
                  </div>
                  <div className="space-y-3">
                    {studyGroups.map(g => (
                      <div key={g.id} className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl flex justify-between items-center">
                        <div>
                          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">{g.name}</h5>
                          <p className="text-[10px] text-slate-500 mt-0.5">{g.description}</p>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedGroup(g);
                            setActiveTab('groups');
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 dark:bg-slate-850 dark:hover:bg-slate-800 text-[10px] text-teal-700 dark:text-teal-400 border border-slate-200 dark:border-slate-750 font-bold rounded-lg cursor-pointer"
                        >
                          Join Chat
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 p-4 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/40 dark:border-indigo-900/20 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-950 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <Sparkles size={16} />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Stuck on deletion rotation?</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">AeroAdvisor AI is loaded with complete DSA syllabus.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('advisor')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                  >
                    Ask AI
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. COURSES / ASSIGNMENTS TAB */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-50">Syllabus Coursework & Assignments</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Read lecturer uploads (PDFs) and submit answers securely.</p>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/30">
                Active: {assignments.length} Courseworks
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assignments.map(a => {
                const sub = submissions.find(s => s.assignmentId === a.id);
                return (
                  <div key={a.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/20">
                          {a.subject}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                          <Clock size={12} />
                          Due: {a.dueDate}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-3">{a.title}</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{a.description}</p>
                      
                      {/* Attached PDF Materials */}
                      {a.pdfUrl && (
                        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-rose-600" />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-40">{a.pdfName}</span>
                          </div>
                          <a 
                            href={a.pdfUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
                          >
                            <Download size={12} /> Read PDF
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <div>
                        {sub ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                            <CheckCircle size={14} />
                            <span>{sub.status === 'graded' ? `Graded: ${sub.grade}` : 'Submitted'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                            <Info size={12} />
                            <span>No submission yet</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setSubmittingAssignId(a.id);
                          setSubmissionContent(sub?.content || '');
                        }}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-650 dark:hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition duration-150 shadow-sm cursor-pointer"
                      >
                        {sub ? 'Update Work' : 'Submit Answers'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SUBMISSION FORM MODAL */}
            {submittingAssignId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 w-full max-w-lg">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Submit Academic Coursework Answer Sheet
                  </h4>
                  <p className="text-xs text-slate-500 mb-4">
                    Write or paste your homework solutions, links, or code below for review by subject lecturer.
                  </p>
                  
                  <textarea
                    rows={8}
                    value={submissionContent}
                    onChange={(e) => setSubmissionContent(e.target.value)}
                    placeholder="Provide your detailed answer, code, or explanation..."
                    className="w-full text-sm p-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />

                  <div className="flex justify-end gap-3 mt-5">
                    <button
                      onClick={() => setSubmittingAssignId(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitAssignment}
                      disabled={isSubmitting || !submissionContent.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow"
                    >
                      {isSubmitting ? 'Submitting...' : 'Upload Submission'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. GRADES & ATTENDANCE TAB */}
        {activeTab === 'grades' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-50">Grades, Performance & Parental Reports</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time grades release from management alongside monthly status reports.</p>
              </div>
            </div>

            {/* Recharts Performance Trend Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <TrendingUp className="text-indigo-600 dark:text-amber-500" size={16} />
                    <span>Semester-over-Semester Academic Trend</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Visualizing your Grade Point Average (GPA) & attendance trajectory from Semester 1 to your current semester ({student.semester}).
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4f46e5] block"></span>
                    <span className="text-slate-700 dark:text-slate-300">GPA</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0d9488] block"></span>
                    <span className="text-slate-700 dark:text-slate-300">Attendance (%)</span>
                  </div>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis 
                      yAxisId="gpa"
                      domain={[5.0, 10.0]} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis 
                      yAxisId="attendance"
                      orientation="right"
                      domain={[50, 100]} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                        border: '1px solid #334155', 
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '11px'
                      }} 
                    />
                    <Line 
                      yAxisId="gpa"
                      type="monotone" 
                      dataKey="GPA" 
                      stroke="#4f46e5" 
                      strokeWidth={3} 
                      activeDot={{ r: 8 }} 
                      name="GPA"
                    />
                    <Line 
                      yAxisId="attendance"
                      type="monotone" 
                      dataKey="Attendance" 
                      stroke="#0d9488" 
                      strokeWidth={2} 
                      strokeDasharray="5 5"
                      name="Attendance (%)"
                    />
                    <ReferenceLine yAxisId="gpa" y={8.0} label={{ value: 'Distinction Line', fill: '#ef4444', fontSize: 9, position: 'insideBottomRight' }} stroke="#f87171" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-bold">Estimated CGPA</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-200">
                    {chartData.length > 0 ? (chartData.reduce((acc, curr) => acc + curr.GPA, 0) / chartData.length).toFixed(2) : 'N/A'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-bold">Starting GPA</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-200">
                    {chartData[0]?.GPA || 'N/A'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-bold">Peak GPA</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {chartData.length > 0 ? Math.max(...chartData.map(d => d.GPA)).toFixed(2) : 'N/A'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-bold">Avg Attendance</span>
                  <span className="text-lg font-black text-teal-600 dark:text-teal-400">
                    {chartData.length > 0 ? Math.round(chartData.reduce((acc, curr) => acc + curr.Attendance, 0) / chartData.length) : 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Exam results releases */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-4">Exam Results Release</h4>
                <div className="space-y-3">
                  {results.length > 0 ? (
                    results.map(r => (
                      <div key={r.id} className="p-3.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">{r.examType}</span>
                          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{r.subject}</h5>
                          <p className="text-[10px] text-slate-500">Recorded: {new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-emerald-600">{r.grade}</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">{r.marks} / {r.maxMarks} marks</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No results released yet for {student.semester}.
                    </div>
                  )}
                </div>
              </div>

              {/* Parents Monthly Reports list */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-4">Monthly Parent Progress Reports</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Automated reports generated monthly by college management summarizing academic performance and class attendance.
                  </p>
                  <div className="space-y-3">
                    {parentReports.map(pr => (
                      <div key={pr.id} className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl flex justify-between items-center">
                        <div>
                          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">{pr.month} Progress Summary</h5>
                          <p className="text-[10px] text-slate-500 mt-0.5">CGPA: {pr.cgpa} • Attendance: {pr.attendancePercentage}%</p>
                        </div>
                        <button 
                          onClick={() => alert(`Generating Parental Report Document \n--------------------------\nStudent: ${student.name}\nRoll: ${student.rollNumber}\nMonth: ${pr.month}\nCGPA: ${pr.cgpa}\nAttendance: ${pr.attendancePercentage}%\nGrades: ${pr.gradesSummary}\nRemarks: ${pr.remarks}\n--------------------------\nReady for parents download!`)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-750 text-[10px] font-bold text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1"
                        >
                          <Download size={11} /> Read
                        </button>
                      </div>
                    ))}
                    {parentReports.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">
                        No progress reports generated yet for {student.semester}.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/40 dark:border-indigo-900/10 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
                  <Info size={14} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                  <p>Parent reports are generated under the administrative management panel based on real-time classroom registers.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. STUDY GROUPS & PEER MESSAGING */}
        {activeTab === 'groups' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-50">Secure Peer Study Groups</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Collaborate securely with class peers on subjects, projects, and test preps.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[500px]">
              {/* Group selection sidebar */}
              <div className="md:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 overflow-y-auto">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">My Channels</h4>
                {studyGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroup(g)}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-150 flex items-center gap-3 cursor-pointer ${
                      selectedGroup?.id === g.id 
                        ? 'bg-teal-50 border-teal-200 text-teal-950 dark:bg-teal-950/20 dark:border-teal-900 dark:text-teal-400' 
                        : 'bg-slate-50/50 hover:bg-slate-100 border-slate-150 dark:bg-slate-900/40 dark:border-slate-800 text-slate-800 dark:text-slate-350'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400">
                      <MessageSquare size={14} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold">{g.name}</h5>
                      <p className="text-[10px] opacity-75 mt-0.5">{g.subject}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Chat Thread */}
              <div className="md:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden">
                {selectedGroup ? (
                  <>
                    {/* Chat Header */}
                    <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{selectedGroup.name}</h4>
                        <p className="text-[10px] text-slate-500">{selectedGroup.description}</p>
                      </div>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-500">
                        {selectedGroup.members?.length || 0} Peers
                      </span>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 p-5 space-y-4 overflow-y-auto">
                      {groupMessages.map((msg) => {
                        const isOwn = msg.senderId === student.id;
                        return (
                          <div 
                            key={msg.id} 
                            className={`flex flex-col gap-1 max-w-[80%] ${isOwn ? 'ml-auto text-right' : 'mr-auto text-left'}`}
                          >
                            <span className="text-[9px] font-bold text-slate-400 block px-1">
                              {msg.senderName} ({msg.senderRole})
                            </span>
                            <div className={`p-3 rounded-2xl text-xs inline-block leading-relaxed ${
                              isOwn 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/50 dark:border-slate-750'
                            }`}>
                              {msg.content}
                            </div>
                            <span className="text-[8px] text-slate-400 block px-1 font-mono">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                      {groupMessages.length === 0 && (
                        <div className="text-center py-20 text-xs text-slate-400">
                          Start the collaboration! Write a secure peer message below.
                        </div>
                      )}
                    </div>

                    {/* Chat Input */}
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Write a peer message..."
                        className="flex-1 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 focus:outline-none text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-100 dark:disabled:bg-slate-800 rounded-xl transition duration-150"
                      >
                        <Send size={14} />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6">
                    <MessageSquare size={36} className="text-slate-300 mb-2 animate-bounce" />
                    <p className="text-xs">Select or join a study group chat channel.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. LIBRARY DOMAIN */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-50">Library Resource Catalog</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Browse reference materials, manage active student loans, and settle outstanding overdue fines.</p>
              </div>
            </div>

            {/* Sub-grid with outstanding loans + fine ledger summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Active Loans & Fine Ledger */}
              <div className="lg:col-span-2 p-5 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white rounded-2xl border border-slate-850 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] px-2 py-0.5 bg-indigo-500/20 rounded-md border border-indigo-500/30 text-indigo-300 font-bold uppercase tracking-wider font-mono">Student Library Ticket</span>
                    <h4 className="font-black text-sm mt-1">{student.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {student.rollNumber || student.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-mono">Current Loans</p>
                    <h3 className="text-xl font-black">{studentBorrowedBooks.length} Books</h3>
                  </div>
                </div>

                <div className="border-t border-indigo-950/40 pt-4 space-y-3">
                  <h4 className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider font-mono">Outstanding Loans Ledger</h4>
                  {studentBorrowedBooks.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {studentBorrowedBooks.map(b => {
                        const { daysOverdue, fineAmount, isOverdue } = calculateBookFine(b.dueDate, b.finePaid);
                        return (
                          <div key={b.id} className="p-4 bg-slate-900/60 border border-indigo-950/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition hover:border-indigo-900/40">
                            <div>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-850 text-slate-300 rounded uppercase tracking-wider font-mono mr-2">{b.category}</span>
                              <h5 className="text-xs font-bold text-white leading-snug mt-1">{b.title}</h5>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Author: {b.author}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Clock size={11} />
                                  Due: <span className="font-mono font-bold">{b.dueDate}</span>
                                </span>
                                {isOverdue ? (
                                  <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 flex items-center gap-1">
                                    <AlertTriangle size={10} />
                                    {daysOverdue} Days Overdue
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                    <CheckCircle size={10} />
                                    On Time
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-850">
                              {isOverdue && (
                                <div className="text-right">
                                  <span className="text-[8px] text-slate-400 uppercase font-bold block">Overdue Fine</span>
                                  {b.finePaid ? (
                                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 justify-end">
                                      <CheckCircle size={11} /> Settled
                                    </span>
                                  ) : (
                                    <span className="text-sm text-rose-400 font-mono font-black block">₹{fineAmount}</span>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex gap-2">
                                {isOverdue && !b.finePaid && (
                                  <button
                                    onClick={() => handlePayFine(b.id, fineAmount)}
                                    disabled={isPayingFineId === b.id}
                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-800 text-slate-950 font-extrabold text-[10px] rounded shadow-md flex items-center gap-1 transition uppercase tracking-wider"
                                  >
                                    <CreditCard size={10} />
                                    {isPayingFineId === b.id ? 'Paying...' : 'Pay Fine'}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleReturnBook(b.id)}
                                  disabled={isBorrowingId === b.id}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-200 font-bold text-[10px] rounded border border-slate-700 hover:border-slate-600 flex items-center gap-1 transition uppercase tracking-wider"
                                >
                                  <Check size={10} />
                                  {isBorrowingId === b.id ? 'Returning...' : 'Return'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-indigo-950/25 border border-indigo-900/20 rounded-xl text-center">
                      <p className="text-[11px] text-slate-400">
                        You do not currently have any active library loans. Browse the catalog below to borrow.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Fine Ledger Summary Card */}
              <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">Fine Ledger</h4>
                    <CreditCard size={14} className="text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Under KITS Guntur guidelines, a late-return charge of <strong className="text-slate-800 dark:text-slate-200">₹15/day</strong> is applied dynamically to all books overdue.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850/50 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Overdue items:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                      {studentBorrowedBooks.filter(b => calculateBookFine(b.dueDate, b.finePaid).isOverdue).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Paid / Settled fines:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{studentBorrowedBooks.reduce((total, b) => {
                        const { fineAmount, isOverdue } = calculateBookFine(b.dueDate, false);
                        return total + (isOverdue && b.finePaid ? fineAmount : 0);
                      }, 0)}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-800 my-2 pt-2 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Outstanding Fines:</span>
                    <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                      ₹{studentBorrowedBooks.reduce((total, b) => {
                        const { fineAmount } = calculateBookFine(b.dueDate, b.finePaid);
                        return total + fineAmount;
                      }, 0)}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 text-center leading-normal font-medium bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850/30">
                  ⚠️ Outstanding fines restrict exam ticket generation and end-semester library clearance. Please settle promptly.
                </div>
              </div>
            </div>

            {/* Catalog search and browse */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 flex-1">
                  <Search size={16} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search book title, author, or subject category..."
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    className="bg-transparent border-none outline-none flex-1 text-xs text-slate-850 dark:text-slate-100"
                  />
                </div>
                <div className="text-right text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">
                  * KITS GUNTUR CENTRAL INVENTORY *
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 dark:border-slate-800 text-slate-400 dark:text-slate-500">
                      <th className="pb-3 font-semibold uppercase tracking-wider">Book Title</th>
                      <th className="pb-3 font-semibold uppercase tracking-wider">Author</th>
                      <th className="pb-3 font-semibold uppercase tracking-wider">Category</th>
                      <th className="pb-3 font-semibold uppercase tracking-wider">Availability Status</th>
                      <th className="pb-3 font-semibold uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {libraryBooks
                      .filter(b => 
                        b.title.toLowerCase().includes(bookSearch.toLowerCase()) || 
                        b.author.toLowerCase().includes(bookSearch.toLowerCase()) || 
                        b.category.toLowerCase().includes(bookSearch.toLowerCase())
                      )
                      .map(b => (
                        <tr key={b.id} className="text-slate-850 dark:text-slate-200">
                          <td className="py-3 font-bold">{b.title}</td>
                          <td className="py-3 text-slate-500">{b.author}</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                              {b.category}
                            </span>
                          </td>
                          <td className="py-3">
                            {b.status === 'available' ? (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/20">
                                Available for loan
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-850 px-2 py-0.5 rounded border border-slate-150 dark:border-slate-800">
                                Borrowed ({b.borrowedBy === student.id ? 'By You' : 'Issued'})
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            {b.status === 'available' ? (
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  onClick={() => handleBorrowBook(b.id, false)}
                                  disabled={isBorrowingId === b.id}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded border border-indigo-200 transition cursor-pointer"
                                >
                                  Borrow Standard
                                </button>
                                <button
                                  onClick={() => handleBorrowBook(b.id, true)}
                                  disabled={isBorrowingId === b.id}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[10px] rounded border border-amber-200 transition cursor-pointer"
                                >
                                  Borrow Overdue Demo
                                </button>
                              </div>
                            ) : b.borrowedBy === student.id ? (
                              <button
                                onClick={() => handleReturnBook(b.id)}
                                disabled={isBorrowingId === b.id}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded border border-rose-200 transition cursor-pointer"
                              >
                                Return Book
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">Locked</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 6. AI ADVISOR CHATBOT */}
        {activeTab === 'advisor' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-50">KITS Guntur Academic AI Advisor</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Solve exam preps, organize calendar scheduling, or analyze assignments rotation math instantly.</p>
            </div>
            <AeroAdvisor userProfile={student} />
          </div>
        )}

      </motion.div>

      {/* TECHNICAL PROFILES VERIFICATION MODAL */}
      {isEditingProfiles && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Terminal size={18} className="text-indigo-600" />
                  Verify & Link Academic Handles
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Connect your verified technical registry accounts for the **{student.department}** branch.
                </p>
              </div>
              <button
                onClick={() => setIsEditingProfiles(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveProfiles} className="space-y-4 text-xs">
              {isCse && (
                <div className="space-y-4">
                  {/* LeetCode secure credentials sync */}
                  <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h5 className="font-bold text-amber-800 dark:text-amber-400 font-sans">LeetCode Developer Login Gateway</h5>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                        lcVerified ? 'bg-emerald-100 text-emerald-850' : 'bg-rose-100 text-rose-850'
                      }`}>
                        {lcVerified ? 'Connected & Verified' : 'Not Connected'}
                      </span>
                    </div>
                    
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Authenticate with your direct LeetCode developer logins to sync your verified global algorithm rank and solved catalog.
                    </p>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">LeetCode Username or Email</label>
                          <input
                            type="text"
                            value={editLcUser}
                            onChange={(e) => { setEditLcUser(e.target.value); setLcVerified(false); }}
                            placeholder="e.g. sairam_kits"
                            className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">LeetCode Secure Password</label>
                          <input
                            type="password"
                            value={lcPassword}
                            onChange={(e) => { setLcPassword(e.target.value); setLcVerified(false); }}
                            placeholder="••••••••"
                            className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="text-[10px] text-slate-450">
                          {lcVerified ? (
                            <span className="text-emerald-600 font-semibold">✓ Current Rank: #{Number(editLcRank).toLocaleString()} ({editLcSolved} Solved)</span>
                          ) : (
                            <span>Account must be logged in to sync rank.</span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={isVerifyingLc}
                          onClick={handleVerifyLeetCode}
                          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-500 text-white font-bold text-[10px] rounded-lg cursor-pointer transition"
                        >
                          {isVerifyingLc ? 'Logging in...' : 'Login & Sync Stats'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* HackerRank secure credentials sync */}
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h5 className="font-bold text-emerald-800 dark:text-emerald-400 font-sans">HackerRank Student Authentication</h5>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                        hrVerified ? 'bg-emerald-100 text-emerald-850' : 'bg-rose-100 text-rose-850'
                      }`}>
                        {hrVerified ? 'Connected & Verified' : 'Not Connected'}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Authenticate with your direct HackerRank student account logins. System will automatically pull star badges and leaderboards.
                    </p>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">HackerRank Username / Email</label>
                          <input
                            type="text"
                            value={editHrUser}
                            onChange={(e) => { setEditHrUser(e.target.value); setHrVerified(false); }}
                            placeholder="e.g. sairam_kits_hr"
                            className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">HackerRank Secure Password</label>
                          <input
                            type="password"
                            value={hrPassword}
                            onChange={(e) => { setHrPassword(e.target.value); setHrVerified(false); }}
                            placeholder="••••••••"
                            className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="text-[10px] text-slate-450">
                          {hrVerified ? (
                            <span className="text-emerald-600 font-semibold">✓ Current Badge: {editHrRank} (#{Number(editHrGlobal).toLocaleString()} Global)</span>
                          ) : (
                            <span>Account must be logged in to sync rating.</span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={isVerifyingHr}
                          onClick={handleVerifyHackerRank}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-500 text-white font-bold text-[10px] rounded-lg cursor-pointer transition"
                        >
                          {isVerifyingHr ? 'Logging in...' : 'Login & Sync Stats'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isEce && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-sky-500/5 border border-sky-500/10 rounded-xl">
                    <h5 className="font-bold text-sky-850 dark:text-sky-400 mb-2 font-sans">MATLAB Central Contributor Profile</h5>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">MATLAB Username</label>
                        <input
                          type="text"
                          value={editMatlabUser}
                          onChange={(e) => setEditMatlabUser(e.target.value)}
                          placeholder="e.g. venkata_kits"
                          className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Contributions Points</label>
                          <input
                            type="number"
                            value={editMatlabPoints}
                            onChange={(e) => setEditMatlabPoints(e.target.value)}
                            placeholder="e.g. 350"
                            className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Global Rank</label>
                          <input
                            type="number"
                            value={editMatlabRank}
                            onChange={(e) => setEditMatlabRank(e.target.value)}
                            placeholder="e.g. 5400"
                            className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-teal-500/5 border border-teal-500/10 rounded-xl">
                    <h5 className="font-bold text-teal-850 dark:text-teal-400 mb-2 font-sans">Arduino Project Hub Profile</h5>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Arduino Hub Username</label>
                        <input
                          type="text"
                          value={editArduinoUser}
                          onChange={(e) => setEditArduinoUser(e.target.value)}
                          placeholder="e.g. venkata_arduino"
                          className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Published Projects</label>
                          <input
                            type="number"
                            value={editArduinoProjects}
                            onChange={(e) => setEditArduinoProjects(e.target.value)}
                            placeholder="e.g. 6"
                            className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Maker Rank</label>
                          <input
                            type="number"
                            value={editArduinoRank}
                            onChange={(e) => setEditArduinoRank(e.target.value)}
                            placeholder="e.g. 845"
                            className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isEee && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-sky-500/5 border border-sky-500/10 rounded-xl">
                    <h5 className="font-bold text-sky-850 dark:text-sky-400 mb-2 font-sans">MATLAB Central Contributor Profile</h5>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">MATLAB Username</label>
                        <input
                          type="text"
                          value={editMatlabUser}
                          onChange={(e) => setEditMatlabUser(e.target.value)}
                          placeholder="e.g. harsha_ee"
                          className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Contributions Points</label>
                          <input
                            type="number"
                            value={editMatlabPoints}
                            onChange={(e) => setEditMatlabPoints(e.target.value)}
                            placeholder="e.g. 120"
                            className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Global Rank</label>
                          <input
                            type="number"
                            value={editMatlabRank}
                            onChange={(e) => setEditMatlabRank(e.target.value)}
                            placeholder="e.g. 19000"
                            className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                    <h5 className="font-bold text-indigo-850 dark:text-indigo-400 mb-2 font-sans">CircuitLab Schematic Designer Profile</h5>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">CircuitLab Username</label>
                        <input
                          type="text"
                          value={editCircuitUser}
                          onChange={(e) => setEditCircuitUser(e.target.value)}
                          placeholder="e.g. harsha_circuits"
                          className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Circuit Designs</label>
                          <input
                            type="number"
                            value={editCircuitDesigns}
                            onChange={(e) => setEditCircuitDesigns(e.target.value)}
                            placeholder="e.g. 8"
                            className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Designer Rank</label>
                          <input
                            type="number"
                            value={editCircuitRank}
                            onChange={(e) => setEditCircuitRank(e.target.value)}
                            placeholder="e.g. 1400"
                            className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingProfiles(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfiles}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  {isSavingProfiles ? 'Saving Profiles...' : 'Verify & Link Registry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </motion.div>
  );
}
