// import { useState } from 'react';
// import { Link, Navigate, useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';

// export default function Login() {
//   const { login, user, loading } = useAuth();
//   const navigate = useNavigate();
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const [submitting, setSubmitting] = useState(false);

//   if (loading) {
//     return (
//       <div className="flex min-h-[40vh] items-center justify-center text-slate-500">Loading…</div>
//     );
//   }

//   if (user) {
//     return <Navigate to="/dashboard" replace />;
//   }

//   async function handleSubmit(e) {
//     e.preventDefault();
//     setError('');
//     setSubmitting(true);
//     try {
//       await login(email, password);
//       navigate('/dashboard', { replace: true });
//     } catch (err) {
//       setError(err.response?.data?.message || err.message || 'Login failed');
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   return (
//     <div className="mx-auto flex max-w-md flex-col gap-8 px-4 py-16">
//       <div>
//         <h1 className="text-2xl font-semibold tracking-tight text-white">Sign in</h1>
//         <p className="mt-1 text-sm text-slate-400">Attendance Management System</p>
//       </div>
//       <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
//         {error && (
//           <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
//             {error}
//           </div>
//         )}
//         <label className="block text-sm text-slate-300">
//           Email
//           <input
//             type="email"
//             required
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
//           />
//         </label>
//         <label className="block text-sm text-slate-300">
//           Password
//           <input
//             type="password"
//             required
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
//           />
//         </label>
//         <button
//           type="submit"
//           disabled={submitting}
//           className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
//         >
//           {submitting ? 'Signing in…' : 'Sign in'}
//         </button>
//         <div className="text-right">
//           <Link to="/forgot-password" className="text-sm text-indigo-400 hover:text-indigo-300">
//             Forgot password?
//           </Link>
//         </div>
//         <p className="text-center text-sm text-slate-400">
//           Member?{' '}
//           <Link to="/register" className="text-indigo-400 hover:text-indigo-300">
//             Register
//           </Link>
//           <br />
//           <span className="text-slate-500">Admin? </span>
//           <Link to="/register-admin" className="text-amber-400/90 hover:text-amber-300">
//             Create admin account
//           </Link>
//         </p>
//       </form>
//     </div>
//   );
// }


import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading…
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen w-full">

      {/* ── Left panel ── */}
      <div
        className="hidden w-5/12 flex-col items-center justify-center gap-6 px-12 py-16 md:flex"
        // style={{ background: 'linear-gradient(145deg, #0d2a5e 0%, #0a1f4e 45%, #071540 100%)' }}
        style={{ 
              background: 'linear-gradient(180deg, #020817 0%, #020b1f 40%, #000611 100%)'

        }}
        // style={{ backgroundColor: '#020c1b' }}

      >
        <div className="flex flex-col items-center gap-4">
          <svg width="80" height="80" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="36" cy="26" r="14" stroke="#4db8e8" strokeWidth="2" fill="none"/>
            <line x1="22" y1="26" x2="50" y2="26" stroke="#4db8e8" strokeWidth="1.5"/>
            <line x1="36" y1="12" x2="36" y2="40" stroke="#4db8e8" strokeWidth="1.5"/>
            <line x1="24.1" y1="16.1" x2="47.9" y2="35.9" stroke="#4db8e8" strokeWidth="1.5"/>
            <line x1="47.9" y1="16.1" x2="24.1" y2="35.9" stroke="#4db8e8" strokeWidth="1.5"/>
            <circle cx="36" cy="26" r="3" fill="#4db8e8"/>
            <circle cx="22" cy="26" r="2.5" stroke="#4db8e8" strokeWidth="1.5" fill="none"/>
            <circle cx="50" cy="26" r="2.5" stroke="#4db8e8" strokeWidth="1.5" fill="none"/>
            <circle cx="36" cy="12" r="2.5" stroke="#4db8e8" strokeWidth="1.5" fill="none"/>
            <path d="M22 54 Q36 62 50 54" stroke="#4db8e8" strokeWidth="1.5" fill="none"/>
            <path d="M18 46 Q36 38 54 46" stroke="#4db8e8" strokeWidth="1.5" fill="none"/>
            <circle cx="50" cy="52" r="7" fill="none" stroke="#4db8e8" strokeWidth="1.5"/>
            <polyline points="47,52 49.5,55 54,49" stroke="#4db8e8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>

          <p className="text-[34px] font-bold tracking-tight">
            <span className="text-sky-400">face</span>
            <span className="text-white">log</span>
          </p>
          <p className="text-[11px] tracking-[3px] text-sky-800 uppercase font-medium">
            Smart Face Attendance
          </p>
        </div>

        <div className="h-px w-11 bg-blue-900/60" />

        <p className="max-w-[260px] text-center text-[14px] leading-relaxed text-sky-300/80">
          AI-powered facial recognition for seamless, contactless attendance tracking in real time.
        </p>

        {/* <button className="flex items-center gap-1.5 rounded-full border border-blue-800 px-6 py-2.5 text-[13px] text-sky-400 hover:bg-blue-900/30 transition-colors">
          Learn More <span>↗</span>
        </button> */}
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 items-center justify-center bg-white px-8 py-16">
        <div className="w-full max-w-[420px]">
          <h1 className="text-[30px] font-bold text-gray-900">Welcome Back!</h1>
          <p className="mt-1.5 text-sm text-gray-400">Sign in to continue</p>

          <div className="mt-4 mb-7 flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:bg-white transition-colors"
            />

            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:bg-white transition-colors"
            />

            <div className="flex items-center justify-between py-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 accent-blue-600 rounded"
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm text-blue-500 hover:text-blue-400">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-[15px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400 leading-loose">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-500 hover:text-blue-400 font-medium">
              Register
            </Link>
            <br />
            Admin?{' '}
            <Link to="/register-admin" className="text-amber-500 hover:text-amber-400 font-medium">
              Create admin account
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}