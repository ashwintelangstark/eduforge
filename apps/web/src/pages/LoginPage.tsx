import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, UserPlus, LogIn, AlertCircle, User, BookOpen, Shield } from 'lucide-react';
import { supabase } from '../services/supabaseDirect.js';
import { api } from '../services/api.js';
import { fetchApi } from '../services/api/client.js';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role] = useState<'faculty'>('faculty');
  const [assignedSubject, setAssignedSubject] = useState<string>('Biology');
  const [dbSubjects, setDbSubjects] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load only the admin-created subjects from the database for signup assignment
  React.useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const subs = await api.getSubjects();
        if (subs && Array.isArray(subs) && subs.length > 0) {
          setDbSubjects(subs);
          setAssignedSubject(subs[0].name);
        }
      } catch (e) {
        console.error('Failed loading subjects on login page:', e);
      }
    };
    fetchSubjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (isSignUp && !name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign Up directly to MySQL Database
        const selectedRole = 'faculty';
        const selectedSubject = assignedSubject || (dbSubjects[0]?.name) || 'Biology';
        const profilePayload = {
          email: cleanEmail,
          password: cleanPassword,
          name: name.trim(),
          role: selectedRole,
          assignedSubject: selectedSubject
        };

        const signupRes = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profilePayload)
        });
        const signupData = await signupRes.json();

        if (!signupRes.ok || !signupData.success) {
          setErrorMessage(signupData.error || 'Registration failed. Please try again.');
          setIsLoading(false);
          return;
        }

        const userProfile = signupData.data || {
          email: cleanEmail,
          name: name.trim(),
          role: selectedRole,
          assigned_subject: selectedSubject
        };

        localStorage.setItem('eduforge_auth', 'true');
        localStorage.setItem('eduforge_user', JSON.stringify(userProfile));
        setSuccessMessage('Account registered successfully in MySQL database!');
        onLoginSuccess();
      } else {
        // Sign In directly through MySQL Backend Auth
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
        });
        const loginData = await loginRes.json();

        if (!loginRes.ok || !loginData.success) {
          setErrorMessage(loginData.error || 'Invalid email or password. Please check your credentials.');
          setIsLoading(false);
          return;
        }

        const userProfile = loginData.data || loginData.user || {
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          role: cleanEmail.startsWith('admin') ? 'admin' : 'faculty',
          assigned_subject: cleanEmail.startsWith('admin') ? 'All' : 'Biology'
        };

        localStorage.setItem('eduforge_auth', 'true');
        localStorage.setItem('eduforge_user', JSON.stringify(userProfile));
        if (loginData.token) {
          localStorage.setItem('eduforge_token', loginData.token);
        }
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('MySQL Auth Error:', err);
      setErrorMessage(err?.message || 'Authentication error. Please check server connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex items-center justify-center font-sans bg-slate-950">
      {/* Fullscreen Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 filter brightness-90 contrast-105 scale-[1.01]"
      >
        <source src="/eduforge_login.mp4" type="video/mp4" />
      </video>

      {/* Dark Blur Overlay */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs z-10" />

      {/* Centered Auth Card */}
      <div className="relative z-20 max-w-md w-full mx-4 p-8 rounded-3xl bg-white/95 backdrop-blur-md shadow-2xl border border-white/40 space-y-5 animate-in fade-in zoom-in-95 duration-300 max-h-[95vh] overflow-y-auto">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white shadow-lg shadow-teal-700/30 mb-1">
            <span className="font-black text-xl tracking-tighter">E</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-sans">
            EduForge
          </h1>
          <p className="text-xs text-slate-600 font-medium">
            Desktop Question Paper Authoring & Exam Suite
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="flex bg-slate-100 p-1 rounded-xl font-bold text-xs">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              !isSignUp ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isSignUp ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Register / Sign Up
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl animate-in fade-in">
            {successMessage}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-semibold text-slate-800">
          {/* Full Name for Signup */}
          {isSignUp && (
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1 tracking-wide">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Dr. John Smith"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600 font-medium"
                />
              </div>
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1 tracking-wide">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="faculty@eduforge.com"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600 font-medium"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1 tracking-wide">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Signup Specific Role & Subject Selectors */}
          {isSignUp && (
            <>
              {/* Account Role Block (Faculty Only) */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1 tracking-wide">
                  Account Role
                </label>
                <div className="w-full py-2.5 px-3 rounded-xl border border-teal-600 bg-teal-50/80 text-teal-900 text-xs font-extrabold flex items-center justify-center gap-2 shadow-2xs">
                  <BookOpen className="w-4 h-4 text-teal-700" />
                  <span>Faculty</span>
                </div>
              </div>

              {/* Assigned Subject Selection (Only Subjects Created by Admin in Subjects Section) */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1 tracking-wide">
                  Assigned Subject Scope
                </label>
                <select
                  value={assignedSubject}
                  onChange={e => setAssignedSubject(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600 font-bold cursor-pointer text-xs"
                >
                  {dbSubjects.length === 0 ? (
                    <>
                      <option value="Biology">🌿 Biology</option>
                      <option value="Physics">⚡ Physics</option>
                      <option value="Chemistry">🧪 Chemistry</option>
                      <option value="Mathematics">📐 Mathematics</option>
                    </>
                  ) : (
                    dbSubjects.map(s => (
                      <option key={s.id || s.code || s.name} value={s.name}>
                        {s.name} ({s.code || s.name.substring(0, 3)})
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  * You will be scoped to access questions, chapters, and assets for this subject only.
                </p>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Secured Authentication
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <span>Connecting...</span>
            ) : (
              <>
                <span>{isSignUp ? 'Register Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="text-center pt-2 border-t border-slate-200/60">
          <p className="text-[11px] text-slate-400 font-medium">
            EduForge Suite v1.0 · Multi-Subject Role Scoped
          </p>
        </div>
      </div>
    </div>
  );
};
