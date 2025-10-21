// Dashboard.jsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listAppointments } from '../api/appointments.api';
import { useAuth } from '../api/useAuth';
import { ymdLocal, fmt } from '../api/time';

export default function Dashboard() {
  const { auth } = useAuth();                // { token, user: { id, role, ... } }
  const user = auth?.user;
  const isDoctor = user?.role === 'DOCTOR';

  const today = ymdLocal(new Date());        // e.g., "2025-10-22"
  const [open, setOpen] = useState(false);   // overlay state

  // Fetch this doctor's appointments for today
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

  // derive summary for the card
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

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Example static cards (keep or replace with your own) */}
      <div className="bg-white rounded-2xl border p-6">
        <div className="text-sm text-gray-500">Tasks / Patients</div>
        <div className="mt-2 text-3xl font-bold">24</div>
        <div className="text-sm text-emerald-700 mt-1">+5 from yesterday</div>
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

      {/* Example wide sections */}
      <div className="lg:col-span-1 bg-gradient-to-br from-emerald-600 to-teal-500 text-white rounded-2xl p-6">
        <div className="font-semibold">Quick Patient Access</div>
        <p className="text-sm mt-1 opacity-90">Scan patient QR code for instant record access.</p>
        <button className="mt-4 bg-white/10 hover:bg-white/20 border border-white/30 px-4 py-2 rounded-lg">
          Scan QR Code
        </button>
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl border p-6">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Recent Patient Updates</div>
          <button className="text-sm text-emerald-700">View All</button>
        </div>
        <div className="mt-4 divide-y">
          {['Emily Rodriguez', 'Michael Chen', 'Sarah Williams', 'Frodo Thompson'].map((n, i) => (
            <div key={i} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{n}</div>
                <div className="text-xs text-gray-600">Lab results updated · 2 mins ago</div>
              </div>
              <div className="flex gap-2">
                <span className="text-xs text-gray-700 border rounded px-2 py-0.5">Normal</span>
                <button className="text-xs text-emerald-700">Review</button>
              </div>
            </div>
          ))}
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
    </div>
  );
}
