// import { useState } from 'react';
// import { Link } from 'react-router-dom';
// import { api } from '../api/client';

// export default function ForgotPassword() {
//   const [email, setEmail] = useState('');
//   const [error, setError] = useState('');
//   const [message, setMessage] = useState('');
//   const [submitting, setSubmitting] = useState(false);

//   async function handleSubmit(e) {
//     e.preventDefault();
//     setError('');
//     setMessage('');
//     setSubmitting(true);
//     try {
//       const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
//       setMessage(data?.message || 'If this email exists, an OTP has been sent.');
//     } catch (err) {
//       const msg = err.response?.data?.message || err.message || 'Failed to send OTP';
//       setError(typeof msg === 'string' ? msg : 'Failed to send OTP');
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   return (
//     <div className="mx-auto max-w-md px-4 py-16">
//       <div className="mb-6">
//         <h1 className="text-2xl font-semibold text-white">Forgot password</h1>
//         <p className="mt-1 text-sm text-slate-400">Enter your email to receive an OTP.</p>
//       </div>
//       <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
//         {error && (
//           <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
//             {error}
//           </div>
//         )}
//         {message && (
//           <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
//             {message}
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
//         <button
//           type="submit"
//           disabled={submitting}
//           className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
//         >
//           {submitting ? 'Sending OTP…' : 'Send OTP'}
//         </button>
//         <p className="text-center text-sm text-slate-400">
//           Already have OTP?{' '}
//           <Link to="/reset-password" className="text-indigo-400 hover:text-indigo-300">
//             Reset password
//           </Link>
//         </p>
//       </form>
//     </div>
//   );
// }


// -------------------:))
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState('email'); // email | reset
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 🔹 Step 1: Send OTP
  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const { data } = await api.post('/auth/forgot-password', {
        email: email.trim(),
      });

      setMessage(data?.message || 'OTP sent successfully.');
      setStep('reset'); // 👉 move to OTP + password step
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Failed to send OTP';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // 🔹 Step 2: Verify OTP + Reset Password
  async function handleResetPassword(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const { data } = await api.post('/auth/reset-password', {
        email: email.trim(),
        otp: otp.trim(),
        newPassword: newPassword.trim(),
      });

      setMessage(data?.message || 'Password reset successful 🎉');

      // 🔁 Redirect after success (optional)
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Reset failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">
          Forgot password
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {step === 'email'
            ? 'Enter your email to receive an OTP.'
            : 'Enter OTP and set a new password.'}
        </p>
      </div>

      <form
        onSubmit={step === 'email' ? handleSendOtp : handleResetPassword}
        className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6"
      >
        {/* 🔴 Error */}
        {error && (
          <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* 🟢 Success */}
        {message && (
          <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            {message}
          </div>
        )}

        {/* 📧 EMAIL STEP */}
        {step === 'email' && (
          <>
            <label className="block text-sm text-slate-300">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? 'Sending OTP…' : 'Send OTP'}
            </button>
          </>
        )}

        {/* 🔐 RESET STEP (OTP + PASSWORD) */}
        {step === 'reset' && (
          <>
            <label className="block text-sm text-slate-300">
              OTP
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
              />
            </label>

            <label className="block text-sm text-slate-300">
              New Password
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
            >
              {submitting ? 'Resetting…' : 'Reset Password'}
            </button>
          </>
        )}

        {/* 🔗 Optional link */}
        <p className="text-center text-sm text-slate-400">
          Remember your password?{' '}
          <Link
            to="/login"
            className="text-indigo-400 hover:text-indigo-300"
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}