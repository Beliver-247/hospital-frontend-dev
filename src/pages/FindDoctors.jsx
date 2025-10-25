// src/pages/FindDoctors.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listDoctors, DOCTOR_TYPES } from "../api/doctors";
import { getSlots } from "../api/appointments.api";
import DateInput from "../components/DateInput";
import { fmt, ymdLocal } from "../api/time";

function DoctorCard({ doctor, date }) {
  const [showSlots, setShowSlots] = useState(false);
  const slotMinutes = 30;
  const nav = useNavigate();

  // Only fetch slots when panel is open
  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["slots", doctor._id, date, slotMinutes],
    queryFn: () => getSlots(doctor._id, date, slotMinutes),
    enabled: showSlots && !!(doctor?._id && date),
  });

  const slots = data?.slots || [];

  // Click on a slot → go to Schedule step 2 with selection
  function goToScheduleWith(slot) {
    if (!slot?.available) return; // keep unavailable read-only
    nav("/schedule", {
      state: {
        gotoStep: 2,
        preset: {
          doctorId: doctor._id,
          doctorType: doctor.doctorType,
          date,
          slotStart: slot.start,
          slotEnd: slot.end,
        },
      },
    });
  }

  return (
    <div className="bg-white border rounded-2xl p-4 flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{doctor.name || "Doctor"}</div>
          {/* bigger specialization */}
          <div className="text-base text-gray-700">{doctor.doctorType}</div>
          <div className="text-xs text-gray-500 mt-1">Date: {date}</div>
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm"
            onClick={async () => {
              if (!showSlots) await refetch();
              setShowSlots((v) => !v);
            }}
          >
            {showSlots ? "Hide Slots" : "Slots"}
          </button>
        </div>
      </div>

      {/* Slots area */}
      {showSlots && (
        <div className="mt-3">
          <div className="text-xs text-gray-600 mb-2">Available Time Slots</div>
          {error && <div className="text-xs text-red-700">Failed to load slots.</div>}
          {isFetching && <div className="text-xs text-gray-500">Checking availability…</div>}
          {!isFetching && slots.length === 0 && (
            <div className="text-xs text-gray-500">No slots generated for this date.</div>
          )}
          {!isFetching && slots.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => {
                const common =
                  "text-xs px-3 py-1.5 rounded border select-none transition";
                const cls = s.available
                  ? "cursor-pointer hover:bg-blue-50"
                  : "bg-red-50 border-red-300 text-red-700 cursor-not-allowed";
                return (
                  <button
                    type="button"
                    key={s.start}
                    className={`${common} ${cls}`}
                    title={`${fmt(s.start)} – ${fmt(s.end)}${s.available ? "" : " (Unavailable)"}`}
                    onClick={() => goToScheduleWith(s)}
                    disabled={!s.available}
                  >
                    {fmt(s.start)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-auto flex gap-2 pt-3">
        <button
          className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white"
          onClick={() =>
            nav("/schedule", {
              state: { gotoStep: 2, preset: { doctorId: doctor._id, doctorType: doctor.doctorType, date } },
            })
          }
        >
          Make appointment
        </button>
      </div>
    </div>
  );
}

export default function FindDoctors() {
  const [doctorType, setDoctorType] = useState(""); // "" = All
  const [date, setDate] = useState(ymdLocal(new Date()));

  const { data, isLoading, error } = useQuery({
    queryKey: ["doctors", { doctorType }],
    queryFn: () => listDoctors({ doctorType: doctorType || undefined }),
  });

  const doctors = data || [];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Find Doctors</h1>
        <p className="text-sm text-gray-600 mt-1">Browse specialists and check availability</p>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm mb-1">Specialization</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={doctorType}
            onChange={(e) => setDoctorType(e.target.value)}
          >
            <option value="">All</option>
            {DOCTOR_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Date</label>
          <DateInput value={date} onChange={setDate} />
        </div>
      </div>

      {error && <div className="text-sm text-red-700">Failed to load doctors.</div>}
      {isLoading ? (
        <div className="text-sm text-gray-600">Loading doctors…</div>
      ) : doctors.length === 0 ? (
        <div className="text-sm text-gray-600">No doctors found.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((d) => (
            <DoctorCard key={d._id} doctor={d} date={date} />
          ))}
        </div>
      )}
    </div>
  );
}
