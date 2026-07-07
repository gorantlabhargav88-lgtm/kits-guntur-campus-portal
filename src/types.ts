export type UserRole = 'student' | 'lecturer' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  semester: string;
  rollNumber?: string;
  parentName?: string;
  parentEmail?: string;
  photoURL?: string;
  
  // Technical/coding profile handles
  leetcodeUsername?: string;
  hackerrankUsername?: string;
  matlabUsername?: string;
  arduinoUsername?: string;
  circuitlabUsername?: string;

  // Custom stats
  leetcodeRank?: number;
  leetcodeSolved?: number;
  hackerrankRank?: string;
  hackerrankBadgeCount?: number;
  hackerrankGlobalRank?: number;
  
  matlabPoints?: number;
  matlabRank?: number;
  arduinoProjects?: number;
  arduinoRank?: number;
  circuitlabDesigns?: number;
  circuitlabRank?: number;

  permissions?: {
    editGrades?: boolean;
    markAttendance?: boolean;
    borrowBooks?: boolean;
    useChat?: boolean;
    postEvents?: boolean;
  };
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate: string;
  semester: string;
  uploadedBy: string;
  pdfUrl?: string;
  pdfName?: string;
  archived?: boolean;
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  content: string;
  grade?: string;
  feedback?: string;
  status: 'submitted' | 'graded';
}

export interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent';
  semester: string;
  markedBy: string;
  numClasses?: number;
  archived?: boolean;
}

export interface Result {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  examType: string; // 'Midterm' | 'Endsem' | 'Quiz'
  marks: number;
  maxMarks: number;
  grade: string;
  semester: string;
  archived?: boolean;
  recordedBy: string;
  createdAt: string;
}

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  category: 'academic' | 'exam' | 'cultural' | 'sports' | 'workshop';
  createdBy: string;
  department?: string; // 'All' or specific like 'CSE', 'ECE', 'EEE', 'IT'
  type?: 'event' | 'deadline'; // 'event' or 'deadline'
}

export interface StudyGroup {
  id: string;
  name: string;
  subject: string;
  description: string;
  createdBy: string;
  members: string[]; // List of userId
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: string; // ISO string
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  status: 'available' | 'borrowed';
  borrowedBy?: string | null;
  borrowedName?: string | null;
  dueDate?: string | null;
  finePaid?: boolean | null;
  fineAmount?: number | null;
}

export interface ProgressReport {
  id: string;
  studentId: string;
  studentName: string;
  month: string;
  semester: string;
  attendancePercentage: number;
  cgpa: number;
  gradesSummary: string;
  remarks: string;
  generatedBy: string;
  createdAt: string;
}

export interface ArchiveRecord {
  id: string;
  semester: string;
  archivedBy: string;
  archivedAt: string;
  summary: string;
  dataSnapshot: string; // JSON string representation
}

export interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  department: string;
  totalFee: number;
  paidFee: number;
  dueDate: string;
  status: 'paid' | 'partial' | 'unpaid';
  lastPaymentDate?: string;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  department: string;
  startDate: string;
  endDate: string;
  type: 'Leave' | 'On-Duty';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  resolvedBy?: string;
  resolvedName?: string;
  remarks?: string;
  createdAt: string;
}

export interface NoticeBoardItem {
  id: string;
  title: string;
  content: string;
  category: 'Placement' | 'Academic' | 'Exams' | 'Symposium' | 'General';
  postedBy: string;
  postedByName: string;
  postedByRole: string;
  createdAt: string;
}

