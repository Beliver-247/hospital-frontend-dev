import React from 'react';
import { useLocation, useParams, Link, useNavigate } from 'react-router-dom';
import { API } from '../../api/api';

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <div className="text-gray-600">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

export default function PaymentSuccess() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const payment = state?.payment || {};

  const breakdown = payment?.breakdown || {};
  const total = payment?.totalAmount;
  const currency = payment?.currency || 'LKR';
  const last4 = payment?.card?.last4 || '****';

  async function downloadPdf() {
    try {
      const { data } = await API.get(`/payments/${id}/receipt`, { responseType: 'blob' });
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to download receipt');
    }
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Payment Successful</h1>
          <span className="text-emerald-600 font-medium">#{id?.slice(-6)}</span>
        </div>

        <p className="text-gray-600 mt-2">Your payment has been captured. A receipt is available below.</p>

        <div className="mt-6 border rounded p-4" id="receipt">
          <div className="text-center mb-4">
            <div className="text-lg font-semibold">Hospital Receipt</div>
            <div className="text-xs text-gray-500">Payment ID: {payment?._id}</div>
          </div>

          <Row label="Method" value="Card" />
          <Row label="Card" value={`**** **** **** ${last4}`} />
          <Row label="Currency" value={currency} />
          <Row label="Status" value={payment?.status} />
          <Row label="Doctor" value={payment?.doctorName || payment?.doctorId || '-'} />
          <Row label="Patient" value={payment?.patientName || payment?.customer?.patientId || '-'} />

          <div className="mt-4 border-t pt-3">
            <div className="font-medium mb-1">Breakdown</div>
            {Object.entries(breakdown).map(([k, v]) => (
              <Row key={k} label={k} value={`${currency} ${Number(v || 0).toFixed(2)}`} />
            ))}
            <div className="flex justify-between font-semibold mt-2">
              <div>Total</div>
              <div className="text-emerald-600">{currency} {Number(total || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={downloadPdf} className="px-4 py-2 rounded bg-emerald-600 text-white">Download PDF</button>
          <Link to="/payments" className="px-4 py-2 rounded border">Back to Payments</Link>
          <button onClick={() => navigate('/PatientDash')} className="ml-auto px-4 py-2 rounded bg-blue-600 text-white">Go to Dashboard</button>
        </div>
      </div>
    </div>
  );
}
