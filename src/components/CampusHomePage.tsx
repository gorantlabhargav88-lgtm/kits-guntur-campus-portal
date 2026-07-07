import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, onSnapshot, doc, setDoc } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { Award, CheckCircle, ChevronRight, GraduationCap, MapPin, Briefcase, Users, Star, ArrowRight, ShieldCheck, Key, Lock, Mail, RefreshCw, Landmark, School, Check, HelpCircle, UserCheck, ExternalLink, Globe, LayoutGrid, Terminal, Cpu, Zap, Compass, Code, Eye, EyeOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CampusHomePageProps {
  onEnterPortals: () => void;
  onLoginUser: (user: UserProfile) => void;
}

export default function CampusHomePage({ onEnterPortals, onLoginUser }: CampusHomePageProps) {
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [selectedRole, setSelectedRole] = useState<'student' | 'lecturer' | 'admin' | null>(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // Sign Up / Registration form state variables
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRoll, setRegRoll] = useState('');
  const [regDept, setRegDept] = useState('CSE');
  const [regSem, setRegSem] = useState('Semester 3');
  const [regParentName, setRegParentName] = useState('');
  const [regParentEmail, setRegParentEmail] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regError, setRegError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // OTP Verification States
  const [otpStep, setOtpStep] = useState<'details' | 'otp'>('details');
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [testOtp, setTestOtp] = useState<string | null>(null);
  const [testMailUrl, setTestMailUrl] = useState<string | null>(null);
  const [otpExpiresIn, setOtpExpiresIn] = useState<number>(600);

  // Forgot Password / Credential Recovery modal states
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotRole, setForgotRole] = useState<'student' | 'lecturer' | 'admin'>('student');
  const [recoveryResult, setRecoveryResult] = useState<{ success: boolean; message: string; user?: UserProfile } | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const [activeShortcutBranch, setActiveShortcutBranch] = useState<'all' | 'cse' | 'it' | 'ece_eee' | 'general'>('all');
  
  // Custom interactive animations and impressive gallery states
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'campus' | 'labs' | 'events' | 'placements'>('all');
  const [selectedGalleryPhoto, setSelectedGalleryPhoto] = useState<any | null>(null);

  const heroImages = [
    "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80", // Main Block Architecture
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80", // Graduation Celebrations
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80", // Code Lab Collaboration
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"  // Engineering Innovation Centers
  ];

  const galleryPhotos = [
    {
      id: 'g1',
      title: 'Aesthetic Main Academic Complex',
      category: 'campus',
      img: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80',
      desc: 'The administrative heart of KITS Guntur, accredited NBA Tier-1 with lush green landscape.'
    },
    {
      id: 'g2',
      title: 'Washington Accord Tier-1 Labs',
      category: 'labs',
      img: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=800&q=80',
      desc: 'High-speed distributed computing systems and state-of-the-art ECE microcontroller labs.'
    },
    {
      id: 'g3',
      title: 'Convocation Ceremony Excellence',
      category: 'events',
      img: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
      desc: 'Celebrating successful placements and degrees conferred under JNTUK Affiliation.'
    },
    {
      id: 'g4',
      title: 'flipkart & TCS Recruitment Drives',
      category: 'placements',
      img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
      desc: 'Interactive GD and mock assessment panels preparing students for premium tech selections.'
    },
    {
      id: 'g5',
      title: 'Centrally Air-Conditioned Knowledge Hub',
      category: 'labs',
      img: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80',
      desc: 'Houses over 60,000 volumes, international journals, and digitized e-learning centers.'
    },
    {
      id: 'g6',
      title: '24-Hour Code Hackathon',
      category: 'events',
      img: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
      desc: 'Where KITS coding champions construct smart algorithms, validated in real-time.'
    },
    {
      id: 'g7',
      title: 'Air-Conditioned Central Seminar Hall',
      category: 'campus',
      img: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
      desc: 'A premium space hosting national conferences, guest lectures, and student symposia.'
    },
    {
      id: 'g8',
      title: 'Placement Preparation Cell',
      category: 'placements',
      img: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80',
      desc: 'Focused training sessions on competitive programming, data structures, and algorithms.'
    }
  ];

  // Rotate hero images automatically
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroIndex(prev => (prev + 1) % heroImages.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as UserProfile);
      });
      setUsersList(list);
    });
    return () => unsubscribe();
  }, []);

  // Countdown timer for OTP
  useEffect(() => {
    if (otpStep !== 'otp' || otpExpiresIn <= 0) return;
    const timer = setInterval(() => {
      setOtpExpiresIn(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpStep, otpExpiresIn]);

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!selectedUserEmail.trim()) {
      setLoginError('Please enter your User ID or Roll Number.');
      return;
    }

    const enteredId = selectedUserEmail.trim().toLowerCase();
    const cleanEntered = enteredId.replace(/[^a-z0-9]/g, '');
    
    // Find matching user by id, rollNumber, email, name, or clean name/email prefix
    const matchedUser = usersList.find(u => 
      (u.id.toLowerCase() === enteredId || 
       u.id.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanEntered ||
       (u.rollNumber && u.rollNumber.toLowerCase() === enteredId) ||
       (u.rollNumber && u.rollNumber.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanEntered) ||
       u.email.toLowerCase() === enteredId ||
       u.email.toLowerCase().split('@')[0] === enteredId ||
       u.name.toLowerCase() === enteredId ||
       u.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanEntered) && 
      u.role === selectedRole
    );

    if (matchedUser) {
      onLoginUser(matchedUser);
    } else {
      setLoginError(`Authentication failed. We could not locate any active ${selectedRole === 'admin' ? 'Management' : selectedRole} profile with ID "${selectedUserEmail}". Since this app is in its initial stage, please Register / Sign Up a new account first!`);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regName.trim() || !regEmail.trim()) {
      setRegError('Please provide both your Name and Email Address.');
      return;
    }

    if (!regEmail.includes('@')) {
      setRegError('Please enter a valid email address.');
      return;
    }

    const emailDup = usersList.some(
      u => u.email.toLowerCase() === regEmail.trim().toLowerCase()
    );
    if (emailDup) {
      setRegError(`A profile with the email address "${regEmail}" already exists in the system.`);
      return;
    }

    setIsSendingOtp(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail.trim().toLowerCase() })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to dispatch verification email.');
      }

      setRegSuccess(`A security code (OTP) was dispatched to ${regEmail}. Please check your inbox!`);
      setOtpStep('otp');
      setOtpCode('');
      setOtpExpiresIn(600); // 10 minutes
      if (data.isTestAccount) {
        setTestOtp(data.testOtp);
        setTestMailUrl(data.testMailUrl);
      } else {
        setTestOtp(null);
        setTestMailUrl(null);
      }
    } catch (err: any) {
      console.error("Error sending verification OTP:", err);
      setRegError(err.message || 'Failed to send verification OTP code. Please check your network connection.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpVerifyAndComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!otpCode.trim()) {
      setRegError('Please enter the 6-digit verification code.');
      return;
    }

    setIsRegistering(true);
    try {
      // First verify OTP code on Express backend
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail.trim().toLowerCase(), code: otpCode.trim() })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Invalid or expired OTP code.');
      }

      // If verified successfully, construct and write UserProfile to Firestore
      let newUserProfile: UserProfile;

      if (selectedRole === 'student') {
        const studId = `stud_${regRoll.toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now()}`;
        newUserProfile = {
          id: studId,
          name: regName.trim(),
          email: regEmail.trim().toLowerCase(),
          role: 'student',
          rollNumber: (regRoll.trim() || `22JR1A05${Math.floor(Math.random() * 90 + 10)}`).toUpperCase(),
          department: regDept,
          semester: regSem,
          parentName: regParentName.trim() || 'Parent of ' + regName,
          parentEmail: regParentEmail.trim() || 'parent_' + regEmail,
          permissions: {
            borrowBooks: true,
            useChat: true,
            postEvents: true
          }
        };
      } else if (selectedRole === 'lecturer') {
        const cleanNameKey = regName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8);
        const lectId = `lect_${cleanNameKey}_${Math.floor(Math.random() * 100)}`;
        newUserProfile = {
          id: lectId,
          name: regName.trim(),
          email: regEmail.trim().toLowerCase(),
          role: 'lecturer',
          department: regDept,
          semester: 'Semester 3',
          permissions: {
            markAttendance: true,
            editGrades: true,
            postEvents: true
          }
        };
      } else {
        const cleanNameKey = regName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8);
        const adminId = `admin_${cleanNameKey}_${Math.floor(Math.random() * 100)}`;
        newUserProfile = {
          id: adminId,
          name: regName.trim(),
          email: regEmail.trim().toLowerCase(),
          role: 'admin',
          department: regDept,
          semester: 'Management'
        };
      }

      await setDoc(doc(db, 'users', newUserProfile.id), newUserProfile);
      
      setRegSuccess(`Email verified! Account registered successfully! Logging in as ${newUserProfile.name}...`);
      
      setTimeout(() => {
        onLoginUser(newUserProfile);
        setOtpStep('details');
        setOtpCode('');
        setTestOtp(null);
        setTestMailUrl(null);
      }, 1500);

    } catch (err: any) {
      console.error("Error completing registration after verification:", err);
      setRegError(err.message || 'Verification / registration failed. Please check your credentials or rules.');
    } finally {
      setIsRegistering(false);
    }
  };

  const filteredUsers = usersList.filter(u => u.role === selectedRole);

  const accreditations = [
    {
      title: 'NIRF-Innovation Rank',
      highlight: '151 - 300 Rank Band',
      desc: 'National Institutional Ranking Framework, Ministry of Education, Government of India. Ranks institutions across India based on teaching, learning, resources, research, and graduation outcomes.',
      badgeColor: 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900/30 dark:text-indigo-400'
    },
    {
      title: 'NBA Accredited (TIER-1)',
      highlight: 'Washington Accord till 2028',
      desc: 'Accredited under Tier-1 Washington Accord for 4 UG Engineering programmes: CSE, IT, ECE, and EEE. Promotes and acknowledges excellence in technical education.',
      badgeColor: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900/30 dark:text-emerald-400'
    },
    {
      title: 'NAAC "A" Grade',
      highlight: 'Evaluated Quality Criteria',
      desc: 'National Assessment and Accreditation Council. Evaluates college for quality criteria in curriculum, governance, teaching methods, faculty, and academic infrastructure.',
      badgeColor: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900/30 dark:text-amber-400'
    },
    {
      title: 'Permanent Affiliation',
      highlight: 'JNTUK Kakinada Affiliated',
      desc: 'By fulfilling all affiliation requirements, including a six-year standing and approval from Local Inquiry Committees of JNTU Kakinada.',
      badgeColor: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900/30 dark:text-red-400'
    },
    {
      title: 'Approved by AICTE',
      highlight: 'National Council Approved',
      desc: 'National Council for Technical Education under the Department of Higher Education, responsible for planning and developing the technical education system.',
      badgeColor: 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/40 dark:border-sky-900/30 dark:text-sky-400'
    },
    {
      title: 'UGC Autonomous Status',
      highlight: 'Greater Academic Flexibility',
      desc: 'Granted by the University Grants Commission, providing the institution with greater flexibility to design curriculum, conduct exams, and enhance standards.',
      badgeColor: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/40 dark:border-purple-900/30 dark:text-purple-400'
    }
  ];

  const partners = [
    { name: 'Flipkart', package: '32.0 LPA' },
    { name: 'TCS CodeVita', package: '26.0 LPA' },
    { name: 'IBM', package: '11.0 LPA' },
    { name: 'Wiley Edge', package: '9.0 LPA' },
    { name: 'APXOR', package: '7.0 LPA' },
    { name: 'SOTI', package: '6.5 LPA' },
    { name: 'WinWire', package: '6.0 LPA' },
    { name: 'Qualys', package: '5.24 LPA' },
    { name: 'Deloitte', package: '4.0 LPA' },
    { name: 'Infosys', package: '3.6 LPA' },
    { name: 'HCL Technologies', package: '3.25 LPA' },
    { name: 'TATA STRIVE', package: '3.5 LPA' },
    { name: 'TAP Academy', package: '3.5 LPA' },
    { name: 'KodNest', package: '3.5 LPA' },
    { name: 'SNOVASYS', package: '3.4 LPA' },
    { name: 'MIRACLE', package: '4.0 LPA' },
    { name: 'NISSI', package: '3.6 LPA' },
    { name: 'FORCE', package: '3.5 LPA' },
    { name: 'KIA Motors', package: '2.4 LPA' },
    { name: 'SL AP', package: '2.4 LPA' },
    { name: 'Mold-Tek', package: '2.4 LPA' }
  ];

  const salaryStats = [
    { range: '7.0 LPA & Above', count: '2 Students' },
    { range: '6.0 LPA & Above', count: '21 Students' },
    { range: '5.0 LPA & Above', count: '24 Students' },
    { range: '4.0 LPA & Above', count: '108 Students' },
    { range: '3.0 LPA & Above', count: '385 Students' },
    { range: '2.4 to 3.0 LPA', count: '193 Students' }
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-300">
      
      {/* 1. WELCOME TO KITS HERO SECTION */}
      <div className="relative rounded-3xl overflow-hidden bg-[#001021] text-white min-h-[480px] flex items-center shadow-xl border border-slate-200/10">
        {/* Background Image overlayed with dark gradient and smooth cross-fade rotation */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {heroImages.map((img, idx) => (
            <motion.img 
              key={img}
              src={img} 
              alt="KITS Guntur Campus Building" 
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: idx === currentHeroIndex ? 0.38 : 0 }}
              transition={{ duration: 1.6, ease: "easeInOut" }}
              referrerPolicy="no-referrer"
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-[#001021] via-[#001c38]/95 to-transparent"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-2xl px-8 py-12 md:py-16 space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-[10px] font-bold uppercase tracking-widest">
            🎓 KITS AUTONOMOUS
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-display leading-tight">
            WELCOME TO KITS
          </h1>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed font-sans max-w-xl">
            4 UG Engineering Programmes <strong className="text-amber-400">CSE, IT, ECE and EEE</strong> are Accredited by NBA under TIER-1 Washington Accord (WA) till 2028. Delivering excellence in technical education and secure placements in Guntur.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <button 
              onClick={onEnterPortals}
              className="px-6 py-3 bg-[#C79F27] hover:bg-[#C79F27]/95 text-[#002147] font-bold rounded-xl shadow-lg hover:shadow-xl transition duration-150 flex items-center gap-2 cursor-pointer text-sm"
            >
              <span>Get Started Now</span>
              <ArrowRight size={16} />
            </button>
            <a 
              href="#placements_section"
              className="px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold rounded-xl transition duration-150 text-sm flex items-center justify-center"
            >
              Read More
            </a>
          </div>
        </div>
      </div>

      {/* Hero Bottom Floating Info Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[9px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-widest font-mono">College Codes</p>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">EAMCET CODE: KITS</h4>
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">Autonomous Status granted by UGC. Permanently Affiliated to JNTUK.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[9px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-widest font-mono">Placements 2024-25</p>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">579* Placements</h4>
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">Outstanding achievements. Top packages including 32 LPA on Flipkart.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[9px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-widest font-mono">NIRF Innovation</p>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">151 - 300 Rank Band</h4>
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">National Institutional Ranking Framework excellence band.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[9px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-widest font-mono">Trending Courses</p>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">CSE, AI&ML, DS, IoT</h4>
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">Highly aligned modern curriculums with global tech standards.</p>
        </div>
      </div>

      {/* 2. UNIFIED ACADEMIC REGISTRY GATEWAY & CATEGORY LOGO (REPLACING OLD STATIC SECTION) */}
      <div id="registry_portal_gateway" className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-md space-y-8 relative overflow-hidden">
        
        {/* Subtle Decorative Background Gradients */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 dark:bg-amber-500/2 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/2 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        {/* Portal Header and Branded Emblem Logo */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-4">
          
          {/* Majestic Center Logo Crest */}
          <div className="relative group cursor-pointer transition-transform duration-300 hover:scale-105">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-[#002147] to-amber-600 rounded-full blur opacity-45 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative w-24 h-24 bg-[#002147] rounded-full border-4 border-amber-400 flex items-center justify-center shadow-xl">
              <Landmark size={44} className="text-amber-400 animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-400 font-extrabold uppercase tracking-wider rounded-lg">
              🛡️ KITS AUTONOMOUS • SECURE REGISTRY
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight font-display">
              JNTUK KITS Academic Registry Gateway
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Select your academic affiliation category below to proceed with real-time cloud operations. Manage students, submit daily attendance logs, and track competitive coding analytics.
            </p>
          </div>

          {/* Help Menu Trigger Button */}
          <button
            onClick={() => setShowHelp(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer shadow-sm transition"
          >
            <HelpCircle size={14} className="text-amber-500 animate-bounce" />
            <span>Need Help? Data Initialization Guide</span>
          </button>
        </div>

        {/* 3 Interactive Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: MANAGEMENT */}
          <button
            onClick={() => {
              setSelectedRole('admin');
              setSelectedUserEmail('');
              setPasswordInput('');
              setLoginError('');
            }}
            className={`text-left p-6 rounded-2xl border-2 transition duration-200 flex flex-col justify-between h-56 cursor-pointer ${
              selectedRole === 'admin'
                ? 'border-[#002147] dark:border-amber-500 bg-amber-500/5 dark:bg-amber-950/20 shadow-lg'
                : 'border-slate-150 dark:border-slate-800 hover:border-amber-400 hover:bg-slate-50/50 dark:hover:bg-slate-850/30'
            }`}
          >
            <div className="space-y-3">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/50 rounded-xl flex items-center justify-center text-[#002147] dark:text-amber-400 border border-amber-200/30">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Management Hub
                  {selectedRole === 'admin' && <Check size={14} className="text-amber-600" />}
                </h4>
                <p className="text-[11px] text-slate-500 leading-normal mt-1">
                  Authorize credentials, toggle database write-access permissions, add lecturers/students, and review semester archives.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#002147] dark:text-amber-400 tracking-wider uppercase flex items-center gap-1">
              Access Registrar <ArrowRight size={10} />
            </span>
          </button>

          {/* Card 2: LECTURERS */}
          <button
            onClick={() => {
              setSelectedRole('lecturer');
              setSelectedUserEmail('');
              setPasswordInput('');
              setLoginError('');
            }}
            className={`text-left p-6 rounded-2xl border-2 transition duration-200 flex flex-col justify-between h-56 cursor-pointer ${
              selectedRole === 'lecturer'
                ? 'border-[#002147] dark:border-amber-500 bg-amber-500/5 dark:bg-amber-950/20 shadow-lg'
                : 'border-slate-150 dark:border-slate-800 hover:border-amber-400 hover:bg-slate-50/50 dark:hover:bg-slate-850/30'
            }`}
          >
            <div className="space-y-3">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center text-indigo-700 dark:text-indigo-400 border border-indigo-200/30">
                <School size={24} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Lecturer Gateway
                  {selectedRole === 'lecturer' && <Check size={14} className="text-indigo-600" />}
                </h4>
                <p className="text-[11px] text-slate-500 leading-normal mt-1">
                  Synchronize daily classroom attendance logs, set homework assignments, evaluate PDF submissions, and publish mid/semester exam grades.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase flex items-center gap-1">
              Access Lecturers <ArrowRight size={10} />
            </span>
          </button>

          {/* Card 3: STUDENTS */}
          <button
            onClick={() => {
              setSelectedRole('student');
              setSelectedUserEmail('');
              setPasswordInput('');
              setLoginError('');
            }}
            className={`text-left p-6 rounded-2xl border-2 transition duration-200 flex flex-col justify-between h-56 cursor-pointer ${
              selectedRole === 'student'
                ? 'border-[#002147] dark:border-amber-500 bg-amber-500/5 dark:bg-amber-950/20 shadow-lg'
                : 'border-slate-150 dark:border-slate-800 hover:border-amber-400 hover:bg-slate-50/50 dark:hover:bg-slate-850/30'
            }`}
          >
            <div className="space-y-3">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center text-emerald-700 dark:text-emerald-400 border border-emerald-200/30">
                <GraduationCap size={24} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Student Gateway
                  {selectedRole === 'student' && <Check size={14} className="text-emerald-600" />}
                </h4>
                <p className="text-[11px] text-slate-500 leading-normal mt-1">
                  Check dynamic attendance percentages, view published grades, search library catalogs, and interact on study groups.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase flex items-center gap-1">
              Access Students <ArrowRight size={10} />
            </span>
          </button>

        </div>

        {/* SECURE DYNAMIC LOGIN COMPONENT */}
        {selectedRole && (
          <div className="p-6 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6 animate-in slide-in-from-top-3 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-850">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lock size={12} className="text-[#C79F27]" />
                Secure Portal Authentication ({selectedRole === 'admin' ? 'Management' : selectedRole})
              </h4>
              <button 
                onClick={() => setSelectedRole(null)}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Cancel Portal
              </button>
            </div>

            {/* Mode selection tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-850">
              <button
                onClick={() => { setAuthMode('login'); setLoginError(''); setRegError(''); setRegSuccess(''); }}
                className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition duration-150 cursor-pointer ${
                  authMode === 'login'
                    ? 'border-[#002147] dark:border-amber-500 text-[#002147] dark:text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
                }`}
              >
                🔐 Sign In (Active Member)
              </button>
              <button
                onClick={() => { setAuthMode('register'); setLoginError(''); setRegError(''); setRegSuccess(''); }}
                className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition duration-150 cursor-pointer ${
                  authMode === 'register'
                    ? 'border-[#002147] dark:border-amber-500 text-[#002147] dark:text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
                }`}
              >
                📝 New Registration (Sign Up)
              </button>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                    ⚠️ {loginError}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      User ID / Name / Roll Number / Email
                    </label>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder={
                          selectedRole === 'student' 
                            ? "e.g. bhargav or 24JR1A05A5" 
                            : selectedRole === 'lecturer' 
                              ? "e.g. lect_haribabu" 
                              : "e.g. admin_babu"
                        }
                        value={selectedUserEmail}
                        onChange={(e) => setSelectedUserEmail(e.target.value)}
                        className="w-full text-xs p-2.5 pl-9 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-[#002147] dark:focus:border-amber-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 dark:text-slate-400">
                      Tip: You can use your Name, Roll Number, or registered Email.
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">
                        Security Passcode
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotModalOpen(true);
                          if (selectedRole) {
                            setForgotRole(selectedRole);
                          }
                        }}
                        className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Key size={13} className="absolute left-3 top-3.5 text-slate-400" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full text-xs p-2.5 pl-9 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-[#002147] dark:focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#002147] hover:bg-[#002856] text-white font-bold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                  >
                    <UserCheck size={14} className="text-amber-400" />
                    <span>Authenticate Profile</span>
                  </button>
                </div>
              </form>
            ) : otpStep === 'details' ? (
              // Sign Up / Register form - Details Step
              <form onSubmit={handleRegisterSubmit} className="space-y-4 font-sans text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gorantla Bhargav"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Gmail / Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. bhargav@kitsguntur.ac.in"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Security Passcode / Password
                    </label>
                    <input
                      type="password"
                      placeholder="e.g. secure123"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  {selectedRole === 'student' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Roll Number (JNTUK ID)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 22JR1A0501"
                        value={regRoll}
                        onChange={(e) => setRegRoll(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Department / Specialization
                    </label>
                    <select
                      value={regDept}
                      onChange={(e) => setRegDept(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                    >
                      {selectedRole === 'admin' ? (
                        <>
                          <option value="Academic Affairs">Academic Affairs</option>
                          <option value="Admissions">Admissions</option>
                          <option value="Examinations Control">Examinations Control</option>
                          <option value="Library & Digital Lab">Library & Digital Lab</option>
                        </>
                      ) : (
                        <>
                          <option value="CSE">CSE</option>
                          <option value="ECE">ECE</option>
                          <option value="EEE">EEE</option>
                          <option value="IT">IT</option>
                        </>
                      )}
                    </select>
                  </div>
                  {selectedRole === 'student' ? (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Current Semester
                      </label>
                      <select
                        value={regSem}
                        onChange={(e) => setRegSem(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                      >
                        <option value="Semester 1">Semester 1</option>
                        <option value="Semester 2">Semester 2</option>
                        <option value="Semester 3">Semester 3</option>
                        <option value="Semester 4">Semester 4</option>
                        <option value="Semester 5">Semester 5</option>
                        <option value="Semester 6">Semester 6</option>
                        <option value="Semester 7">Semester 7</option>
                        <option value="Semester 8">Semester 8</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Role Identifier
                      </label>
                      <input
                        type="text"
                        disabled
                        value={selectedRole === 'lecturer' ? "Authorized Lecturer / Professor" : "Institutional Registrar"}
                        className="w-full text-xs p-2.5 bg-slate-100 dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 rounded-lg font-bold"
                      />
                    </div>
                  )}
                </div>

                {selectedRole === 'student' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-150 dark:border-slate-855">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Parent / Guardian Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Samba Siva Prasad"
                        value={regParentName}
                        onChange={(e) => setRegParentName(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Parent / Guardian Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. parent@gmail.com"
                        value={regParentEmail}
                        onChange={(e) => setRegParentEmail(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSendingOtp}
                    className="px-6 py-3 bg-[#C79F27] hover:bg-[#C79F27]/90 text-[#002147] font-bold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <span>{isSendingOtp ? "Dispatching Verification code..." : "Send Verification Code (OTP)"}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            ) : (
              // Sign Up / Register form - OTP Step
              <form onSubmit={handleOtpVerifyAndComplete} className="space-y-5 font-sans text-xs">
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-2xl">
                  <h4 className="font-bold text-[#002147] dark:text-amber-400 text-xs flex items-center gap-1.5 mb-1">
                    <Mail size={14} />
                    <span>Security Verification Code Dispatched!</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    We have successfully sent a secure 6-digit One-Time Passcode (OTP) to your provided Gmail address: <strong className="text-slate-800 dark:text-slate-100">{regEmail}</strong>. Please check your inbox or spam folder and enter the code below to finalize.
                  </p>
                </div>

                {/* Developer Sandbox Sandbox Help Banner */}
                {testOtp && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/30 p-4 rounded-2xl space-y-2 text-indigo-800 dark:text-indigo-300">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Terminal size={14} />
                      <span>Demo Environment Auto-Filler</span>
                    </div>
                    <p className="text-[10.5px] leading-relaxed">
                      Because this app runs in simulation sandbox mode without an active SMTP server configured in <code className="font-mono bg-indigo-100 dark:bg-indigo-900/50 px-1 py-0.5 rounded">.env</code>, we have exposed the OTP for hassle-free testing:
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold font-mono tracking-wider bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm">
                        {testOtp}
                      </span>
                      {testMailUrl && (
                        <a
                          href={testMailUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm"
                        >
                          <span>Open Test Mailbox</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">
                      Enter 6-Digit Verification Passcode
                    </label>
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <RefreshCw size={10} className="animate-spin text-amber-500" />
                      Code expires in: <strong className={otpExpiresIn < 60 ? "text-rose-500 font-bold" : "text-slate-700 dark:text-slate-300 font-bold"}>{formatCountdown(otpExpiresIn)}</strong>
                    </span>
                  </div>
                  
                  <div className="relative">
                    <Key size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="e.g. 123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full text-center text-lg font-bold font-mono tracking-widest py-3 pl-10 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('details');
                      setRegError('');
                      setRegSuccess('');
                    }}
                    className="w-full sm:w-auto text-xs font-bold text-[#002147] dark:text-amber-400 hover:underline flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>← Edit Email / Change details</span>
                  </button>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      disabled={otpExpiresIn > 570} // limit spam resending
                      onClick={handleRegisterSubmit}
                      className="flex-1 sm:flex-initial px-4 py-3 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 transition"
                    >
                      Resend Code {otpExpiresIn > 570 ? `(${otpExpiresIn - 570}s)` : ''}
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="flex-1 sm:flex-initial px-5 py-3 bg-[#002147] hover:bg-[#002856] text-white font-bold text-xs rounded-xl shadow cursor-pointer flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    >
                      <CheckCircle size={14} className="text-amber-400" />
                      <span>{isRegistering ? "Verifying..." : "Verify & Sign Up"}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}


            {loginError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-950/20 p-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
                ⚠️ {loginError}
              </p>
            )}

            {regError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-950/20 p-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
                ⚠️ {regError}
              </p>
            )}

            {regSuccess && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                🎉 {regSuccess}
              </p>
            )}
          </div>
        )}

        {/* HELP GUIDE OVERLAY DIALOG */}
        {showHelp && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 space-y-6">
              
              <div className="flex justify-between items-center pb-3 border-b border-slate-150 dark:border-slate-800">
                <h3 className="font-extrabold text-lg text-[#002147] dark:text-amber-400 flex items-center gap-2">
                  <HelpCircle size={20} className="text-amber-500" />
                  Data Administration & Portal Setup Guide
                </h3>
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-lg cursor-pointer"
                >
                  Dismiss Guide
                </button>
              </div>

              <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                
                <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl space-y-1.5">
                  <h4 className="font-extrabold text-slate-900 dark:text-slate-100">✨ Fast Initialization Recommendation:</h4>
                  <p>
                    The easiest method to populate initial data across all 3 portals is to log in as <strong>Management (e.g., Dr. P. Babu)</strong>. Once in the Administrative Suite, you can use the interactive <strong>"Users & Permissions Manager"</strong> or trigger automated seeding on any blank collections.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-black text-[#002147] dark:text-amber-400 uppercase tracking-wide">1. Adding Lecturers & Students (Management)</h4>
                  <p>
                    Log in under <strong>Management</strong>. Choose the <strong>"Users & Permissions Manager"</strong> tab. Use the dual-entry registration forms to input:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Lecturers:</strong> Name, Email, Department, Specialized subject codes, and custom permission settings.</li>
                    <li><strong>Students:</strong> Name, Email, Roll Number, Specific Semester tracks, Parent contacts, and LeetCode/HackerRank ranks.</li>
                  </ul>
                  <p className="italic text-slate-400">
                    Once written to Firestore, these candidates will instantly appear in the home page Gateway Directory for click-and-login operations.
                  </p>
                </div>

                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <h4 className="font-black text-[#002147] dark:text-amber-400 uppercase tracking-wide">2. Marking Student Attendance (Lecturers)</h4>
                  <p>
                    Faculty members can log in using their registered email. They will gain access to the <strong>Class Attendance Log</strong> dashboard:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>The system dynamically selects the class list matching the lecturer's specialized department.</li>
                    <li>Toggle present/absent registers on the digital class sheet.</li>
                    <li>Click <strong>"Synchronize to Cloud"</strong> to immediately publish results, auto-update the student percentage state, and log parent reports.</li>
                  </ul>
                </div>

                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <h4 className="font-black text-[#002147] dark:text-amber-400 uppercase tracking-wide">3. Setting Permissions (Management Controls)</h4>
                  <p>
                    Admins can dynamically toggle read/write permissions for specific users. For example:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Disable <strong>"Can Mark Attendance"</strong> or <strong>"Can Edit Grades"</strong> for a lecturer, which blocks those sections in their respective dashboards instantly.</li>
                    <li>Toggle <strong>"Can Borrow Books"</strong> or <strong>"Can Access Study Chat"</strong> for a student to restrict library borrows and real-time student rooms.</li>
                  </ul>
                </div>

              </div>

              <div className="flex justify-end pt-3 border-t border-slate-150 dark:border-slate-800">
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  I Understand, Let's Build!
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Academic Categories Footer of image 1 */}
        <div className="pt-2 text-center space-y-3 font-sans border-t border-slate-150 dark:border-slate-850">
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-relaxed">
            NBA ACCREDITATION | ACCREDITED WITH "A" GRADE BY NAAC | PERMANENTLY AFFILIATED TO JNTUK | APPROVED BY AICTE | AUTONOMOUS STATUS
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-[9px] font-bold">
            <span className="px-2.5 py-0.5 bg-slate-50 dark:bg-slate-850 text-slate-550 dark:text-slate-350 rounded-md">B.Tech: ECE, CSE, CSE (AI), CSE (DS), CSE (AI&ML), EEE, IT</span>
            <span className="px-2.5 py-0.5 bg-slate-50 dark:bg-slate-850 text-slate-550 dark:text-slate-350 rounded-md">M.Tech: ECE (IoT), CSE (AI & ML) CSE (DS), Mech. (Robotics)</span>
          </div>
        </div>
      </div>

      {/* BRANCH WEBSITES QUICK LOGIN SHORTCUTS */}
      <div id="branch_shortcuts_gateway" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/30 text-[10px] text-rose-700 dark:text-rose-400 font-extrabold uppercase rounded-lg">
              🔗 Branch Portal Shortcuts
            </div>
            <h3 className="text-xl font-extrabold text-[#002147] dark:text-slate-100 mt-2">
              Branch Related Websites & Login Portals
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Instant login redirects and academic resources tailored for specific branches.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
            {[
              { id: 'all', label: 'All Resources', icon: LayoutGrid },
              { id: 'cse', label: 'CSE Department', icon: Code },
              { id: 'it', label: 'IT Department', icon: Terminal },
              { id: 'ece_eee', label: 'ECE & EEE', icon: Cpu },
              { id: 'general', label: 'JNTUK & KITS', icon: Globe }
            ].map((btn) => {
              const IconComp = btn.icon;
              return (
                <button
                  key={btn.id}
                  onClick={() => setActiveShortcutBranch(btn.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition ${
                    activeShortcutBranch === btn.id
                      ? 'bg-[#002147] text-white dark:bg-amber-500 dark:text-slate-950 shadow'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <IconComp size={12} />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Shortcuts list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              id: 'leetcode',
              category: 'cse',
              title: 'LeetCode Academic Arena',
              desc: 'Solve programming problems, join contest streams & improve roll coding ranks.',
              url: 'https://leetcode.com/accounts/login/',
              badge: 'Coding Gateway',
              badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30',
              cta: 'Direct Login'
            },
            {
              id: 'github',
              category: 'cse',
              title: 'GitHub Developer Hub',
              desc: 'Sync lab codebases, publish portfolios, and claim student developer packs.',
              url: 'https://github.com/login',
              badge: 'Dev Version Control',
              badgeColor: 'bg-slate-50 text-slate-700 dark:bg-slate-950/45 dark:text-slate-300 border border-slate-200 dark:border-slate-800',
              cta: 'Developer Login'
            },
            {
              id: 'kits_cse',
              category: 'cse',
              title: 'KITS CSE Department',
              desc: 'Official Computer Science syllabus, faculty logs, and course archives.',
              url: 'https://kitsguntur.ac.in/cse',
              badge: 'Departmental Info',
              badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30',
              cta: 'View Division'
            },
            {
              id: 'nptel',
              category: 'cse',
              title: 'NPTEL Local Chapter',
              desc: 'Enrol in SWAYAM online courses, access video lectures, and download certificates.',
              url: 'https://nptel.ac.in/',
              badge: 'E-Learning',
              badgeColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30',
              cta: 'Access Lectures'
            },
            {
              id: 'kaggle',
              category: 'it',
              title: 'Kaggle ML Platform',
              desc: 'Join machine learning challenges, run Jupyter notebooks, and download datasets.',
              url: 'https://www.kaggle.com/account/login',
              badge: 'Data Science Hub',
              badgeColor: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30',
              cta: 'Kaggle Login'
            },
            {
              id: 'hackerrank',
              category: 'it',
              title: 'HackerRank Dev Arena',
              desc: 'Compete in campus coding assessments and practice structural data-structures.',
              url: 'https://www.hackerrank.com/auth/login',
              badge: 'Skill Assessments',
              badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30',
              cta: 'HackerRank Login'
            },
            {
              id: 'colab',
              category: 'it',
              title: 'Google Colab Notebooks',
              desc: 'Train Neural Networks and run Python ML models on cloud-hosted Google GPUs.',
              url: 'https://colab.research.google.com/',
              badge: 'AI Training Space',
              badgeColor: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30',
              cta: 'Launch Jupyter'
            },
            {
              id: 'huggingface',
              category: 'it',
              title: 'Hugging Face AI models',
              desc: 'Explore pre-trained transformers, LLMs, and download modern AI architectures.',
              url: 'https://huggingface.co/login',
              badge: 'AI Model Registry',
              badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30',
              cta: 'HF Workspace'
            },
            {
              id: 'tinkercad',
              category: 'ece_eee',
              title: 'Tinkercad Circuits Lab',
              desc: 'Simulate microcontrollers, IOT hardware, breadboard wiring & Arduino designs.',
              url: 'https://www.tinkercad.com/login',
              badge: 'Hardware Simulator',
              badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30',
              cta: 'Tinkercad Login'
            },
            {
              id: 'ieeexplore',
              category: 'ece_eee',
              title: 'IEEE Xplore Research',
              desc: 'Search engineering reports, IEEE publications, and look up academic papers.',
              url: 'https://ieeexplore.ieee.org/servlet/wayback',
              badge: 'Scholarly Articles',
              badgeColor: 'bg-[#002147]/10 text-[#002147] dark:bg-amber-950/30 dark:text-amber-400 border border-[#002147]/20 dark:border-amber-900/20',
              cta: 'Research Login'
            },
            {
              id: 'matlab_online',
              category: 'ece_eee',
              title: 'MATLAB Online Web',
              desc: 'Analyze control systems, signals, DSP, and run vector simulations on the browser.',
              url: 'https://matlab.mathworks.com/',
              badge: 'DSP & Simulations',
              badgeColor: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/30',
              cta: 'MATLAB Web'
            },
            {
              id: 'electrical4u',
              category: 'ece_eee',
              title: 'Electrical4U Hub',
              desc: 'Review electrical engineering fundamental formulas, circuit guides, and MCQs.',
              url: 'https://www.electrical4u.com/',
              badge: 'EEE Encyclopedia',
              badgeColor: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30',
              cta: 'Read Tutorials'
            },
            {
              id: 'jntuk_results',
              category: 'general',
              title: 'JNTUK Results Gateway',
              desc: 'Official JNTU Kakinada examination marks, fast updates, and semester SGPA logs.',
              url: 'https://results.jntuk.edu.in/',
              badge: 'University Portal',
              badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30',
              cta: 'Lookup Scores'
            },
            {
              id: 'aicte',
              category: 'general',
              title: 'AICTE Student Portal',
              desc: 'National technical councils notifications, approval rules, and institutional criteria.',
              url: 'https://www.aicte-india.org/',
              badge: 'Technical Council',
              badgeColor: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30',
              cta: 'AICTE Portal'
            },
            {
              id: 'kits_main',
              category: 'general',
              title: 'KITS Guntur Home',
              desc: 'The official home page for KKITS Autonomous college news and administrative contacts.',
              url: 'https://kitsguntur.ac.in/',
              badge: 'Institutional Site',
              badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30',
              cta: 'Official Web'
            },
            {
              id: 'scholarship',
              category: 'general',
              title: 'National Scholarship site',
              desc: 'Register and check central scholarship statuses, eligibility criteria & renewal applications.',
              url: 'https://scholarships.gov.in/',
              badge: 'Gov Scholarships',
              badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30',
              cta: 'Scholarship Login'
            }
          ].filter(item => activeShortcutBranch === 'all' || item.category === activeShortcutBranch).map((link) => (
            <div 
              key={link.id}
              className="p-5 bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800 rounded-2xl flex flex-col justify-between hover:border-rose-500/30 dark:hover:border-amber-500/30 transition-all duration-300"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase ${link.badgeColor}`}>
                    {link.badge}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 leading-snug">
                    {link.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                    {link.desc}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800 flex justify-between items-center text-[10px] font-bold">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedUserEmail || "22JR1A0501");
                    alert(`Copied ID / Roll Number to clipboard: ${selectedUserEmail || "22JR1A0501"}`);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 cursor-pointer text-[9px]"
                  title="Copy your active email / Roll ID to paste on login screen"
                >
                  📋 Copy ID
                </button>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#002147] dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>{link.cta}</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. PLACEMENTS SECTION (IMAGE 3) */}
      <div id="placements_section" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recruiter Logins / Logos Badge Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold uppercase rounded-lg">
                  💼 Placement Hub
                </div>
                <h3 className="text-xl font-extrabold text-[#002147] dark:text-slate-100 mt-2">Outstanding Placement Achievements</h3>
                <p className="text-xs text-slate-500 mt-1">Our Students Shine with TOP PLACEMENTS in top global corporations.</p>
              </div>
              <div className="p-3 bg-[#002147] border-2 border-[#C79F27] text-white rounded-2xl text-center shadow-md">
                <p className="text-[11px] uppercase tracking-wider font-extrabold text-amber-400 font-mono">Total Selected</p>
                <h3 className="text-2xl font-black font-display mt-0.5">579*</h3>
                <p className="text-[9px] text-slate-300 mt-0.5 font-sans">Batch 2024-25</p>
              </div>
            </div>

            {/* Recruiter Logos Badges */}
            <div className="mt-6">
              <h5 className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-widest mb-3.5">Top Recruiting Partners & Packages</h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {partners.slice(0, 15).map((p, idx) => (
                  <div key={idx} className="p-3 border border-slate-100 dark:border-slate-850 hover:border-emerald-500/20 dark:hover:border-emerald-500/20 rounded-xl transition duration-150 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{p.name}</span>
                    <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold rounded">
                      {p.package}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
            ⭐ <strong>KITS Placement Assurance:</strong> Over 150+ campus recruitment drives are organized annually by our dedicated Training and Placements Division led by <strong>Prof. Ch. Chandrasekhar Reddy</strong>.
          </div>
        </div>

        {/* Salary Stats table list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Award className="text-amber-500" size={16} />
              Placement Salary Statistics
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Verified selections catalogued by the college audit cell.</p>

            <div className="mt-5 space-y-3.5 font-sans">
              {salaryStats.map((stat, idx) => (
                <div key={idx} className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-850 text-xs">
                  <span className="font-medium text-slate-500 dark:text-slate-450">{stat.range} Package</span>
                  <span className="px-3 py-1 bg-[#002147] text-white dark:bg-slate-800 text-[10px] font-bold rounded-lg">
                    {stat.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={onEnterPortals}
            className="w-full py-3 bg-[#002147] hover:bg-[#002147]/90 text-white font-bold rounded-xl text-xs transition duration-150 flex items-center justify-center gap-2 cursor-pointer mt-6"
          >
            <span>Simulate Student Logins</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* KITS IMMERSIVE CAMPUS GALLERY SECTION (IMPRESSIVE & ANIMATED PHOTOS) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 text-[10px] text-indigo-700 dark:text-indigo-400 font-extrabold uppercase tracking-wider rounded-lg">
            ✨ Interactive Virtual Showcase
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
            KITS Immersive Campus Visual Gallery
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Explore advanced infrastructure, student hackathons, and high-impact placements with dynamic hovering zoom and details.
          </p>

          {/* Filtering Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
            {[
              { id: 'all', label: 'All Highlights' },
              { id: 'campus', label: 'Beautiful Campus' },
              { id: 'labs', label: 'Advanced Labs & Library' },
              { id: 'events', label: 'Mega Events & Culture' },
              { id: 'placements', label: 'Placement Selections' }
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setGalleryFilter(pill.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-[10.5px] font-bold tracking-wide transition cursor-pointer border ${
                  galleryFilter === pill.id
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Grid */}
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {galleryPhotos
              .filter(p => galleryFilter === 'all' || p.category === galleryFilter)
              .map((photo) => (
                <motion.div
                  layout
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.35 }}
                  onClick={() => setSelectedGalleryPhoto(photo)}
                  className="group relative h-64 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-sm hover:shadow-xl transition-all duration-300 cursor-zoom-in"
                >
                  {/* Photo with zoom on hover */}
                  <img
                    src={photo.img}
                    alt={photo.title}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-1"
                    referrerPolicy="no-referrer"
                  />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent opacity-75 group-hover:opacity-85 transition-opacity" />

                  {/* Hover contents: category indicator top left, details bottom */}
                  <span className="absolute top-3 left-3 px-2 py-0.5 bg-black/50 backdrop-blur-md text-white text-[8px] font-bold uppercase tracking-wider rounded-md border border-white/10">
                    {photo.category}
                  </span>

                  <div className="absolute bottom-0 inset-x-0 p-4 space-y-1 text-left transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <h4 className="text-xs font-extrabold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                      {photo.title}
                    </h4>
                    <p className="text-[10px] text-slate-300 line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-350 delay-75">
                      {photo.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </motion.div>

        {/* Detailed Lightbox Modal */}
        <AnimatePresence>
          {selectedGalleryPhoto && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="relative bg-slate-900 text-white rounded-3xl overflow-hidden max-w-2xl w-full border border-slate-800 shadow-2xl flex flex-col"
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedGalleryPhoto(null)}
                  className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition cursor-pointer"
                >
                  <X size={16} />
                </button>

                {/* Big Image */}
                <div className="h-96 w-full relative">
                  <img
                    src={selectedGalleryPhoto.img}
                    alt={selectedGalleryPhoto.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-40" />
                </div>

                {/* Content info */}
                <div className="p-6 space-y-3 text-left bg-slate-900">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-wider rounded border border-indigo-500/30">
                      {selectedGalleryPhoto.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {selectedGalleryPhoto.id.toUpperCase()}</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-white font-sans">{selectedGalleryPhoto.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{selectedGalleryPhoto.desc}</p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. INSTITUTIONAL DIRECTORY & HOD NAMES (IMAGE 4) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 text-[10px] text-amber-700 dark:text-amber-400 font-extrabold uppercase tracking-wider rounded-lg">
            🏢 Institutional Directory
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
            KITS Academic Leadership & Advisory Committee
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Governing Board, Patrons and Department Head of Departments (HoDs) of KITS Autonomous
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Patrons Block */}
          <div className="space-y-4 bg-slate-50 dark:bg-slate-950/30 p-5 rounded-2xl border border-slate-150 dark:border-slate-800">
            <div>
              <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">Governing Patrons</h4>
              <div className="w-8 h-0.5 bg-[#C79F27] mt-1.5 rounded-full" />
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase font-mono">Chief Patrons</p>
                <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">Dr. K. Subba Rao</h5>
                <p className="text-[10px] text-amber-600 dark:text-amber-400">Chairman, KITS Autonomous</p>
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">Sri K. Sekhar</h5>
                <p className="text-[10px] text-amber-600 dark:text-amber-400">Secretary, KITS Autonomous</p>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 my-2 pt-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase font-mono">Patrons</p>
                <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">Dr. K. Hari Babu</h5>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-sans">Director, KITS Autonomous</p>
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">Dr. P. Babu</h5>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-sans">Principal, KITS Autonomous</p>
              </div>
            </div>
          </div>

          {/* Convenors Block */}
          <div className="space-y-4 bg-slate-50 dark:bg-slate-950/30 p-5 rounded-2xl border border-slate-150 dark:border-slate-800">
            <div>
              <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">Convenors Committee</h4>
              <div className="w-8 h-0.5 bg-[#C79F27] mt-1.5 rounded-full" />
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase font-mono">Convenor</p>
                <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">Prof. M. Basaveswara Rao</h5>
                <p className="text-[10px] text-amber-600 dark:text-amber-400">HoD, BS&H (Basic Sciences & Humanities)</p>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 my-2 pt-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase font-mono">Co-Convenors</p>
                <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">Prof. R. Ramesh</h5>
                <p className="text-[10px] text-amber-600 dark:text-amber-400">HoD, Computer Science & Engineering</p>
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">Dr. M. Purna Kishore</h5>
                <p className="text-[10px] text-amber-600 dark:text-amber-400">Professor, ECE</p>
              </div>
            </div>
          </div>

          {/* Advisory & HODs Block */}
          <div className="space-y-4 bg-slate-50 dark:bg-slate-950/30 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 md:col-span-1">
            <div>
              <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">Advisory Committee & HODs</h4>
              <div className="w-8 h-0.5 bg-[#C79F27] mt-1.5 rounded-full" />
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1 text-[11px] font-sans">
              <div className="flex justify-between py-1 border-b border-slate-200/55 dark:border-slate-800/60">
                <span className="font-bold text-slate-700 dark:text-slate-200">Dr. M.S.S. Sai</span>
                <span className="text-slate-500">HoD, IT</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/55 dark:border-slate-800/60">
                <span className="font-bold text-slate-700 dark:text-slate-200">Dr. N. Adinarayana</span>
                <span className="text-slate-500">HoD, ECE</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/55 dark:border-slate-800/60">
                <span className="font-bold text-slate-700 dark:text-slate-200">Dr. G. Murali</span>
                <span className="text-slate-500">HoD, CSE-AI&ML</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/55 dark:border-slate-800/60">
                <span className="font-bold text-slate-700 dark:text-slate-200">Dr. B. Bhanu Prakash</span>
                <span className="text-slate-500">HoD, CSE-DS</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/55 dark:border-slate-800/60">
                <span className="font-bold text-slate-700 dark:text-slate-200">Dr. Y. Rajesh</span>
                <span className="text-slate-500">HoD, EEE</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/55 dark:border-slate-800/60">
                <span className="font-bold text-slate-700 dark:text-slate-200">Prof. P. Gopala Krishna</span>
                <span className="text-slate-500">HoD, BS&H</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/55 dark:border-slate-800/60">
                <span className="font-bold text-slate-700 dark:text-slate-200">Prof. Ch. Chandrasekhar Reddy</span>
                <span className="text-slate-500">HoD, T&P</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-bold text-slate-700 dark:text-slate-200">Prof. K. Venkata Rao</span>
                <span className="text-slate-500">HoD, Sports</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Key size={16} className="text-amber-500 animate-pulse" />
                <span>Credential Recovery Portal</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsForgotModalOpen(false);
                  setForgotEmail('');
                  setRecoveryResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              If you have registered an account on the KITS Guntur Portal but cannot log in, enter your registered email address and division role below to instantly retrieve your active credentials.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              setIsResetting(true);
              setRecoveryResult(null);
              setTimeout(() => {
                const emailQuery = forgotEmail.trim().toLowerCase();
                const matched = usersList.find(u => 
                  u.email.toLowerCase() === emailQuery && u.role === forgotRole
                );

                if (matched) {
                  setRecoveryResult({
                    success: true,
                    message: `Account located successfully! Welcome back, ${matched.name}.`,
                    user: matched
                  });
                } else {
                  setRecoveryResult({
                    success: false,
                    message: `No active ${forgotRole} profile was found with the registered email "${forgotEmail}". Please verify your email or sign up.`
                  });
                }
                setIsResetting(false);
              }, 600);
            }} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Select Portal Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['student', 'lecturer', 'admin'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForgotRole(r)}
                      className={`py-2 text-[10px] font-bold rounded-xl border capitalize transition-all cursor-pointer text-center ${
                        forgotRole === r
                          ? 'bg-[#002147] border-[#002147] text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. bhargav@kitsguntur.ac.in"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full text-xs p-2.5 pl-9 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-[#002147] dark:focus:border-amber-500"
                  />
                </div>
              </div>

              {recoveryResult && (
                <div className={`p-4 rounded-xl text-xs space-y-2 border ${
                  recoveryResult.success 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-850 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-300' 
                    : 'bg-rose-50 border-rose-100 text-rose-850 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-300'
                }`}>
                  <div className="flex items-start gap-1.5 font-semibold text-[11px]">
                    {recoveryResult.success ? (
                      <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <span className="text-rose-500 font-bold shrink-0 mt-0.5">⚠️</span>
                    )}
                    <span>{recoveryResult.message}</span>
                  </div>

                  {recoveryResult.success && recoveryResult.user && (
                    <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-emerald-100/50 dark:border-emerald-900/20 space-y-1.5 text-slate-700 dark:text-slate-300 text-[11px] font-sans">
                      <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-1">
                        <span className="text-slate-400 font-medium">Full Name:</span>
                        <span className="font-bold">{recoveryResult.user.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-1">
                        <span className="text-slate-400 font-medium">User ID / Roll:</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 select-all">{recoveryResult.user.rollNumber || recoveryResult.user.id}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-1">
                        <span className="text-slate-400 font-medium">Department:</span>
                        <span className="font-medium">{recoveryResult.user.department}</span>
                      </div>
                      {recoveryResult.user.semester && (
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Semester:</span>
                          <span className="font-medium">{recoveryResult.user.semester}</span>
                        </div>
                      )}
                      <p className="text-[10px] text-indigo-500 font-semibold pt-1 text-center">
                        🎉 Copy your User ID / Roll and log in now!
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotModalOpen(false);
                    setForgotEmail('');
                    setRecoveryResult(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-5 py-2 bg-[#002147] hover:bg-[#001835] dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isResetting ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Search Account</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
