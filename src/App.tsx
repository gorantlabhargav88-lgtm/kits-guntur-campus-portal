import React, { useState, useEffect } from 'react';
import { checkAndSeedDatabase } from './lib/seeder';
import { UserProfile } from './types';
import RoleSelector from './components/RoleSelector';
import StudentDashboard from './components/StudentDashboard';
import LecturerDashboard from './components/LecturerDashboard';
import AdminDashboard from './components/AdminDashboard';
import CampusHomePage from './components/CampusHomePage';
import { db, collection, onSnapshot, doc, setDoc } from './lib/firebase';
import { Moon, Sun, ShieldAlert, BookOpen, GraduationCap, School, RefreshCw, Mail, Lock, Key, ArrowLeft, ArrowRight, UserCheck, CheckCircle, HelpCircle, Terminal, ExternalLink } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [seedingComplete, setSeedingComplete] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'portal'>('home');

  // New authentication and registration states
  const [selectedLoginRole, setSelectedLoginRole] = useState<'student' | 'lecturer' | 'admin' | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginUserId, setLoginUserId] = useState('');
  const [loginPasscode, setLoginPasscode] = useState('');
  const [loginError, setLoginError] = useState('');

  // New registration states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRoll, setRegRoll] = useState('');
  const [regDept, setRegDept] = useState('CSE');
  const [regSem, setRegSem] = useState('Semester 3');
  const [regParentName, setRegParentName] = useState('');
  const [regParentEmail, setRegParentEmail] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
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

  const [usersList, setUsersList] = useState<UserProfile[]>([]);

  // Trigger automated seeding of KITS Guntur mock catalog on first load
  useEffect(() => {
    async function seedAndInit() {
      await checkAndSeedDatabase();
      setSeedingComplete(true);
    }
    seedAndInit();
  }, []);

  // Listen to Firestore users list
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

  // Synchronize currentUser with real-time updates from usersList (e.g. photo URL)
  useEffect(() => {
    if (currentUser) {
      const updatedUser = usersList.find(u => u.id === currentUser.id);
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(updatedUser);
      }
    }
  }, [usersList, currentUser]);

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

  // Handle Dark mode class toggling
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const getRoleHeaderIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <School className="text-rose-500 animate-pulse" size={24} />;
      case 'lecturer':
        return <GraduationCap className="text-amber-500 animate-bounce" size={24} />;
      default:
        return <BookOpen className="text-emerald-500" size={24} />;
    }
  };

  const handlePortalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginUserId.trim()) {
      setLoginError('Please enter your User ID or Roll Number.');
      return;
    }

    const enteredId = loginUserId.trim().toLowerCase();
    const cleanEntered = enteredId.replace(/[^a-z0-9]/g, '');

    const matchedUser = usersList.find(u => 
      (u.id.toLowerCase() === enteredId || 
       u.id.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanEntered ||
       (u.rollNumber && u.rollNumber.toLowerCase() === enteredId) || 
       (u.rollNumber && u.rollNumber.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanEntered) ||
       u.email.toLowerCase() === enteredId ||
       u.email.toLowerCase().split('@')[0] === enteredId ||
       u.name.toLowerCase() === enteredId ||
       u.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanEntered) && 
      u.role === selectedLoginRole
    );

    if (matchedUser) {
      setCurrentUser(matchedUser);
      setCurrentView('portal');
    } else {
      setLoginError(`Authentication failed. Could not find any active ${selectedLoginRole === 'admin' ? 'Management' : selectedLoginRole} account with ID "${loginUserId}". Since this app is in its initial stage, please Register / Sign Up a new account first!`);
    }
  };

  const handlePortalRegister = async (e: React.FormEvent) => {
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

  const handlePortalOtpVerifyAndComplete = async (e: React.FormEvent) => {
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

      if (selectedLoginRole === 'student') {
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
          leetcodeRank: 35000,
          leetcodeSolved: Math.round(50 + Math.random() * 100),
          hackerrankRank: '4-Star (Problem Solving)',
          hackerrankBadgeCount: 4,
          hackerrankGlobalRank: Math.round(Math.random() * 15000 + 1000),
          permissions: {
            borrowBooks: true,
            useChat: true,
            postEvents: true
          }
        };
      } else if (selectedLoginRole === 'lecturer') {
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
        setCurrentUser(newUserProfile);
        setCurrentView('portal');
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

  return (
    <div className={isDarkMode ? 'dark bg-slate-950 text-slate-100 min-h-screen font-sans' : 'bg-slate-50 text-slate-800 min-h-screen font-sans'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Main Navbar - Oxford University Inspired Traditional Prestige Styling */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-[#002147] border-b-4 border-[#C79F27] p-6 rounded-2xl shadow-lg mb-8 gap-4 text-white">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-white/10 text-amber-400 rounded-xl border border-white/15">
              {currentUser ? getRoleHeaderIcon(currentUser.role) : <BookOpen size={24} />}
            </div>
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="font-display font-bold tracking-tight text-xl text-white">
                  KITS Guntur
                </h1>
                <span className="text-[9px] bg-amber-500/10 border border-amber-500/35 text-amber-300 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest font-sans self-start">
                  JNTUK Affiliated • Academic Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 font-sans">
                KKR & KSR Institute of Technology and Sciences • National Board of Accreditation (NBA)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Dark Mode Switch */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 transition duration-150 cursor-pointer"
              title="Toggle Contrast Mode"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Profile switching session */}
            <RoleSelector 
              currentUser={currentUser} 
              onSelectRole={(role) => {
                setCurrentUser(null);
                setSelectedLoginRole(role);
                setAuthMode('login');
                setLoginUserId('');
                setLoginError('');
                setRegError('');
                setRegSuccess('');
                setCurrentView('portal');
              }} 
              onSignOut={() => {
                setCurrentUser(null);
                setSelectedLoginRole(null);
                setCurrentView('home');
              }}
            />
          </div>
        </header>

        {/* Navigation Tabs - Home (Campus Website) vs Academic Portals */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow-sm mb-8 gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('home')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentView === 'home'
                  ? 'bg-[#002147] text-white'
                  : 'text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850'
              }`}
            >
              🏛️ Campus Home
            </button>
            <button
              onClick={() => setCurrentView('portal')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentView === 'portal'
                  ? 'bg-[#002147] text-white'
                  : 'text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850'
              }`}
            >
              🔑 Portal Gateways
            </button>
          </div>

          <div className="text-right text-[11px] font-medium text-slate-500 flex items-center gap-2">
            {currentUser ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active: <strong className="text-slate-700 dark:text-slate-300">{currentUser.name}</strong> ({currentUser.role})</span>
                <button
                  onClick={() => {
                    setCurrentUser(null);
                    setCurrentView('home');
                  }}
                  className="ml-2 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <span className="font-mono text-slate-400">✨ KITS Autonomous Simulation • NBA Tier-1</span>
            )}
          </div>
        </div>

        {/* Dashboard display depending on RBAC selection */}
        <main className="min-h-[500px]">
          {!seedingComplete ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 animate-pulse gap-3">
              <RefreshCw className="animate-spin text-indigo-500" size={32} />
              <p className="text-sm font-semibold">Pre-populating campus records catalog...</p>
            </div>
          ) : currentView === 'home' ? (
            <CampusHomePage 
              onEnterPortals={() => setCurrentView('portal')} 
              onLoginUser={(user) => {
                setCurrentUser(user);
                setCurrentView('portal');
              }}
            />
          ) : currentUser ? (
            <div className="animate-in fade-in duration-200">
              {currentUser.role === 'student' && <StudentDashboard student={currentUser} />}
              {currentUser.role === 'lecturer' && <LecturerDashboard lecturer={currentUser} />}
              {currentUser.role === 'admin' && <AdminDashboard admin={currentUser} />}
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in duration-300">
              {selectedLoginRole !== null ? (
                // Dedicated Login & Register Page for the selected administrative division
                <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                  {/* Top back button and role header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setSelectedLoginRole(null);
                        setLoginError('');
                        setRegError('');
                        setRegSuccess('');
                      }}
                      className="inline-flex items-center gap-1 text-xs text-[#002147] dark:text-amber-400 font-bold hover:underline cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Portals</span>
                    </button>
                    <span className="text-[10px] bg-[#002147]/5 dark:bg-amber-500/5 text-[#002147] dark:text-amber-400 border border-current px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {selectedLoginRole === 'admin' ? 'Management Gateway' : selectedLoginRole === 'lecturer' ? 'Faculty Gateway' : 'Student Gateway'}
                    </span>
                  </div>

                  {/* Mode Tabs */}
                  <div className="flex border-b border-slate-200 dark:border-slate-855">
                    <button
                      onClick={() => { setAuthMode('login'); setLoginError(''); setRegError(''); setRegSuccess(''); }}
                      className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition duration-155 cursor-pointer ${
                        authMode === 'login'
                          ? 'border-[#002147] dark:border-amber-500 text-[#002147] dark:text-amber-400'
                          : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
                      }`}
                    >
                      🔐 Sign In (Active Member)
                    </button>
                    <button
                      onClick={() => { setAuthMode('register'); setLoginError(''); setRegError(''); setRegSuccess(''); }}
                      className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition duration-155 cursor-pointer ${
                        authMode === 'register'
                          ? 'border-[#002147] dark:border-amber-500 text-[#002147] dark:text-amber-400'
                          : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
                      }`}
                    >
                      📝 New Registration (Sign Up)
                    </button>
                  </div>

                  {authMode === 'login' ? (
                    <form onSubmit={handlePortalLogin} className="space-y-4">
                      {loginError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                          ⚠️ {loginError}
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                          Enter User ID / Name / Roll Number / Email
                        </label>
                        <div className="relative">
                          <Mail size={14} className="absolute left-3 top-3.5 text-slate-400" />
                          <input
                            type="text"
                            required
                            placeholder={
                              selectedLoginRole === 'student' 
                                ? "e.g. bhargav or 24JR1A05A5" 
                                : selectedLoginRole === 'lecturer' 
                                  ? "e.g. lect_haribabu" 
                                  : "e.g. admin_babu"
                            }
                            value={loginUserId}
                            onChange={(e) => setLoginUserId(e.target.value)}
                            className="w-full text-xs p-3 pl-10 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:border-[#002147] dark:focus:border-amber-500"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 dark:text-slate-400">
                          Tip: You can use your Name, Roll Number, or registered Email.
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            Security Passcode
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setIsForgotModalOpen(true);
                              if (selectedLoginRole) {
                                setForgotRole(selectedLoginRole);
                              }
                            }}
                            className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
                          >
                            Forgot Password?
                          </button>
                        </div>
                        <div className="relative">
                          <Key size={14} className="absolute left-3 top-3.5 text-slate-400" />
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={loginPasscode}
                            onChange={(e) => setLoginPasscode(e.target.value)}
                            className="w-full text-xs p-3 pl-10 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-855 rounded-xl focus:outline-none focus:border-[#002147] dark:focus:border-amber-500"
                          />
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1">
                          Note: In development stage, any password/passcode is accepted. Authentication is verified strictly by User ID.
                        </p>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-[#002147] hover:bg-[#001835] text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-2 mt-4"
                      >
                        <UserCheck size={14} className="text-amber-400" />
                        <span>Authenticate & Enter Portal</span>
                      </button>
                    </form>
                  ) : otpStep === 'details' ? (
                    <form onSubmit={handlePortalRegister} className="space-y-4">
                      {regError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                          ⚠️ {regError}
                        </div>
                      )}
                      {regSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-medium flex items-center gap-1.5">
                          <CheckCircle size={14} />
                          <span>{regSuccess}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Sai Ram Prasad"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-855 rounded-xl focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            Gmail / Email Address
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="e.g. sairam.p@kitsguntur.ac.in"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-855 rounded-xl focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        {selectedLoginRole === 'student' && (
                          <>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                JNTUK Roll Number (User ID)
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. 22JR1A0501"
                                value={regRoll}
                                onChange={(e) => setRegRoll(e.target.value)}
                                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-855 rounded-xl focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                Academic Year & Semester
                              </label>
                              <select
                                value={regSem}
                                onChange={(e) => setRegSem(e.target.value)}
                                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-855 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
                              >
                                <option value="Semester 1">B.Tech 1st Year (Sem 1)</option>
                                <option value="Semester 2">B.Tech 1st Year (Sem 2)</option>
                                <option value="Semester 3">B.Tech 2nd Year (Sem 3)</option>
                                <option value="Semester 4">B.Tech 2nd Year (Sem 4)</option>
                                <option value="Semester 5">B.Tech 3rd Year (Sem 5)</option>
                                <option value="Semester 6">B.Tech 3rd Year (Sem 6)</option>
                                <option value="Semester 7">B.Tech 4th Year (Sem 7)</option>
                                <option value="Semester 8">B.Tech 4th Year (Sem 8)</option>
                              </select>
                            </div>
                          </>
                        )}

                        {selectedLoginRole !== 'admin' && (
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                              Engineering Department / Branch
                            </label>
                            <select
                              value={regDept}
                              onChange={(e) => setRegDept(e.target.value)}
                              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 text-slate-855 dark:text-slate-100 border border-slate-200 dark:border-slate-855 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
                            >
                              <option value="CSE">CSE</option>
                              <option value="ECE">ECE</option>
                              <option value="EEE">EEE</option>
                              <option value="IT">IT</option>
                            </select>
                          </div>
                        )}

                        {selectedLoginRole === 'admin' && (
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                              Management Office Division
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Academic Affairs"
                              value={regDept}
                              onChange={(e) => setRegDept(e.target.value)}
                              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-855 rounded-xl focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        )}

                        {selectedLoginRole === 'student' && (
                          <>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                Parent / Guardian Name
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Samba Siva Prasad"
                                value={regParentName}
                                onChange={(e) => setRegParentName(e.target.value)}
                                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-855 rounded-xl focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                Parent Contact Email
                              </label>
                              <input
                                type="email"
                                placeholder="e.g. parent@gmail.com"
                                value={regParentEmail}
                                onChange={(e) => setRegParentEmail(e.target.value)}
                                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 border border-slate-200 dark:border-slate-855 rounded-xl focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isSendingOtp}
                        className="w-full py-3 bg-[#C79F27] hover:bg-[#C79F27]/90 text-[#002147] font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                      >
                        <ArrowRight size={14} />
                        <span>{isSendingOtp ? "Dispatching Verification..." : "Send Verification Code (OTP)"}</span>
                      </button>
                    </form>
                  ) : (
                    // Sign Up / Register form - OTP Step
                    <form onSubmit={handlePortalOtpVerifyAndComplete} className="space-y-4 font-sans text-xs">
                      {regError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                          ⚠️ {regError}
                        </div>
                      )}
                      {regSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-medium flex items-center gap-1.5">
                          <CheckCircle size={14} />
                          <span>{regSuccess}</span>
                        </div>
                      )}

                      <div className="bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/40 p-4 rounded-xl">
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
                        <div className="bg-indigo-50 dark:bg-indigo-950/35 border border-indigo-200 dark:border-indigo-900/30 p-4 rounded-xl space-y-2 text-indigo-800 dark:text-indigo-300">
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <Terminal size={14} />
                            <span>Demo Environment Auto-Filler</span>
                          </div>
                          <p className="text-[10.5px] leading-relaxed">
                            Because this app runs in simulation sandbox mode without an active SMTP server configured, we have exposed the OTP for hassle-free testing:
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
                          <span>← Edit details</span>
                        </button>

                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            disabled={otpExpiresIn > 570} // limit spam resending
                            onClick={handlePortalRegister}
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
                </div>
              ) : (
                <>
                  {/* Premium Welcome Header Banner - Oxford style with Serif and gold accents */}
                  <div className="text-center max-w-3xl mx-auto space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-[#002147]/50 border border-amber-200/50 dark:border-amber-900/30 text-[10px] text-amber-700 dark:text-amber-400 font-extrabold uppercase tracking-widest font-sans">
                      🏫 KITS GUNTUR ACADEMIC REGISTRY SYSTEMS
                    </div>
                    <h2 className="text-3xl md:text-4xl font-display font-semibold text-[#002147] dark:text-amber-400 tracking-tight leading-tight">
                      Academic Portals & Gateways
                    </h2>
                    <div className="w-16 h-1 bg-[#C79F27] mx-auto rounded-full" />
                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                      Select one of the three primary administrative and academic gateways below to simulate the fully integrated, high-performance JNTUK student, lecturer, or dean management experience in the college cloud database.
                    </p>
                  </div>

                  {/* Portal Category Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* 1. Student Portal */}
                    <div 
                      onClick={() => {
                        setSelectedLoginRole('student');
                        setAuthMode('login');
                        setLoginUserId('');
                        setLoginError('');
                      }}
                      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:border-emerald-500/40 dark:hover:border-emerald-500/30 transition-all duration-300 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full group-hover:scale-125 transition-transform duration-300" />
                      <div>
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-5 group-hover:rotate-6 transition-transform duration-350">
                          <BookOpen size={22} />
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider font-sans">Access Category I</span>
                        <h3 className="text-lg font-display font-semibold text-slate-900 dark:text-slate-100 mt-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          Student Dashboard
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                          For active students to check real-time attendance registers, study guide PDFs, upcoming assignment targets, secure peer messaging channels, and exam mark indices.
                        </p>

                        <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2.5 font-sans">
                          <div className="flex items-center gap-2 text-[11px] text-slate-650 dark:text-slate-350">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>Assignment uploads & PDFs</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-650 dark:text-slate-350">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>Secure group study chat</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-650 dark:text-slate-350">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>Library catalogs & loan logs</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-650 dark:text-slate-350">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>AeroAdvisor AI Assistant</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase font-mono">Academic Division</p>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">B.Tech Degree Students</h4>
                        </div>
                        <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold rounded-lg">
                          Select Student
                        </span>
                      </div>
                    </div>

                    {/* 2. Lecturer Portal */}
                    <div 
                      onClick={() => {
                        setSelectedLoginRole('lecturer');
                        setAuthMode('login');
                        setLoginUserId('');
                        setLoginError('');
                      }}
                      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:border-amber-500/40 dark:hover:border-amber-500/30 transition-all duration-300 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full group-hover:scale-125 transition-transform duration-300" />
                      <div>
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-5 group-hover:rotate-6 transition-transform duration-350">
                          <GraduationCap size={22} />
                        </div>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider font-sans">Access Category II</span>
                        <h3 className="text-lg font-display font-semibold text-slate-900 dark:text-slate-100 mt-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          Faculty Portal
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                          For subject lecturers to authorize coursework documents, upload assignment specifications, mark daily classroom registers, grade submissions, and distribute student notes.
                        </p>

                        <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2.5 font-sans">
                          <div className="flex items-center gap-2 text-[11px] text-slate-650 dark:text-slate-350">
                            <span className="text-amber-500 font-bold">✓</span>
                            <span>Upload coursework PDF syllabus</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-650 dark:text-slate-350">
                            <span className="text-amber-500 font-bold">✓</span>
                            <span>Manage student assignment grades</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-650 dark:text-slate-350">
                            <span className="text-amber-500 font-bold">✓</span>
                            <span>Mark daily registers of attendance</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-650 dark:text-slate-350">
                            <span className="text-amber-500 font-bold">✓</span>
                            <span>Publish announcements & events</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase font-mono">Academic Division</p>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Department Faculty</h4>
                        </div>
                        <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-[10px] text-amber-700 dark:text-amber-400 font-extrabold rounded-lg">
                          Select Faculty
                        </span>
                      </div>
                    </div>

                    {/* 3. Admin Portal */}
                    <div 
                      onClick={() => {
                        setSelectedLoginRole('admin');
                        setAuthMode('login');
                        setLoginUserId('');
                        setLoginError('');
                      }}
                      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:border-rose-500/40 dark:hover:border-rose-500/30 transition-all duration-300 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full group-hover:scale-125 transition-transform duration-300" />
                      <div>
                        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mb-5 group-hover:rotate-6 transition-transform duration-350">
                          <School size={22} />
                        </div>
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider font-sans">Access Category III</span>
                        <h3 className="text-lg font-display font-semibold text-slate-900 dark:text-slate-100 mt-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                          Management & Admin
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                          For institutional admins to check database scaling indices, trigger semester snapshots, create progress report documents, and review structural analytics.
                        </p>

                        <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2.5 font-sans">
                          <div className="flex items-center gap-2 text-[11px] text-slate-655 dark:text-slate-350">
                            <span className="text-rose-500 font-bold">✓</span>
                            <span>Performance load simulator</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-655 dark:text-slate-350">
                            <span className="text-rose-500 font-bold">✓</span>
                            <span>Automated semester archiver</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-655 dark:text-slate-350">
                            <span className="text-rose-500 font-bold">✓</span>
                            <span>Generate parental progress cards</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-655 dark:text-slate-350">
                            <span className="text-rose-500 font-bold">✓</span>
                            <span>Configure library catalogs</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase font-mono">Academic Division</p>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">College Administration</h4>
                        </div>
                        <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/40 text-[10px] text-rose-700 dark:text-rose-400 font-extrabold rounded-lg">
                          Select Management
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Technical Specification Feature Board */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                        ⚡ High-Concurrency Optimization
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Firestore composite indexes are pre-partitioned. Students can fetch exam scores without lag during high peak congestion intervals.
                      </p>
                    </div>
                    <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-150 dark:border-slate-800 md:pt-0 pt-4 md:pl-6">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                        🔄 Cloud Synchronization
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Fully synchronized onSnapshot events guarantee that data stays in lockstep across multiple student/faculty smartphones and notebooks.
                      </p>
                    </div>
                    <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-150 dark:border-slate-800 md:pt-0 pt-4 md:pl-6">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                        📦 Historical Record Archives
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Automated archive modules preserve historical data at the end of every semester, compiling clean records in separate collections.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </main>

        {/* Institutional Academic compliance Footer */}
        <footer className="mt-16 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400 dark:text-slate-500 space-y-2">
          <div className="flex items-center justify-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
            <ShieldAlert size={14} className="text-[#C79F27]" />
            <span>Academic Personal Data Integrity Protocol</span>
          </div>
          <p className="max-w-2xl mx-auto leading-normal">
            To satisfy stringent data privacy regulations, this application strictly prohibits the persistence of unessential user telemetry, cookies, or location logs. No student biometric or geographic markers are persisted beyond standard roll number and catalog loan allocations.
          </p>
          <p className="font-mono mt-2">© 2026 KITS Guntur Academic Portal • JNTUK Affiliated • Academic & Library Registry</p>
        </footer>

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
