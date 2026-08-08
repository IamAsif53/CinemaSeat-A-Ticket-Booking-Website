import React, { useState } from 'react';
import { CreditCard, Phone, KeyRound, ShieldAlert, CheckCircle, Loader2, X } from 'lucide-react';
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
  const [phone, setPhone] = useState('01700000000');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'DETAILS' | 'OTP' | 'PROCESSING' | 'FAILED'>('DETAILS');
  const [selectedMockHeader, setSelectedMockHeader] = useState<string>('deterministic');
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Send OTP
  const handleSendOtp = async () => {
    setIsLoading(true);
    try {
      await axios.post('/api/otp/send', { phone, ref: bookingRef });
      setStep('OTP');
      setStatusMessage('OTP sent via Gateway! (Use 1234 for testing)');
    } catch (err: any) {
      console.warn('OTP Gateway warning:', err);
      // Fallback to OTP step anyway so user is never blocked
      setStep('OTP');
      setStatusMessage('OTP gateway delayed/failed (Proceeding with default code 1234)');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Payment Request with Control Header
  const handlePay = async () => {
    setIsLoading(true);
    setStep('PROCESSING');
    setStatusMessage('Submitting charge to Gateway...');

    const customHeaders: Record<string, string> = {};
    if (selectedMockHeader === 'deterministic') {
      customHeaders['X-Mock-Mode'] = 'deterministic';
    } else if (selectedMockHeader !== 'none') {
      customHeaders['X-Mock-Force'] = selectedMockHeader;
    }

    try {
      const res = await axios.post('/api/bookings/pay', {
        booking_ref: bookingRef,
        user_phone: phone
      }, { headers: customHeaders });

      setStatusMessage('Charge accepted (202 PENDING). Awaiting Gateway Webhook Callback...');

      // Poll for booking status update
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const bkRes = await axios.get(`/api/bookings/${bookingRef}`);
          const bk = bkRes.data;

          if (bk.status === 'CONFIRMED') {
            clearInterval(pollInterval);
            setIsLoading(false);
            onSuccess(bookingRef);
          } else if (bk.status === 'FAILED') {
            clearInterval(pollInterval);
            setIsLoading(false);
            setStep('FAILED');
            setStatusMessage('Gateway returned status: FAILED. Seat hold released.');
          } else if (attempts >= 15) {
            clearInterval(pollInterval);
            setIsLoading(false);
            setStep('FAILED');
            setStatusMessage('Gateway callback timeout after 15s. Retry or check gateway container.');
          }
        } catch (pollErr) {
          console.error('[Polling error]', pollErr);
        }
      }, 1000);

    } catch (err: any) {
      setIsLoading(false);
      setStep('FAILED');
      setStatusMessage(err?.response?.data?.error || err?.message || 'Payment initiation failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel max-w-md w-full rounded-2xl p-6 sm:p-8 border border-white/20 relative shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-brand-600/20 text-brand-400 border border-brand-500/30">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">CinemaSeat Checkout</h3>
            <p className="text-xs text-gray-400">Seat {seatCode} • Total: BDT {amount}</p>
          </div>
        </div>

        {/* Judge Controls Box */}
        <div className="mb-6 p-3 rounded-xl bg-dark-800/90 border border-amber-500/30 text-xs">
          <label className="block text-amber-400 font-semibold mb-1 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            Judge Control Header (Mock Behavior):
          </label>
          <select
            value={selectedMockHeader}
            onChange={(e) => setSelectedMockHeader(e.target.value)}
            className="w-full bg-dark-900 text-gray-200 border border-gray-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
          >
            <option value="deterministic">X-Mock-Mode: deterministic (2s delay, succeeds)</option>
            <option value="success">X-Mock-Force: success (Guaranteed clean success)</option>
            <option value="duplicate">X-Mock-Force: duplicate (Guaranteed duplicate callback)</option>
            <option value="fail">X-Mock-Force: fail (Guaranteed failure)</option>
            <option value="timeout">X-Mock-Force: timeout (Guaranteed timeout on /charge)</option>
            <option value="race">X-Mock-Force: race (Callback arrives before /charge returns)</option>
          </select>
        </div>

        {step === 'DETAILS' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-brand-400" />
                Mobile Phone Number (for OTP & Ticket)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-dark-800 text-white border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                placeholder="01700000000"
              />
            </div>

            <button
              onClick={handleSendOtp}
              disabled={isLoading || !phone}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 transition"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>Send OTP & Continue</span>
            </button>
          </div>
        )}

        {step === 'OTP' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-brand-400" />
                Enter 4-Digit OTP Code
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={4}
                className="w-full bg-dark-800 text-white border border-gray-700 rounded-xl px-4 py-2.5 text-center tracking-widest text-lg font-bold focus:border-brand-500 focus:outline-none"
                placeholder="1234"
              />
            </div>

            {statusMessage && (
              <p className="text-xs text-amber-400 font-medium">{statusMessage}</p>
            )}

            <button
              onClick={handlePay}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 transition"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              <span>Confirm & Pay BDT {amount}</span>
            </button>
          </div>
        )}

        {step === 'PROCESSING' && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-brand-400 animate-spin mx-auto" />
            <h4 className="text-lg font-bold text-white">Processing Payment...</h4>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">{statusMessage}</p>
          </div>
        )}

        {step === 'FAILED' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-rose-400">Payment Failed</h4>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">{statusMessage}</p>

            <button
              onClick={() => setStep('DETAILS')}
              className="px-6 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-white font-semibold text-xs border border-gray-700 transition"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
