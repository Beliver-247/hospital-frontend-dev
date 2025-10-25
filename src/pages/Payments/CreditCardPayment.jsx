import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Toast from '../../components/Toast';
import { initiateCardPayment, confirmCardPayment } from '../../api/payments.api';

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      {children}
    </div>
  );
}

function SmallIconButton({ children }) {
  return (
    <button className="p-2 border rounded bg-white mr-2 shadow-sm flex items-center justify-center w-12 h-10">{children}</button>
  );
}

function LockIcon() {
  return (
    <svg className="w-5 h-5 inline-block align-middle text-emerald-700 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PayPalIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 7h6l-1 6h-6z" fill="#003087" />
      <path d="M13 7h4l-1 6h-4z" fill="#009cde" />
    </svg>
  );
}

function ApplePayIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.6 7.4c0 1.1-.4 2-1.1 2.7-.7.7-1.7 1.1-2.8 1.1-.1-1.2.4-2.2 1.1-2.9.7-.6 1.6-1 2.8-0.9z" fill="#111" />
      <path d="M12.5 3c.3 0 .7 0 1 .1.4.1.8.2 1.2.4.4.2.7.5 1 1 .2.5.3 1 .3 1.5 0 .6-.1 1.1-.3 1.6-.2.4-.5.8-.9 1.2-.4.3-.9.6-1.4.9-.5.3-1 .5-1.6.7-.6.1-1.1.2-1.6.2-.2 0-.4 0-.5-.1-.6-.1-1.3-.4-1.9-.7-.6-.4-1.2-.8-1.6-1.3-.5-.5-.9-1.1-1.2-1.8-.3-.7-.4-1.4-.4-2.2 0-1 .3-1.9.9-2.7.6-.8 1.5-1.4 2.6-1.6.4-.1.8-.1 1.2-.1.6 0 1.1.1 1.6.2.6.1 1.1.3 1.6.4z" fill="#111" />
    </svg>
  );
}

function GPayIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 7v10" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 7l4 3" stroke="#0F9D58" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 17l4-3" stroke="#F4B400" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="12" r="3" fill="#DB4437" />
    </svg>
  );
}

function CardBrandIcons() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-4 bg-slate-100 rounded-sm border" />
      <div className="w-6 h-4 bg-slate-100 rounded-sm border" />
      <div className="w-6 h-4 bg-slate-100 rounded-sm border" />
    </div>
  );
}

export default function CreditCardPayment() {
  const location = useLocation();
  const navigate = useNavigate();
  // Optional incoming data from navigation state (e.g., from appointment creation)
  const incomingTotal = location.state?.total;
  const incomingAppointmentId = location.state?.appointmentId;
  const incomingDoctorId = location.state?.doctorId;
  const incomingBreakdown = location.state?.breakdown;

  // Patient/Doctor will be derived server-side. Keep fields hidden for now.
  const [patientId] = useState('');
  const [doctorId] = useState(incomingDoctorId || '');
  const [appointmentId] = useState(incomingAppointmentId || '');
  const [currency, setCurrency] = useState('LKR');
  const [notes, setNotes] = useState('');

  const [breakdown, setBreakdown] = useState(incomingBreakdown || {
    consultationFee: 1000,
    labTests: 500,
    prescription: 250,
    processingFee: 50,
    other: 0,
  });

  const total = useMemo(() => {
    if (typeof incomingTotal === 'number') return incomingTotal;
    return Object.values(breakdown).reduce((a, b) => a + Number(b || 0), 0);
  }, [incomingTotal, breakdown]);

  const [card, setCard] = useState({
    number: '4242424242424242',
    expMonth: 12,
    expYear: new Date().getFullYear() + 2,
    cvc: '123',
    name: 'Test Card',
    brand: 'VISA',
  });

  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // After initiate
  const [paymentId, setPaymentId] = useState('');
  const [otpRefId, setOtpRefId] = useState('');
  const [otpSentTo, setOtpSentTo] = useState('');
  const [devOtpCode, setDevOtpCode] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [remaining, setRemaining] = useState(0); // seconds

  function onChangeBreakdown(field, value) {
    setBreakdown((b) => ({ ...b, [field]: Number(value || 0) }));
  }

  async function onInitiate() {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const payload = { 
        breakdown, 
        currency, 
        card, 
        patientId: patientId || undefined, 
        doctorId: doctorId || undefined, 
        appointmentId: appointmentId || undefined, // Include appointmentId
        notes 
      };
      const out = await initiateCardPayment(payload);
      setPaymentId(out.paymentId);
      setOtpRefId(out.otpRefId);
      setOtpSentTo(out.otpSentTo || '');
  if (out.devOtpCode) setDevOtpCode(out.devOtpCode);
  if (out.expiresAt) setExpiresAt(out.expiresAt);
      setSuccess('OTP sent. Please check email to continue.');
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Failed to initiate payment';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onConfirm() {
    if (!paymentId || !otpRefId || !otpCode) {
      setError('Payment or OTP details missing.');
      return;
    }
    if (remaining <= 0) {
      setError('OTP expired. Please restart payment to receive a new OTP.');
      return;
    }
    setError('');
    setSuccess('');
    setConfirming(true);
    try {
      const payment = await confirmCardPayment(paymentId, { otpRefId, otpCode });
      setSuccess('Payment captured successfully.');
      // Navigate to success page with payment details for receipt
      navigate(`/payments/success/${payment._id}`, { state: { payment } });
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Failed to confirm payment';
      setError(msg);
    } finally {
      setConfirming(false);
    }
  }

  // Countdown timer effect
  useEffect(() => {
    if (!expiresAt) return;
    const end = new Date(expiresAt).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setRemaining(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <div className="p-6">
      {error ? <Toast kind="error" msg={error} /> : null}
      {success ? <Toast kind="success" msg={success} /> : null}
      
      {/* Show appointment info banner if paying for appointment */}
      {appointmentId && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💳 <strong>Appointment Payment</strong> - You are making a payment to confirm your appointment.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold">Credit Card Payment</h2>
          <p className="text-sm text-gray-500">Process secure payment transactions</p>

          <div className="mt-6">
            {/* Patient/Doctor derived on server */}

            <Field label="Card Number">
              <div className="flex items-center gap-2">
                <input className="flex-1 border rounded px-3 py-2" placeholder="1234 5678 9012 3456" value={card.number} onChange={(e) => setCard((c) => ({ ...c, number: e.target.value.replace(/\s/g, '') }))} />
                <div className="flex items-center">
                  <CardBrandIcons />
                </div>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Expiry Date">
                <input className="w-full border rounded px-3 py-2" placeholder="MM/YY" value={`${card.expMonth}`.padStart(2, '0') + '/' + String(card.expYear).slice(-2)} onChange={(e) => {
                  const v = e.target.value;
                  const [mm, yy] = v.split('/');
                  const expMonth = Math.max(1, Math.min(12, Number(mm || 0)));
                  const baseYear = new Date().getFullYear();
                  const yyNum = Number(yy || 0);
                  const expYear = yy && yy.length <= 2 ? Math.floor(baseYear / 100) * 100 + yyNum : Number(yy || baseYear + 2);
                  setCard((c) => ({ ...c, expMonth, expYear }));
                }} />
              </Field>
              <Field label="CVV">
                <input className="w-full border rounded px-3 py-2" placeholder="123" value={card.cvc} onChange={(e) => setCard((c) => ({ ...c, cvc: e.target.value }))} />
              </Field>
            </div>

            <Field label="Cardholder Name">
              <input className="w-full border rounded px-3 py-2" placeholder="John Doe" value={card.name} onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))} />
            </Field>

            {/* Currency and Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Currency">
                <input className="w-full border rounded px-3 py-2" value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </Field>
              <Field label="Notes">
                <input className="w-full border rounded px-3 py-2" placeholder="OPD visit" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>

            <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded flex items-center">
              <LockIcon />
              <div>Your payment information is encrypted and secure. We never store your card details.</div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Recent Transactions</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <div className="text-sm font-medium">Emergency Visit</div>
                    <div className="text-xs text-gray-500">Dec 15, 2023 • **** 4532</div>
                  </div>
                  <div className="font-medium">$320.00</div>
                </div>
                <div className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <div className="text-sm font-medium">Routine Checkup</div>
                    <div className="text-xs text-gray-500">Dec 10, 2023 • **** 4532</div>
                  </div>
                  <div className="font-medium">$180.00</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium">Payment Summary</h3>
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600"><div>Consultation Fee</div><div>{breakdown.consultationFee}</div></div>
            <div className="flex justify-between text-sm text-gray-600 mt-1"><div>Lab Tests</div><div>{breakdown.labTests}</div></div>
            <div className="flex justify-between text-sm text-gray-600 mt-1"><div>Prescription</div><div>{breakdown.prescription}</div></div>
            <div className="flex justify-between text-sm text-gray-600 mt-1"><div>Processing Fee</div><div>{breakdown.processingFee}</div></div>
            <div className="flex justify-between text-sm text-gray-600 mt-1"><div>Other</div><div>{breakdown.other}</div></div>

            <div className="mt-4 border-t pt-3 font-semibold flex justify-between"> 
              <div>Total Amount</div>
              <div className="text-emerald-600">{currency} {Number(total).toFixed(2)}</div>
            </div>

            {/* OTP Confirmation Panel */}
            {paymentId ? (
              <div className="mt-4 p-3 border rounded bg-slate-50">
                <div className="text-sm">OTP sent to: <b>{otpSentTo || 'your email'}</b></div>
                {expiresAt ? (
                  <div className="text-xs text-amber-700 mt-1">OTP expires in: <b>{String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</b></div>
                ) : null}
                {devOtpCode ? (
                  <div className="text-xs text-gray-500 mt-1">Dev OTP: {devOtpCode}</div>
                ) : null}
                <div className="mt-2 flex items-center gap-2">
                  <input className="flex-1 border rounded px-3 py-2" placeholder="Enter 6-digit OTP" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} disabled={remaining <= 0} />
                  <button className="bg-emerald-600 text-white px-4 py-2 rounded disabled:opacity-50" onClick={onConfirm} disabled={confirming || remaining <= 0}>
                    {confirming ? 'Confirming…' : 'Confirm Payment'}
                  </button>
                </div>
                {remaining <= 0 ? (
                  <div className="text-xs text-red-600 mt-2">OTP expired. Please restart payment to get a new OTP.</div>
                ) : null}
              </div>
            ) : (
              <button className="mt-4 w-full bg-emerald-600 text-white px-4 py-2 rounded" onClick={onInitiate} disabled={loading}>
                {loading ? 'Processing…' : 'Process Payment'}
              </button>
            )}

            <div className="mt-3 text-xs text-gray-500">Or pay with</div>
            <div className="mt-2 flex items-center">
              <SmallIconButton><PayPalIcon /></SmallIconButton>
              <SmallIconButton><ApplePayIcon /></SmallIconButton>
              <SmallIconButton><GPayIcon /></SmallIconButton>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
