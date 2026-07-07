import { 
  initializeTestEnvironment, 
  RulesTestEnvironment, 
  assertFails, 
  assertSucceeds 
} from '@firebase/rules-unit-testing';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs 
} from 'firebase/firestore';
import * as fs from 'fs';

describe('KITS Guntur Security Rules - Red Team Audit Test Suite', () => {
  let testEnv: RulesTestEnvironment;
  const PROJECT_ID = 'composite-tribute-63bk6';

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8'),
        host: 'localhost',
        port: 8080,
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  // ==========================================
  // RED TEAM AUDIT: THE DIRTY DOZEN PAYLOADS
  // ==========================================

  test('P1: Role Escalation Attack - User tries to register as god_mode (Expected: FAIL)', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const maliciousPayload = {
      id: 'stud_101',
      name: 'Malicious Student',
      email: 'hacker@kitsguntur.ac.in',
      role: 'god_mode', // INVALID ROLE
      department: 'CSE',
      semester: 'Semester 5'
    };

    const docRef = doc(unauthedDb, 'users', 'stud_101');
    await assertFails(setDoc(docRef, maliciousPayload));
  });

  test('P2: Ghost Field Injection - User tries to inject unapproved key isVerified (Expected: FAIL)', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const maliciousPayload = {
      id: 'stud_102',
      name: 'Ghost Student',
      email: 'ghost@kitsguntur.ac.in',
      role: 'student',
      department: 'CSE',
      semester: 'Semester 3',
      isVerified: true // UNAUTHORIZED SHADOW FIELD
    };

    const docRef = doc(unauthedDb, 'users', 'stud_102');
    await assertFails(setDoc(docRef, maliciousPayload));
  });

  test('P3: Storage Exhaustion - User provides massive name string (Expected: FAIL)', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const hugeName = 'A'.repeat(500); // Exceeds size limits
    const maliciousPayload = {
      id: 'stud_103',
      name: hugeName,
      email: 'bloat@kitsguntur.ac.in',
      role: 'student',
      department: 'CSE',
      semester: 'Semester 1'
    };

    const docRef = doc(unauthedDb, 'users', 'stud_103');
    await assertFails(setDoc(docRef, maliciousPayload));
  });

  test('P4: Schema Bypass - Assignment lacking mandatory dueDate field (Expected: FAIL)', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const incompletePayload = {
      id: 'assign_104',
      title: 'Database Assignment 1',
      description: 'Solve query questions.',
      subject: 'DBMS',
      // Missing 'dueDate' and 'semester'
      uploadedBy: 'lect_01'
    };

    const docRef = doc(unauthedDb, 'assignments', 'assign_104');
    await assertFails(setDoc(docRef, incompletePayload));
  });

  test('P5: Grade Spoofing - Student posts exam marks out of bounds (Expected: FAIL)', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const invalidResult = {
      id: 'res_105',
      studentId: 'stud_200',
      studentName: 'Alice',
      subject: 'Discrete Math',
      examType: 'Midterm',
      marks: 150, // Out of bounds of maxMarks
      maxMarks: 100,
      grade: 'A+',
      semester: 'Semester 3',
      recordedBy: 'lect_02'
    };

    const docRef = doc(unauthedDb, 'results', 'res_105');
    await assertFails(setDoc(docRef, invalidResult));
  });

  test('P6: Invalid Attendance State - Posting custom skipping state (Expected: FAIL)', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const invalidAttendance = {
      id: 'att_106',
      studentId: 'stud_200',
      studentName: 'Alice',
      subject: 'Computer Networks',
      date: '2026-07-04',
      status: 'skipped', // INVALID STATUS
      semester: 'Semester 4',
      markedBy: 'lect_03'
    };

    const docRef = doc(unauthedDb, 'attendance', 'att_106');
    await assertFails(setDoc(docRef, invalidAttendance));
  });

  test('P7: Event Category Poisoning - Setting unapproved event categories (Expected: FAIL)', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const invalidEvent = {
      id: 'ev_107',
      title: 'Mega Concert',
      description: 'Campus fun night.',
      date: '2026-10-15',
      location: 'Main Lawn',
      category: 'raves', // INVALID CATEGORY
      createdBy: 'admin_1'
    };

    const docRef = doc(unauthedDb, 'events', 'ev_107');
    await assertFails(setDoc(docRef, invalidEvent));
  });

  test('P8: List Type Poisoning - Passing members list as a string (Expected: FAIL)', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const invalidGroup = {
      id: 'grp_108',
      name: 'Algorithm Geeks',
      subject: 'Design & Analysis of Algorithms',
      description: 'Discussion group.',
      createdBy: 'stud_200',
      members: 'just_string_not_list' // INVALID TYPE
    };

    const docRef = doc(unauthedDb, 'groups', 'grp_108');
    await assertFails(setDoc(docRef, invalidGroup));
  });

  test('P9: Library Status Manipulation - Client injects custom unapproved status (Expected: FAIL)', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const invalidBook = {
      id: 'book_109',
      title: 'Introduction to Algorithms',
      author: 'CLRS',
      category: 'CSE',
      status: 'shredded' // INVALID STATUS
    };

    const docRef = doc(unauthedDb, 'library', 'book_109');
    await assertFails(setDoc(docRef, invalidBook));
  });

  test('P10: Path ID Poisoning - Attempting path injection or oversized id (Expected: FAIL)', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const longId = 'A'.repeat(200); // Exceeds 128 characters constraint
    const validUserPayload = {
      id: longId,
      name: 'Hacker Name',
      email: 'hack@kitsguntur.ac.in',
      role: 'student',
      department: 'CSE',
      semester: 'Semester 1'
    };

    const docRef = doc(unauthedDb, 'users', longId);
    await assertFails(setDoc(docRef, validUserPayload));
  });

  test('P11: Immutability Violation - Trying to update createdAt timestamp of exam result (Expected: FAIL)', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    // Pre-populate with admin or direct mock context
    const initialResult = {
      id: 'res_111',
      studentId: 'stud_300',
      studentName: 'Bob',
      subject: 'Discrete Math',
      examType: 'Midterm',
      marks: 45,
      maxMarks: 50,
      grade: 'A',
      semester: 'Semester 3',
      recordedBy: 'lect_02',
      createdAt: '2026-07-04T10:00:00Z'
    };

    // Attempting update that mutates createdAt field should fail
    const updatedResult = { ...initialResult, createdAt: '2026-07-04T12:00:00Z' };
    const docRef = doc(unauthedDb, 'results', 'res_111');
    await assertFails(updateDoc(docRef, updatedResult));
  });

  test('P12: Chat Message Bloat - Chat content exceeding length constraints (Expected: FAIL)', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const giantContent = 'W'.repeat(3000); // Exceeds 2000 character limit
    const maliciousMessage = {
      id: 'msg_112',
      senderId: 'stud_200',
      senderName: 'Alice',
      senderRole: 'student',
      content: giantContent,
      timestamp: '2026-07-04T12:15:00Z'
    };

    const docRef = doc(unauthedDb, 'groups/grp_1/messages', 'msg_112');
    await assertFails(setDoc(docRef, maliciousMessage));
  });

  // ==========================================
  // SANITY PASSES: VALID DATA STRUCTURES
  // ==========================================

  test('Sanity check: Correct user schema creation (Expected: PASS)', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const validUserPayload = {
      id: 'stud_999',
      name: 'Srinivas Murthy',
      email: 'srinivas@kitsguntur.ac.in',
      role: 'student',
      department: 'CSE',
      semester: 'Semester 5'
    };

    const docRef = doc(unauthedDb, 'users', 'stud_999');
    await assertSucceeds(setDoc(docRef, validUserPayload));
  });

});
