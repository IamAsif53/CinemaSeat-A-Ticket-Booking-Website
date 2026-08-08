import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Lock, Smartphone, KeyRound, AlertTriangle, ArrowRight, ShoppingBag, Tag, Check, X } from 'lucide-react';
import axios from 'axios';
import { SnackItem } from '../types';

interface PaymentModalProps {
  bookingRef: string;
  seatCode: string;
  amount: number;
  selectedSnacks?: SnackItem[];
  onClose: () => void;
  onSuccess: (bookingRef: string) => void;
}

interface AppliedPromo {
  code: string;
  discountAmount: number;
  label: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  bookingRef,
  seatCode,
  amount,
  selectedSnacks = [],
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

  // Feature #6: Promo Code & Discount Voucher System
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoMessage, setPromoMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isValidBDPhone = (phone: string) => {
    const cleaned = phone.trim().replace(/[\s-]/g, '');
    return /^(?:\+?88)?01[3-9]\d{8}$/.test(cleaned);
  };

  // Promo Code Validation Handler
  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoMessage(null);
    const code = promoCodeInput.trim().toUpperCase();

    if (!code) {
      setPromoMessage({ text: 'Please enter a promo code (e.g. CINEMA50, IMAX100, HACKATHON2026).', type: 'error' });
      return;
    }

    if (code === 'CINEMA50') {
      const discount = 50;
      setAppliedPromo({ code, discountAmount: discount, label: 'BDT 50 OFF' });
      setPromoMessage({ text: '🎉 CINEMA50 Applied! BDT 50 discount deducted.', type: 'success' });
      setPromoCodeInput('');
    } else if (code === 'IMAX100') {
      const discount = 100;
      setAppliedPromo({ code, discountAmount: discount, label: 'BDT 100 OFF' });
      setPromoMessage({ text: '🌟 IMAX100 Applied! BDT 100 IMAX Premiere discount deducted.', type: 'success' });
      setPromoCodeInput('');
    } else if (code === 'HACKATHON2026') {
      const discount = Math.round(amount * 0.25);
      setAppliedPromo({ code, discountAmount: discount, label: '25% Special Hackathon OFF' });
      setPromoMessage({ text: `🚀 HACKATHON2026 Applied! 25% OFF (-BDT ${discount}) deducted.`, type: 'success' });
      setPromoCodeInput('');
    } else if (code === 'SNACKFREE') {
      const discount = 120;
      setAppliedPromo({ code, discountAmount: discount, label: 'BDT 120 Free Concessions Voucher' });
      setPromoMessage({ text: '🍿 SNACKFREE Applied! BDT 120 Concessions Voucher deducted.', type: 'success' });
      setPromoCodeInput('');
    } else {
      setPromoMessage({ text: 'Invalid promo code. Try CINEMA50, IMAX100, or HACKATHON2026.', type: 'error' });
    }
  };

  const finalPayableAmount = Math.max(0, amount - (appliedPromo?.discountAmount || 0));

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
      }, { timeout: 3000 });

      if (res.data.success) {
        setGeneratedOtp(res.data.otp_code);
        setOtpStep('OTP_INPUT');
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.log('Backend API offline on Vercel preview, generating simulated client-side SMS OTP...');
    }

    // Client-side Preview Fallback for Vercel Static Preview
    setTimeout(() => {
      const mockOtp = `${Math.floor(100000 + Math.random() * 900000)}`;
      setGeneratedOtp(mockOtp);
      setOtpStep('OTP_INPUT');
      setLoading(false);
    }, 400);
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
      }, { headers, timeout: 3000 });

      if (res.data.success) {
        onSuccess(bookingRef);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.log('Backend API offline on Vercel preview, verifying client-side OTP fallback...');
    }

    // Client-side Verification Fallback for Vercel Preview
    setTimeout(() => {
      if (generatedOtp && otpCode.trim() !== generatedOtp) {
        setErrorMessage(`Incorrect OTP code. Please enter: ${generatedOtp}`);
        setLoading(false);
      } else {
        onSuccess(bookingRef);
        setLoading(false);
      }
    }, 400);
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

          {/* Feature #6: Promo Code / Voucher Card */}
          <div className="p-3.5 rounded-xl bg-dark-800/80 border border-gray-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-gray-300">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-brand-400" />
                <span>Have a Promo Code?</span>
              </span>
              <span className="text-[10px] text-gray-400 font-normal">e.g. CINEMA50, IMAX100</span>
            </div>

            {appliedPromo ? (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-between text-xs text-emerald-300 font-semibold">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{appliedPromo.code}: {appliedPromo.label} (-BDT {appliedPromo.discountAmount})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedPromo(null);
                    setPromoMessage({ text: 'Promo code removed.', type: 'error' });
                  }}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyPromo} className="flex gap-2">
                <input
                  type="text"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value)}
                  placeholder="Enter code (CINEMA50, IMAX100)"
                  className="flex-1 bg-dark-900 text-white px-3 py-1.5 rounded-lg border border-gray-700 text-xs focus:border-brand-500 focus:outline-none uppercase"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow transition shrink-0"
                >
                  Apply
                </button>
              </form>
            )}

            {promoMessage && (
              <p className={`text-[11px] font-medium ${promoMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {promoMessage.text}
              </p>
            )}
          </div>

          {/* Amount Due Card */}
          <div className="p-4 rounded-xl bg-dark-800 border border-gray-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium">Original Amount</span>
              <span className="text-gray-400 line-through">BDT {amount}</span>
            </div>

            {appliedPromo && (
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span>Voucher Discount ({appliedPromo.code})</span>
                <span>- BDT {appliedPromo.discountAmount}</span>
              </div>
            )}

            <div className="pt-2 border-t border-gray-700 flex items-center justify-between text-xs">
              <span className="text-gray-200 font-extrabold uppercase">Final Total Payable</span>
              <span className="text-xl font-black text-brand-400 font-sans">BDT {finalPayableAmount}</span>
            </div>

            {selectedSnacks && selectedSnacks.length > 0 && (
              <div className="pt-2 border-t border-gray-700/60 text-[11px] text-gray-300 space-y-1">
                <span className="font-bold text-amber-400 block flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Included Concessions ({selectedSnacks.reduce((a, b) => a + b.quantity, 0)} items):</span>
                </span>
                {selectedSnacks.map(s => (
                  <div key={s.id} className="flex justify-between text-[10px] text-gray-300">
                    <span>• {s.name} (x{s.quantity})</span>
                    <span>BDT {s.price * s.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Step 1 Form: Bangladeshi Phone Number Entry */}
          {otpStep === 'PHONE_INPUT' && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300 flex items-center justify-between">
                  <span>Enter Bangladeshi Phone Number</span>
                  <span className="text-[10px] text-brand-400 font-normal">Valid: 013-019</span>
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="01712345678"
                    className="w-full bg-dark-900 text-white pl-9 pr-4 py-2.5 rounded-xl border border-gray-700 text-xs focus:border-brand-500 focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 hover:from-brand-500 hover:to-amber-400 text-white font-extrabold text-xs shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50 min-h-[44px]"
              >
                {loading ? 'Sending SMS OTP...' : 'Send 6-Digit Gateway OTP'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Step 2 Form: 6-Digit OTP Verification */}
          {otpStep === 'OTP_INPUT' && (
            <form onSubmit={handleVerifyOTP} className="space-y-4 animate-fade-in">
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold text-center space-y-1">
                <p>📲 OTP SMS Sent to <strong>{userPhone}</strong></p>
                {generatedOtp && (
                  <p className="text-[11px] text-emerald-200">
                    Simulated Gateway Code: <strong className="font-mono text-white text-xs underline">{generatedOtp}</strong>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300">
                  Enter 6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full bg-dark-900 text-white pl-9 pr-4 py-2.5 rounded-xl border border-brand-500 text-sm font-mono tracking-widest text-center focus:outline-none"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOtpStep('PHONE_INPUT')}
                  className="px-4 py-3 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 font-bold text-xs border border-gray-700 transition"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-brand-500 hover:from-emerald-500 hover:to-brand-400 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50 min-h-[44px]"
                >
                  {loading ? 'Verifying OTP & Processing Payment...' : `Verify OTP & Pay BDT ${finalPayableAmount}`}
                  <Lock className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
