import { useState } from 'react';
import {
  Eye,
  EyeOff,
  ArrowLeft,
  User,
  Briefcase,
  Shield } from 'lucide-react';
import logoImg from '../assets/logoo.png';
import { useAuth } from '../context/AuthContext';

interface Props {
  navigate: (page: string) => void;
  onLoginSuccess: () => void;
  flow: 'patient' | 'doctor-admin';
}

export function LoginPage({ navigate, onLoginSuccess, flow }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const roles = flow === 'patient'
    ? [{ id: 'patient' as const, label: 'Patient', icon: User, desc: 'Access appointments & records' }]
    : [
        { id: 'doctor' as const, label: 'Doctor', icon: Briefcase, desc: 'Manage patients & schedule' },
        { id: 'admin' as const, label: 'Administrator', icon: Shield, desc: 'Full system access' },
      ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-8">
          <div className="mb-4">
            <button
              onClick={() => navigate('landing')}
              className="inline-flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft size={16} />
            </button>
          </div>

          {/* Logo */}
          <div className="text-center mb-7">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden">
              <img src={logoImg} alt="MedLink Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Welcome Back</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {flow === 'patient' ? 'Sign in to your patient account' : 'Doctor & Admin Portal'}
            </p>
          </div>

          {/* Role info (display only, role determined by backend) */}
          {roles.length > 1 && (
            <div className="mb-5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
                Portal
              </label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) =>
                  <div key={r.id} className="flex items-center gap-2.5 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-left">
                    <r.icon size={16} className="text-slate-400 dark:text-slate-500" />
                    <div>
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{r.label}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">{r.desc}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="********"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-200">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-2 mb-5">
            <button className="text-xs text-blue-600 hover:underline">Forgot password?</button>
          </div>

          <button onClick={handleLogin} disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
            ) : 'Sign In'}
          </button>

          <div className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
            {flow === 'patient' ? (
              <>
                Don't have an account?{' '}
                <button onClick={() => navigate('register')} className="text-blue-600 font-medium hover:underline">
                  Register
                </button>
              </>
            ) : (
              <button onClick={() => navigate('landing')} className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mx-auto">
                <ArrowLeft size={14} /> Back to Home
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">
          (c) 2024 Reganion Children Clinic - MedLink
        </p>
      </div>
    </div>
  );
}

