import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Lock, Smartphone, KeyRound, AlertTriangle, ArrowRight } from 'lucide-react';
import axios from 'axios';

interface PaymentModalProps {
  bookingRef: string;
  seatCode: string;
  amount: number;
  onClose: () => void;
  onSuccess: (bookingRef: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  bookingRef,
  seatCode,
  amount,
  onClose,
  onSuccess
}) => {
  const [userPhone, setUserPhone] = useState('01712345678');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'PHONE_INPUT' | 'OTP_INPUT'>('PHONE_INPUT');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Judge misbehavior header selector
  const [selectedMockHeader, setSelectedMockHeader] = useState<string>('NORMAL');

  const isValidBDPhone = (phone: string) => {
    const cleaned = phone.trim().replace(/[\s-]/g, '');
    return /^(?:\+?88)?01[3-9]\d{8}$/.test(cleaned);
  };

  // Step 1: Send OTP to Bangladeshi Phone Number
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isValidBDPhone(userPhone)) {
      setErrorMessage('Invalid Bangladeshi phone number. Must be an 11-digit mobile number starting with 013-019 (e.g. 01712345678).');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/otp/send', {
        booking_ref: bookingRef,
        user_phone: userPhone
      });

      if (res.data.success) {
        setGeneratedOtp(res.data.otp_code);
        setOtpStep('OTP_INPUT');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to send OTP to the provided number.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP & Confirm Payment
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the valid 6-digit OTP code sent to your phone.');
      return;
    }

    setLoading(true);

    try {
      const headers: Record<string, string> = {};
      if (selectedMockHeader !== 'NORMAL') {
        headers['X-Mock-Behavior'] = selectedMockHeader;
      }

      const res = await axios.post('/api/otp/verify', {
        booking_ref: bookingRef,
        user_phone: userPhone,
        otp_code: otpCode.trim()
      }, { headers });

      if (res.data.success) {
        onSuccess(bookingRef);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Incorrect OTP code. Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-dark-800 to-dark-900 p-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base font-sans">Payment Checkout</h3>
              <p className="text-xs text-gray-400">Seat <strong>{seatCode}</strong> • Ref: {bookingRef}</p>
            </div>
          </div>

          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Judge Control Box */}
          <div className="p-3.5 rounded-xl bg-dark-800/90 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Judge Control: Mock Gateway Misbehaviors</span>
            </div>
            <select
              value={selectedMockHeader}
              onChange={(e) => setSelectedMockHeader(e.target.value)}
              className="w-full bg-dark-900 text-gray-200 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
            >
              <option value="NORMAL">Normal Processing (HTTP 200 Fast)</option>
              <option value="DELAY">Gateway Webhook Delay (2-15s)</option>
              <option value="FAIL">Payment Failure (10% Fail)</option>
              <option value="DUPLICATE">Duplicate Webhook Callback</option>
              <option value="TIMEOUT">Gateway 500 / Timeout</option>
            </select>
          </div>

          {/* Amount Due Card */}
          <div className="p-4 rounded-xl bg-dark-800 border border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Total Payable Amount</span>
            <span className="text-lg font-black text-brand-400 font-sans">BDT {amount}</span>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Phone Number Input */}
          {otpStep === 'PHONE_INPUT' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300">
                  Bangladeshi Mobile Number (bKash / Nagad)
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="e.g. 01712345678"
                    className="w-full bg-dark-800 text-white pl-10 pr-4 py-2.5 rounded-xl border border-gray-700 text-xs font-semibold focus:border-brand-500 focus:outline-none"
                    required
                  />
                </div>
                <p className="text-[11px] text-gray-400">
                  Must be a valid 11-digit BD mobile number starting with 013–019.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-xs shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50 min-h-[44px]"
              >
                <span>{loading ? 'Sending OTP...' : 'Send Gateway OTP Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* STEP 2: OTP Code Verification */
            <form onSubmit={handleVerifyOTP} className="space-y-4 animate-fade-in">
              {/* Test OTP Code Display Banner */}
              {generatedOtp && (
                <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-semibold space-y-1">
                  <div className="flex items-center justify-between">
                    <span>📱 OTP Sent to <strong>{userPhone}</strong></span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 rounded font-mono font-bold text-white text-sm">
                      {generatedOtp}
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-400/80">
                    (Use the 6-digit code above to verify & complete booking)
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300">
                  Enter 6-Digit Gateway OTP Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit code (e.g. 482910)"
                    className="w-full bg-dark-800 text-white pl-10 pr-4 py-2.5 rounded-xl border border-gray-700 text-sm font-mono font-bold tracking-widest focus:border-brand-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setOtpStep('PHONE_INPUT'); setErrorMessage(null); }}
                  className="px-4 py-3 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 font-bold text-xs border border-gray-700 transition"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50 min-h-[44px]"
                >
                  <Lock className="w-4 h-4 text-emerald-200" />
                  <span>{loading ? 'Verifying OTP...' : 'Verify OTP & Confirm Ticket'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
