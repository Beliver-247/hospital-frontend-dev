import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPatient } from '../api/patients';
import { useEffect, useMemo, useState, useCallback } from 'react';

// NEW: QR + PDF
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

export default function PatientsDetail() {
  const { idOrPid } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['patient', idOrPid],
    queryFn: () => getPatient(idOrPid),
  });

  // NEW: state for QR image data URL
  const [qrPng, setQrPng] = useState('');
  const [qrErr, setQrErr] = useState('');

  // Build the payload we encode in the QR.
  // Option A (recommended): URL that your Dashboard scanner already understands.
  // Option B: 'csse:patient:<id>' — switch by uncommenting if you prefer namespacing.
  const payload = useMemo(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const pid = data?.patientId || data?._id || idOrPid;
    if (!pid) return '';
    return `${base}/patients/${encodeURIComponent(pid)}`;
    // return `csse:patient:${pid}`;
  }, [data, idOrPid]);

  // Generate PNG DataURL whenever payload changes
  useEffect(() => {
    if (!payload) return;
    setQrErr('');
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 512, // high-res for clean print
    })
      .then(setQrPng)
      .catch((e) => setQrErr(e?.message || 'Failed to render QR'));
  }, [payload]);

  const handleDownloadPng = useCallback(() => {
    if (!qrPng) return;
    const a = document.createElement('a');
    const pid = data?.patientId || data?._id || idOrPid || 'patient';
    a.href = qrPng;
    a.download = `patient-${pid}-qr.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [qrPng, data, idOrPid]);

  const handleDownloadPdf = useCallback(() => {
    if (!qrPng) return;
    const pid = data?.patientId || data?._id || idOrPid || 'patient';
    const doc = new jsPDF({ unit: 'pt', format: 'a4' }); // 595x842 pt
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Simple title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Patient QR Code', pageW / 2, 60, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Patient ID: ${pid}`, pageW / 2, 80, { align: 'center' });
    doc.text(payload, pageW / 2, 98, { align: 'center', maxWidth: pageW - 80 });

    // Place image centered
    const size = Math.min(pageW * 0.6, pageH * 0.6); // square size
    const x = (pageW - size) / 2;
    const y = (pageH - size) / 2;
    doc.addImage(qrPng, 'PNG', x, y, size, size);

    doc.save(`patient-${pid}-qr.pdf`);
  }, [qrPng, data, idOrPid, payload]);

  if (isLoading) return <Skeleton />;
  if (error) return <div className="text-red-600">Failed to load</div>;
  const p = data;

  return (
    <div className="grid gap-6">
      <header className="bg-white border rounded-2xl p-6 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold">{p.personal?.firstName} {p.personal?.lastName}</h1>
          <div className="text-sm text-gray-600">Patient ID: {p.patientId}</div>
          <div className="text-sm text-gray-600">DOB: {p.personal?.dob?.slice(0,10)} · Gender: {p.personal?.gender}</div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/patients/${p.patientId || p._id}/edit`} className="px-4 py-2 rounded-md bg-gray-900 text-white">
            Edit
          </Link>
          {/* NEW: quick PNG download button in header */}
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={!qrPng}
            className="px-3 py-2 rounded-md border text-gray-700 disabled:opacity-60"
            title="Download QR as PNG"
          >
            Download QR (PNG)
          </button>
        </div>
      </header>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="bg-white border rounded-2xl p-6">
          <h2 className="font-semibold">Latest Vital Signs</h2>
          
        </div>

        <div className="bg-white border rounded-2xl p-6 md:col-span-2">
          <h2 className="font-semibold">Quick Information</h2>
          <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
            <Info label="Email" value={p.contact?.email} />
            <Info label="Phone" value={p.contact?.phone} />
            <Info label="Address" value={p.contact?.address} className="sm:col-span-2" />
            <Info label="NIC" value={p.personal?.nic} />
            <Info label="Passport" value={p.personal?.passport} />
          </div>
        </div>
      </section>

      {/* NEW: QR Code section */}
      <section className="bg-white border rounded-2xl p-6">
        <h2 className="font-semibold">Patient QR Code</h2>
        {qrErr && <p className="text-sm text-red-600 mt-2">{qrErr}</p>}
        {!qrPng ? (
          <p className="text-sm text-gray-600 mt-2">Generating QR…</p>
        ) : (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={qrPng}
                alt="Patient QR"
                className="w-40 h-40 rounded-lg border bg-white"
              />
              <div className="text-sm text-gray-600 break-all">
                <div className="font-medium text-gray-800">Encoded:</div>
                <div className="mt-1">{payload}</div>
                <div className="mt-2 text-xs text-gray-500">
                  Scan from the Dashboard to open this patient’s details.
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadPng}
                className="px-4 py-2 rounded-md border text-gray-700"
              >
                Download PNG
              </button>
              <button
                onClick={handleDownloadPdf}
                className="px-4 py-2 rounded-md bg-gray-900 text-white"
              >
                Download PDF
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white border rounded-2xl p-6">
        <h2 className="font-semibold">Documents</h2>
        {!p.documents?.length && <p className="text-sm text-gray-600 mt-2">No documents uploaded.</p>}
        <ul className="mt-2 grid gap-2">
          {p.documents?.map((d,i)=>(
            <li key={i} className="flex items-center justify-between border rounded-md p-2 text-sm bg-gray-50">
              <span className="font-medium">{d.type}</span>
              <a href={d.url} target="_blank" rel="noreferrer" className="text-emerald-700 underline truncate">{d.url}</a>
              <span className="text-xs text-gray-500">{d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : ''}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Skeleton() {
  return <div className="h-48 bg-white border rounded-2xl animate-pulse" />;
}
function Info({ label, value, className='' }) {
  return (
    <div className={className}>
      <div className="text-gray-500">{label}</div>
      <div className="font-medium">{value || '—'}</div>
    </div>
  );
}
