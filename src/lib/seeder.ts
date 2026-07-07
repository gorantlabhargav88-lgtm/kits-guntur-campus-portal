import { 
  db, 
  collection, 
  getDocs, 
  doc, 
  setDoc,
  deleteDoc,
  writeBatch,
  handleFirestoreError,
  OperationType
} from './firebase';

export async function checkAndSeedDatabase() {
  try {
    // Check if books are already seeded (avoids redundant seeding)
    let bookSnap;
    try {
      bookSnap = await getDocs(collection(db, 'library'));
    } catch (error) {
      return handleFirestoreError(error, OperationType.GET, 'library');
    }

    if (!bookSnap.empty) {
      console.log('Database already contains data. Skipping default seeding.');
      return;
    }

    console.log('Initializing fresh academic environment for JNTUK KITS Guntur...');

    // Users seed
    const defaultUsers = [
      { id: 'lect_haribabu', name: 'Dr. K. Hari Babu', email: 'haribabu.k@kitsguntur.ac.in', role: 'lecturer', department: 'CSE', semester: 'Semester 3', permissions: { markAttendance: true, editGrades: true, useChat: true } },
      { id: 'lect_sridhar', name: 'Dr. M. Sridhar', email: 'sridhar.m@kitsguntur.ac.in', role: 'lecturer', department: 'ECE', semester: 'Semester 3', permissions: { markAttendance: true, editGrades: true, useChat: true } },
      { id: 'lect_kalyani', name: 'Prof. S. Kalyani', email: 'kalyani.s@kitsguntur.ac.in', role: 'lecturer', department: 'EEE', semester: 'Semester 3', permissions: { markAttendance: true, editGrades: true, useChat: true } },
      { id: 'admin_babu', name: 'Dr. P. Babu', email: 'dean.acad@kitsguntur.ac.in', role: 'admin', department: 'Academic Affairs', semester: 'Management' },
      
      // Elite Demo Students with dynamic coding handles pre-registered
      { id: 'stud_ramesh', name: 'Ramesh Chowdary', email: 'ramesh.c@kitsguntur.ac.in', role: 'student', department: 'CSE', semester: 'Semester 3', rollNumber: '23KITS-CSE-001', parentName: 'Koteswara Rao', parentEmail: 'koteswar.c@gmail.com', leetcodeUsername: 'ramesh_cse', leetcodeRank: 24500, leetcodeSolved: 215, hackerrankUsername: 'ramesh_hr', hackerrankRank: 'Gold Badge', hackerrankBadgeCount: 4, hackerrankGlobalRank: 4800, permissions: { borrowBooks: true, useChat: true } },
      { id: 'stud_sita', name: 'Sita Lakshmi', email: 'sita.l@kitsguntur.ac.in', role: 'student', department: 'ECE', semester: 'Semester 3', rollNumber: '23KITS-ECE-012', parentName: 'Narayana Murthy', parentEmail: 'nmurthy.l@gmail.com', matlabUsername: 'sital_matlab', matlabPoints: 450, matlabRank: 1800, circuitlabUsername: 'sita_circuits', circuitlabDesigns: 18, circuitlabRank: 240, permissions: { borrowBooks: true, useChat: true } },
      { id: 'stud_venkat', name: 'Venkata Satish', email: 'venkat.s@kitsguntur.ac.in', role: 'student', department: 'CSE', semester: 'Semester 3', rollNumber: '23KITS-CSE-045', parentName: 'Subba Rao', parentEmail: 'subbarao.s@gmail.com', leetcodeUsername: 'venkat_kits', leetcodeRank: 19800, leetcodeSolved: 284, hackerrankUsername: 'venkat_codes', hackerrankRank: 'Gold Badge', hackerrankBadgeCount: 5, hackerrankGlobalRank: 3200, permissions: { borrowBooks: true, useChat: true } }
    ];

    for (const u of defaultUsers) {
      await setDoc(doc(db, 'users', u.id), u);
    }

    // Books seed
    const books = [
      { id: 'book_1', title: 'Data Structures & Algorithms in Java', author: 'Robert Lafore', category: 'Computer Science', status: 'available', borrowedBy: null, borrowedName: null, dueDate: null },
      { id: 'book_2', title: 'Database Management Systems', author: 'Raghu Ramakrishnan', category: 'Computer Science', status: 'available', borrowedBy: null, borrowedName: null, dueDate: null },
      { id: 'book_3', title: 'Computer Networks', author: 'Andrew S. Tanenbaum', category: 'Computer Science', status: 'available', borrowedBy: null, borrowedName: null, dueDate: null },
      { id: 'book_4', title: 'Electronic Devices and Circuit Theory', author: 'Robert Boylestad', category: 'Electronics & Communication', status: 'available', borrowedBy: null, borrowedName: null, dueDate: null },
      { id: 'book_5', title: 'Higher Engineering Mathematics', author: 'B.S. Grewal', category: 'Mathematics', status: 'available', borrowedBy: null, borrowedName: null, dueDate: null },
      { id: 'book_6', title: 'Programming in ANSI C', author: 'E. Balagurusamy', category: 'Computer Science', status: 'available', borrowedBy: null, borrowedName: null, dueDate: null },
      { id: 'book_7', title: 'Linear Integrated Circuits', author: 'D. Roy Choudhury', category: 'Electronics & Communication', status: 'available', borrowedBy: null, borrowedName: null, dueDate: null },
      { id: 'book_8', title: 'Power System Engineering', author: 'Kothari & Nagrath', category: 'Electrical Engineering', status: 'available', borrowedBy: null, borrowedName: null, dueDate: null }
    ];

    for (const b of books) {
      await setDoc(doc(db, 'library', b.id), b);
    }

    // Events seed
    const events = [
      { id: 'event_1', title: 'JNTUK Semester End Examinations', description: 'Centralized semester exams for all undergraduate streams under JNTU Kakinada curriculum guidelines.', date: '2026-07-10', location: 'KITS Exam Control Office, Block A', category: 'exam', createdBy: 'admin_babu' },
      { id: 'event_2', title: 'KITS UTSAV 2026 Sports Orientation', description: 'Pre-event scheduling and volunteer signups for the annual cultural and athletic festival.', date: '2026-07-24', location: 'KITS Central Amphitheatre', category: 'cultural', createdBy: 'admin_babu' },
      { id: 'event_3', title: 'Workshop on Generative AI & Cloud Systems', description: 'Hands-on session on LLMs, deployment paradigms, and AI APIs, organized by KITS ACM Student Chapter.', date: '2026-07-15', location: 'CSE Seminar Hall, Block C', category: 'workshop', createdBy: 'lect_haribabu' }
    ];

    for (const e of events) {
      await setDoc(doc(db, 'events', e.id), e);
    }

    // Assignments
    const assignments = [
      { id: 'assign_1', title: 'Design & Analysis of Algorithms: Greedy Techniques', description: 'Analyze Prim and Kruskal minimum spanning tree algorithms. Implement topological sorting and analyze time complexity bounds.', subject: 'Design & Analysis of Algorithms', dueDate: '2026-07-08', semester: 'Semester 3', uploadedBy: 'lect_haribabu', pdfName: 'kits_cse_daa_greedy.pdf', pdfUrl: 'https://www.cs.cmu.edu/~adamchik/15-121/lectures/Red-Black%20Trees/Red-Black%20Trees.pdf', createdAt: new Date().toISOString() },
      { id: 'assign_2', title: 'ECE Analog Circuits Fourier Series Analysis', description: 'Formulate and plot the Fourier Series approximations for rectangular pulse trains. Derive output impedance metrics.', subject: 'Analog Circuits & Signals', dueDate: '2026-07-12', semester: 'Semester 3', uploadedBy: 'lect_sridhar', pdfName: 'kits_ece_analog_fourier.pdf', pdfUrl: 'https://web.stanford.edu/class/ee261/reader.pdf', createdAt: new Date().toISOString() }
    ];

    for (const a of assignments) {
      await setDoc(doc(db, 'assignments', a.id), a);
    }

    // Notices seed
    const notices = [
      { id: 'notice_1', title: 'TCS Placement Drive - Registration Extended', content: 'Tata Consultancy Services is hosting a campus recruitment drive for final year CSE & ECE students. Registrations are extended till July 15. Submit your updated profiles.', category: 'Placement', postedBy: 'admin_babu', postedByName: 'Dr. P. Babu', postedByRole: 'admin', createdAt: new Date().toISOString() },
      { id: 'notice_2', title: 'Mid-term Practical Lab Hall Allocations', content: 'Mid-term practical examinations will commence from July 12. Please find your seat and system allocations outside Block-C Lab 2 and Lab 4.', category: 'Exams', postedBy: 'lect_haribabu', postedByName: 'Dr. K. Hari Babu', postedByRole: 'lecturer', createdAt: new Date().toISOString() },
      { id: 'notice_3', title: 'JNTUK R23 Academic Regulation Framework Update', content: 'Academic committee has updated guidelines for internal assessment evaluations. The weightage of online programming badges has been formally integrated.', category: 'Academic', postedBy: 'admin_babu', postedByName: 'Dr. P. Babu', postedByRole: 'admin', createdAt: new Date().toISOString() }
    ];

    for (const n of notices) {
      await setDoc(doc(db, 'notices', n.id), n);
    }

    // Leave Requests
    const leaves = [
      { id: 'leave_1', studentId: 'stud_ramesh', studentName: 'Ramesh Chowdary', rollNumber: '23KITS-CSE-001', department: 'CSE', startDate: '2026-07-06', endDate: '2026-07-08', type: 'Leave', reason: 'Family medical emergency, requiring travel to Vijayawada.', status: 'approved', resolvedBy: 'lect_haribabu', resolvedName: 'Dr. K. Hari Babu', remarks: 'Granted. Ensure online assignments are submitted.', createdAt: new Date().toISOString() },
      { id: 'leave_2', studentId: 'stud_sita', studentName: 'Sita Lakshmi', rollNumber: '23KITS-ECE-012', department: 'ECE', startDate: '2026-07-15', endDate: '2026-07-16', type: 'On-Duty', reason: 'Representing KITS at IEEE Regional Coding Congress in Guntur.', status: 'pending', createdAt: new Date().toISOString() }
    ];

    for (const l of leaves) {
      await setDoc(doc(db, 'leave_requests', l.id), l);
    }

    // Fee records
    const fees = [
      { id: 'fee_1', studentId: 'stud_ramesh', studentName: 'Ramesh Chowdary', rollNumber: '23KITS-CSE-001', department: 'CSE', totalFee: 85000, paidFee: 85000, dueDate: '2026-07-30', status: 'paid', lastPaymentDate: '2026-06-15' },
      { id: 'fee_2', studentId: 'stud_sita', studentName: 'Sita Lakshmi', rollNumber: '23KITS-ECE-012', department: 'ECE', totalFee: 85000, paidFee: 40000, dueDate: '2026-07-30', status: 'partial', lastPaymentDate: '2026-06-20' },
      { id: 'fee_3', studentId: 'stud_venkat', studentName: 'Venkata Satish', rollNumber: '23KITS-CSE-045', department: 'CSE', totalFee: 85000, paidFee: 0, dueDate: '2026-07-30', status: 'unpaid' }
    ];

    for (const f of fees) {
      await setDoc(doc(db, 'fees', f.id), f);
    }

    console.log('KKR & KSR Institute of Technology and Sciences (KITS Guntur) seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

/**
 * Deletes all student and lecturer profile documents from Firestore, excluding the currently logged-in administrator.
 */
export async function wipeAllUsersExceptAdmin(currentAdminId: string) {
  try {
    const userSnap = await getDocs(collection(db, 'users'));
    let count = 0;
    
    for (const docItem of userSnap.docs) {
      const data = docItem.data();
      // Keep admins or the specific active admin ID to avoid lockouts
      if (data.role === 'admin' || docItem.id === currentAdminId) {
        continue;
      }
      await deleteDoc(doc(db, 'users', docItem.id));
      count++;
    }
    
    console.log(`Successfully deleted ${count} user profiles from database.`);
    return count;
  } catch (error) {
    console.error('Error wiping users from database:', error);
    throw error;
  }
}

/**
 * Wipes all university sub-collections completely and loads pristine academic seeds.
 */
export async function seedFreshModernAcademicData(adminIdToKeep: string, adminProfile: any) {
  try {
    const collectionsToClear = [
      'users', 'library', 'events', 'assignments', 'submissions', 
      'results', 'attendance', 'groups', 'reports', 'archives', 
      'notices', 'leave_requests', 'fees'
    ];

    // Clear all collections
    for (const colName of collectionsToClear) {
      try {
        const snap = await getDocs(collection(db, colName));
        for (const docItem of snap.docs) {
          // If clearing users, do NOT delete the currently logged-in admin!
          if (colName === 'users' && (docItem.id === adminIdToKeep || docItem.data().role === 'admin')) {
            continue;
          }
          await deleteDoc(doc(db, colName, docItem.id));
        }
      } catch (err) {
        console.error(`Skipped or failed clearing collection ${colName}:`, err);
      }
    }

    // Keep active admin profile intact in users
    if (adminProfile) {
      await setDoc(doc(db, 'users', adminIdToKeep), {
        ...adminProfile,
        role: 'admin',
        department: 'Academic Affairs',
        semester: 'Management'
      });
    }

    // Re-seed standard records
    const defaultUsers = [
      { id: 'lect_haribabu', name: 'Dr. K. Hari Babu', email: 'haribabu.k@kitsguntur.ac.in', role: 'lecturer', department: 'CSE', semester: 'Semester 3', permissions: { markAttendance: true, editGrades: true, useChat: true } },
      { id: 'lect_sridhar', name: 'Dr. M. Sridhar', email: 'sridhar.m@kitsguntur.ac.in', role: 'lecturer', department: 'ECE', semester: 'Semester 3', permissions: { markAttendance: true, editGrades: true, useChat: true } },
      { id: 'lect_kalyani', name: 'Prof. S. Kalyani', email: 'kalyani.s@kitsguntur.ac.in', role: 'lecturer', department: 'EEE', semester: 'Semester 3', permissions: { markAttendance: true, editGrades: true, useChat: true } },
      
      // Seed Elite Student profiles
      { id: 'stud_ramesh', name: 'Ramesh Chowdary', email: 'ramesh.c@kitsguntur.ac.in', role: 'student', department: 'CSE', semester: 'Semester 3', rollNumber: '23KITS-CSE-001', parentName: 'Koteswara Rao', parentEmail: 'koteswar.c@gmail.com', leetcodeUsername: 'ramesh_cse', leetcodeRank: 24500, leetcodeSolved: 215, hackerrankUsername: 'ramesh_hr', hackerrankRank: 'Gold Badge', hackerrankBadgeCount: 4, hackerrankGlobalRank: 4800, permissions: { borrowBooks: true, useChat: true } },
      { id: 'stud_sita', name: 'Sita Lakshmi', email: 'sita.l@kitsguntur.ac.in', role: 'student', department: 'ECE', semester: 'Semester 3', rollNumber: '23KITS-ECE-012', parentName: 'Narayana Murthy', parentEmail: 'nmurthy.l@gmail.com', matlabUsername: 'sital_matlab', matlabPoints: 450, matlabRank: 1800, circuitlabUsername: 'sita_circuits', circuitlabDesigns: 18, circuitlabRank: 240, permissions: { borrowBooks: true, useChat: true } },
      { id: 'stud_venkat', name: 'Venkata Satish', email: 'venkat.s@kitsguntur.ac.in', role: 'student', department: 'CSE', semester: 'Semester 3', rollNumber: '23KITS-CSE-045', parentName: 'Subba Rao', parentEmail: 'subbarao.s@gmail.com', leetcodeUsername: 'venkat_kits', leetcodeRank: 19800, leetcodeSolved: 284, hackerrankUsername: 'venkat_codes', hackerrankRank: 'Gold Badge', hackerrankBadgeCount: 5, hackerrankGlobalRank: 3200, permissions: { borrowBooks: true, useChat: true } }
    ];

    for (const u of defaultUsers) {
      await setDoc(doc(db, 'users', u.id), u);
    }

    // Books seed
    const books = [
      { id: 'book_1', title: 'Data Structures & Algorithms in Java', author: 'Robert Lafore', category: 'Computer Science', status: 'available', borrowedBy: null, borrowedName: null, dueDate: null },
      { id: 'book_2', title: 'Database Management Systems', author: 'Raghu Ramakrishnan', category: 'Computer Science', status: 'available', borrowedBy: null, borrowedName: null, dueDate: null },
      { id: 'book_3', title: 'Computer Networks', author: 'Andrew S. Tanenbaum', category: 'Computer Science', status: 'available', borrowedBy: null, borrowedName: null, dueDate: null },
      { id: 'book_4', title: 'Electronic Devices and Circuit Theory', author: 'Robert Boylestad', category: 'Electronics & Communication', status: 'available', borrowedBy: null, borrowedName: null, dueDate: null },
      { id: 'book_5', title: 'Higher Engineering Mathematics', author: 'B.S. Grewal', category: 'Mathematics', status: 'available', borrowedBy: null, borrowedName: null, dueDate: null },
      { id: 'book_6', title: 'Programming in ANSI C', author: 'E. Balagurusamy', category: 'Computer Science', status: 'available', borrowedBy: null, borrowedName: null, dueDate: null },
      { id: 'book_7', title: 'Linear Integrated Circuits', author: 'D. Roy Choudhury', category: 'Electronics & Communication', status: 'available', borrowedBy: null, borrowedName: null, dueDate: null },
      { id: 'book_8', title: 'Power System Engineering', author: 'Kothari & Nagrath', category: 'Electrical Engineering', status: 'available', borrowedBy: null, borrowedName: null, dueDate: null }
    ];

    for (const b of books) {
      await setDoc(doc(db, 'library', b.id), b);
    }

    // Events seed
    const events = [
      { id: 'event_1', title: 'JNTUK Semester End Examinations', description: 'Centralized semester exams for all undergraduate streams under JNTU Kakinada curriculum guidelines.', date: '2026-07-10', location: 'KITS Exam Control Office, Block A', category: 'exam', createdBy: adminIdToKeep },
      { id: 'event_2', title: 'KITS UTSAV 2026 Sports Orientation', description: 'Pre-event scheduling and volunteer signups for the annual cultural and athletic festival.', date: '2026-07-24', location: 'KITS Central Amphitheatre', category: 'cultural', createdBy: adminIdToKeep },
      { id: 'event_3', title: 'Workshop on Generative AI & Cloud Systems', description: 'Hands-on session on LLMs, deployment paradigms, and AI APIs, organized by KITS ACM Student Chapter.', date: '2026-07-15', location: 'CSE Seminar Hall, Block C', category: 'workshop', createdBy: 'lect_haribabu' }
    ];

    for (const e of events) {
      await setDoc(doc(db, 'events', e.id), e);
    }

    // Assignments
    const assignments = [
      { id: 'assign_1', title: 'Design & Analysis of Algorithms: Greedy Techniques', description: 'Analyze Prim and Kruskal minimum spanning tree algorithms. Implement topological sorting and analyze time complexity bounds.', subject: 'Design & Analysis of Algorithms', dueDate: '2026-07-08', semester: 'Semester 3', uploadedBy: 'lect_haribabu', pdfName: 'kits_cse_daa_greedy.pdf', pdfUrl: 'https://www.cs.cmu.edu/~adamchik/15-121/lectures/Red-Black%20Trees/Red-Black%20Trees.pdf', createdAt: new Date().toISOString() },
      { id: 'assign_2', title: 'ECE Analog Circuits Fourier Series Analysis', description: 'Formulate and plot the Fourier Series approximations for rectangular pulse trains. Derive output impedance metrics.', subject: 'Analog Circuits & Signals', dueDate: '2026-07-12', semester: 'Semester 3', uploadedBy: 'lect_sridhar', pdfName: 'kits_ece_analog_fourier.pdf', pdfUrl: 'https://web.stanford.edu/class/ee261/reader.pdf', createdAt: new Date().toISOString() }
    ];

    for (const a of assignments) {
      await setDoc(doc(db, 'assignments', a.id), a);
    }

    // Notices seed
    const notices = [
      { id: 'notice_1', title: 'TCS Placement Drive - Registration Extended', content: 'Tata Consultancy Services is hosting a campus recruitment drive for final year CSE & ECE students. Registrations are extended till July 15. Submit your updated profiles.', category: 'Placement', postedBy: adminIdToKeep, postedByName: adminProfile?.name || 'Administrator', postedByRole: 'admin', createdAt: new Date().toISOString() },
      { id: 'notice_2', title: 'Mid-term Practical Lab Hall Allocations', content: 'Mid-term practical examinations will commence from July 12. Please find your seat and system allocations outside Block-C Lab 2 and Lab 4.', category: 'Exams', postedBy: 'lect_haribabu', postedByName: 'Dr. K. Hari Babu', postedByRole: 'lecturer', createdAt: new Date().toISOString() },
      { id: 'notice_3', title: 'JNTUK R23 Academic Regulation Framework Update', content: 'Academic committee has updated guidelines for internal assessment evaluations. The weightage of online programming badges has been formally integrated.', category: 'Academic', postedBy: adminIdToKeep, postedByName: adminProfile?.name || 'Administrator', postedByRole: 'admin', createdAt: new Date().toISOString() }
    ];

    for (const n of notices) {
      await setDoc(doc(db, 'notices', n.id), n);
    }

    // Leave Requests
    const leaves = [
      { id: 'leave_1', studentId: 'stud_ramesh', studentName: 'Ramesh Chowdary', rollNumber: '23KITS-CSE-001', department: 'CSE', startDate: '2026-07-06', endDate: '2026-07-08', type: 'Leave', reason: 'Family medical emergency, requiring travel to Vijayawada.', status: 'approved', resolvedBy: 'lect_haribabu', resolvedName: 'Dr. K. Hari Babu', remarks: 'Granted. Ensure online assignments are submitted.', createdAt: new Date().toISOString() },
      { id: 'leave_2', studentId: 'stud_sita', studentName: 'Sita Lakshmi', rollNumber: '23KITS-ECE-012', department: 'ECE', startDate: '2026-07-15', endDate: '2026-07-16', type: 'On-Duty', reason: 'Representing KITS at IEEE Regional Coding Congress in Guntur.', status: 'pending', createdAt: new Date().toISOString() }
    ];

    for (const l of leaves) {
      await setDoc(doc(db, 'leave_requests', l.id), l);
    }

    // Fee records
    const fees = [
      { id: 'fee_1', studentId: 'stud_ramesh', studentName: 'Ramesh Chowdary', rollNumber: '23KITS-CSE-001', department: 'CSE', totalFee: 85000, paidFee: 85000, dueDate: '2026-07-30', status: 'paid', lastPaymentDate: '2026-06-15' },
      { id: 'fee_2', studentId: 'stud_sita', studentName: 'Sita Lakshmi', rollNumber: '23KITS-ECE-012', department: 'ECE', totalFee: 85000, paidFee: 40000, dueDate: '2026-07-30', status: 'partial', lastPaymentDate: '2026-06-20' },
      { id: 'fee_3', studentId: 'stud_venkat', studentName: 'Venkata Satish', rollNumber: '23KITS-CSE-045', department: 'CSE', totalFee: 85000, paidFee: 0, dueDate: '2026-07-30', status: 'unpaid' }
    ];

    for (const f of fees) {
      await setDoc(doc(db, 'fees', f.id), f);
    }

    console.log('Database reset and seeded with elite, efficient university modules successfully!');
  } catch (error) {
    console.error('Error reseeding academic database:', error);
    throw error;
  }
}
