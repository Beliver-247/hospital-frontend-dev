// Dashboard.jsx
import { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listAppointments } from '../api/appointments.api';
import { searchPatients } from '../api/patients';
import { useAuth } from '../api/useAuth';
import { ymdLocal, fmt } from '../api/time';

// QR scanner
import { Scanner } from '@yudiel/react-qr-scanner';

export default function Dashboard() {
  const { auth } = useAuth();                // { token, user: { id, role, ... } }
  const user = auth?.user;
  const isDoctor = user?.role === 'DOCTOR';
  const isStaff = user?.role === 'STAFF';
  const navigate = useNavigate();

  const today = ymdLocal(new Date());        // e.g., "2025-10-22"
  const [open, setOpen] = useState(false);   // overlay state

  // ====== QR: state & handlers ======
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState('');

  const parseQr = useCallback((text) => {
    if (!text) return null;
    try {
      if (text.startsWith('csse:patient:')) return text.split('csse:patient:')[1];

      if (text.includes('/patients/')) {
        const idx = text.lastIndexOf('/patients/');
        const idPart = text.substring(idx + '/patients/'.length).split(/[?#]/)[0];
        return decodeURIComponent(idPart);
      }

      if (/^[A-Za-z0-9\-_.]+$/.test(text)) return text; // raw ID
      return null;
    } catch {
      return null;
    }
  }, []);

const handleScanDetected = useCallback((detectedCodes) => {
    const first = Array.isArray(detectedCodes) ? detectedCodes[0] : detectedCodes;
    const text = first?.rawValue || first?.text || '';
    const id = parseQr(text);

    if (!id) {
      setScanError('Unrecognized QR content. Expecting patient ID or /patients/<id>.');
      return;
    }
    setScanOpen(false);
    navigate(`/patients/${encodeURIComponent(id)}`);
  }, [navigate, parseQr]);

  const handleScanError = useCallback((err) => {
    const msg = typeof err === 'string' ? err : (err?.message || 'Camera unavailable. Check permissions & HTTPS.');
    setScanError(msg);
  }, []);

  // ====== Total appointments (for "Tasks / Patients") ======
  const {
    data: apptCountData,
    isLoading: loadingApptCount,
    isError: errorApptCount,
  } = useQuery({
    queryKey: ['appointments', 'total-for-doctor', user?.id],
    queryFn: () => listAppointments({ page: 1, limit: 1 }),
    enabled: isDoctor && !!user?.id,
    staleTime: 60_000,
  });
  const totalForDoctor = apptCountData?.total ?? 0;

  // ====== Today's appointments (for the overlay card) ======
  const { data, isLoading, isError } = useQuery({
    queryKey: ['appointments', 'today', user?.id, today],
    queryFn: () =>
      listAppointments({
        doctorId: user.id,
        date: today,
        limit: 200,
      }),
    enabled: isDoctor && !!user?.id, // only fetch when logged in as doctor
    staleTime: 60_000,
  });
  const items = data?.items ?? [];

  const { countToday, nextTime } = useMemo(() => {
    const count = items.length;
    const now = Date.now();
    const next = items
      .map(a => new Date(a.start).getTime())
      .filter(t => t >= now)
      .sort((a, b) => a - b)[0];
    return {
      countToday: count,
      nextTime: next ? fmt(new Date(next).toISOString(), true) : null,
    };
  }, [items]);

  /* ----------------------- Recent Updates: data fetch ---------------------- */
  // Look back 7 days for new appointments; doctors see their own, staff see all
  const sinceISO = useMemo(
    () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    []
  );

  const {
    data: recentAppts,
    isLoading: loadingAppts,
    isError: errorAppts,
  } = useQuery({
    queryKey: ['recent-appointments', user?.id, sinceISO],
    queryFn: () =>
      listAppointments({
        from: sinceISO,
        limit: 50,
      }),
    enabled: !!user && (isDoctor || isStaff),
    staleTime: 60_000,
  });

  // Recent patients (API returns newest first; includes createdAt & updatedAt)
  const {
    data: recentPatients,
    isLoading: loadingPatients,
    isError: errorPatients,
  } = useQuery({
    queryKey: ['recent-patients'],
    queryFn: () => searchPatients('', 50), // { items: [...] }
    enabled: !!user && (isDoctor || isStaff),
    staleTime: 60_000,
  });

  // Build unified feed: appointments created + patient created/updated
  const feed = useMemo(() => {
    const apptItems = (recentAppts?.items ?? [])
      .map(a => ({
        _ts: new Date(a.createdAt || a.start || a.updatedAt || Date.now()).getTime(),
        kind: 'APPOINTMENT',
        id: a.id || a._id,
        title:
          a?.patient?.name
            ? `${a.patient.name}`
            : a.patientName || 'Patient',
        meta:
          a?.start && a?.end
            ? `${fmt(a.start, true)} — ${fmt(a.end, true)}`
            : a?.start
            ? `${fmt(a.start, true)}`
            : '',
        badge: a.status || 'Scheduled',
        to: `/appointments/${a.id || a._id}`,
        sub: 'New appointment created',
      }));

    const patientItems = (recentPatients?.items ?? []).map(p => {
      const created = new Date(p.createdAt).getTime();
      const updated = new Date(p.updatedAt || p.createdAt).getTime();
      const isUpdate = updated - created > 60 * 1000; // treat >1 min delta as "updated"
      const name = `${p.personal?.firstName ?? 'Patient'} ${p.personal?.lastName ?? ''}`.trim();
      return {
        _ts: updated,
        kind: 'PATIENT',
        id: p._id || p.patientId,
        title: name || p.patientId,
        meta: isUpdate
          ? `Profile updated • ${fmt(p.updatedAt, true)}`
          : `New profile • ${fmt(p.createdAt, true)}`,
        badge: isUpdate ? 'Updated' : 'New',
        to: `/patients/${encodeURIComponent(p.patientId || p._id)}`,
        sub: isUpdate ? 'Patient profile changes' : 'New patient created',
      };
    });

    return [...apptItems, ...patientItems]
      .filter(Boolean)
      .sort((a, b) => b._ts - a._ts)
      .slice(0, 8); // show top 8 recent items
  }, [recentAppts, recentPatients]);

  const loadingFeed = loadingAppts || loadingPatients;
  const erroredFeed = errorAppts || errorPatients;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Tasks / Patients */}
      <div className="bg-white rounded-2xl border p-6">
        <div className="text-sm text-gray-500">Tasks / Patients</div>
        <div className="mt-2 text-3xl font-bold">
          {isDoctor
            ? (loadingApptCount ? '…' : (errorApptCount ? '—' : totalForDoctor))
            : '—'}
        </div>
        <div className="text-sm text-gray-600 mt-1">
          {isDoctor
            ? (errorApptCount ? 'Couldn’t load total.' : 'Total appointments under you')
            : 'Sign in as a doctor to view'}
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <div className="text-sm text-gray-500">Reports Pending</div>
        <div className="mt-2 text-3xl font-bold">7</div>
        <div className="text-xs text-orange-600 mt-1">2 urgent reviews</div>
      </div>

      {/* Appointments Today (dynamic, clickable) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!isDoctor}
        className="text-left bg-white rounded-2xl border p-6 hover:shadow focus:outline-none disabled:opacity-60"
      >
        <div className="text-sm text-gray-500">Appointments Today</div>
        <div className="mt-2 text-3xl font-bold">
          {isDoctor ? (isLoading ? '…' : isError ? '—' : countToday) : '—'}
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {isDoctor
            ? isLoading
              ? 'Loading…'
              : nextTime
              ? `Next at ${nextTime.split(', ')[1]}`
              : countToday
              ? 'No upcoming today'
              : 'No appointments today'
            : 'Sign in as a doctor to view'}
        </div>
      </button>

      {/* Quick access with QR scan */}
      <div className="lg:col-span-1 bg-gradient-to-br from-emerald-600 to-teal-500 text-white rounded-2xl p-6">
        <div className="font-semibold">Quick Patient Access</div>
        <p className="text-sm mt-1 opacity-90">Scan a patient QR code to open their record.</p>
        <button
          onClick={() => {
            setScanError('');
            setScanOpen(true);
          }}
          className="mt-4 bg-white/10 hover:bg-white/20 border border-white/30 px-4 py-2 rounded-lg"
        >
          Scan QR Code
        </button>
        {scanError && <div className="mt-3 text-xs bg-white/10 px-3 py-2 rounded">{scanError}</div>}
      </div>

      {/* Recent Patient Updates */}
      <div className="lg:col-span-2 bg-white rounded-2xl border p-6">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Recent Patient Updates</div>
          <button className="text-sm text-emerald-700">View All</button>
        </div>

        <div className="mt-4 divide-y">
          {loadingFeed ? (
            <div className="py-6 text-sm text-gray-600">Loading recent activity…</div>
          ) : erroredFeed ? (
            <div className="py-6 text-sm text-rose-700">Couldn’t load recent activity.</div>
          ) : feed.length === 0 ? (
            <div className="py-6 text-sm text-gray-600">No recent updates.</div>
          ) : (
            feed.map(item => (
              <Link
                key={`${item.kind}-${item.id}-${item._ts}`}
                to={item.to}
                className="py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-gray-600">
                    {item.kind === 'APPOINTMENT'
                      ? `${item.sub} · ${item.meta}`
                      : `${item.meta}`}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-700 border rounded px-2 py-0.5">
                    {item.badge}
                  </span>
                  <span className="hidden sm:inline text-[11px] text-gray-500">
                    {fmt(new Date(item._ts).toISOString(), true)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <Link
        to="/patients/new"
        className="lg:col-span-3 bg-white rounded-2xl border p-6 flex items-center justify-between hover:shadow"
      >
        <div>
          <div className="font-semibold">Create New Patient</div>
        </div>
        <div className="px-4 py-2 rounded-lg bg-gray-900 text-white">Start</div>
      </Link>

      {/* Overlay list for today's appointments */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[640px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">Today’s Appointments ({today})</div>
              <button onClick={() => setOpen(false)} className="text-sm text-gray-600 hover:text-gray-900">
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto divide-y">
              {isLoading ? (
                <div className="p-6 text-sm text-gray-600">Loading…</div>
              ) : isError ? (
                <div className="p-6 text-sm text-rose-700">Couldn’t load appointments.</div>
              ) : items.length === 0 ? (
                <div className="p-6 text-sm text-gray-600">No appointments scheduled today.</div>
              ) : (
                items
                  .slice()
                  .sort((a, b) => new Date(a.start) - new Date(b.start))
                  .map(appt => {
                    const id = appt.id || appt._id;
                    const patientName = appt.patient?.name || appt.patientName || 'Patient';
                    return (
                      <Link
                        key={id}
                        to={`/appointments/${id}`}
                        className="p-4 flex items-center justify-between hover:bg-gray-50"
                        onClick={() => setOpen(false)}
                      >
                        <div>
                          <div className="font-medium">{patientName}</div>
                          <div className="text-xs text-gray-600">
                            {fmt(appt.start, true)} — {fmt(appt.end, true)} {appt.reason ? `· ${appt.reason}` : ''}
                          </div>
                        </div>
                        <div className="text-xs text-gray-700 border rounded px-2 py-0.5">
                          {appt.status || 'Scheduled'}
                        </div>
                      </Link>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {scanOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setScanOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[640px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">Scan Patient QR</div>
              <button onClick={() => setScanOpen(false)} className="text-sm text-gray-600 hover:text-gray-900">
                Close
              </button>
            </div>
            <div className="p-4">
              <div className="rounded-lg overflow-hidden border">
            <Scanner
            onScan={handleScanDetected}
            onError={handleScanError}
            constraints={{ facingMode: 'environment' }}
            scanDelay={150}
            components={{ finder: true, torch: true, zoom: true }}
            styles={{ container: { width: '100%', aspectRatio: '4/3' } }}
            />
              </div>
              <p className="text-xs text-gray-600 mt-3">
                Use HTTPS (or localhost) and allow camera access. Supported payloads:
                <code className="ml-1">csse:patient:&lt;id&gt;</code>, <code>/patients/&lt;id&gt;</code>, or a plain ID.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
