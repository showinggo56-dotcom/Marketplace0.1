import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Mail, Timer, ArrowRight, Store, RotateCcw } from 'lucide-react';

export default function VerifyOTPPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const { email, mode } = location.state || {};
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      navigate(mode === 'signin' ? '/login' : '/signup');
      return;
    }

    // Start countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email, mode, navigate]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (index === 5 && value) {
      const fullOtp = [...newOtp.slice(0, 5), value].join('');
      if (fullOtp.length === 6) {
        setTimeout(() => handleSubmit(fullOtp), 200);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (fullOtp?: string) => {
    const otpValue = fullOtp || otp.join('');

    if (otpValue.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      let response;
      if (mode === 'signin') {
        response = await authAPI.verifySignin({ email, otp: otpValue });
      } else {
        response = await authAPI.verifyOTP({ email, otp: otpValue, purpose: 'signup' });
      }

      login(response.data.token, response.data.refreshToken, response.data.user);
      toast.success(response.data.message || 'Verification successful!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setResendLoading(true);
    try {
      const response = await authAPI.resendOTP({ email, purpose: mode === 'signin' ? 'signin' : 'signup' });
      toast.success(response.data.message);
      setCountdown(60);
      setCanResend(false);

      // Restart countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              Market<span className="text-indigo-600">Place</span>
            </span>
          </Link>
        </div>

        {/* OTP Card */}
        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Verify your email</h2>
            <p className="text-sm text-gray-500">
              We've sent a 6-digit OTP to<br />
              <span className="font-medium text-gray-700">{email}</span>
            </p>
          </div>

          {/* OTP Inputs */}
          <div className="flex justify-center gap-2 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                disabled={loading}
              />
            ))}
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
            <Timer className="w-4 h-4" />
            {countdown > 0 ? (
              <span>OTP expires in <span className="font-medium text-gray-700">{formatTime(countdown)}</span></span>
            ) : (
              <span className="text-red-500">OTP has expired</span>
            )}
          </div>

          {/* Verify Button */}
          <Button
            onClick={() => handleSubmit()}
            disabled={loading || otp.join('').length !== 6}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11 mb-4"
          >
            {loading ? 'Verifying...' : (
              <>
                Verify & Continue <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          {/* Resend */}
          <button
            onClick={handleResend}
            disabled={!canResend || resendLoading}
            className={`w-full flex items-center justify-center gap-2 text-sm py-2 rounded-lg transition ${
              canResend
                ? 'text-indigo-600 hover:bg-indigo-50'
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            {resendLoading ? 'Sending...' : canResend ? 'Resend OTP' : `Resend in ${formatTime(countdown)}`}
          </button>
        </div>

        {/* Back */}
        <p className="text-center mt-6 text-sm text-gray-500">
          Wrong email?{' '}
          <Link to={mode === 'signin' ? '/login' : '/signup'} className="text-indigo-600 font-medium hover:underline">
            Go back
          </Link>
        </p>
      </div>
    </div>
  );
}
