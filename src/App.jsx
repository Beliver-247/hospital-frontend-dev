import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import AppLayout from "./layout/AppLayout.jsx";
import Payments from './pages/Payments/Payments.jsx';
import CreditCardPayment from './pages/Payments/CreditCardPayment.jsx';
import InsurancePayment from './pages/Payments/InsurancePayment.jsx';
import PaymentSuccess from './pages/Payments/PaymentSuccess.jsx';
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PatientsNew from "./pages/PatientsNew.jsx";
import PatientsDetail from "./pages/PatientsDetail.jsx";
import PatientsEdit from "./pages/PatientsEdit.jsx";
import PatientsSearch from "./pages/PatientsSearch.jsx";
import ReportsLayout from "./layout/Reports/ReportsLayout.jsx";
import Reports from "./pages/Reports/Reports.jsx";
import ReportHistory from "./pages/Reports/ReportHistory.jsx";
import DoctorsNew from "./pages/DoctorsNew.jsx";
import DoctorsList from "./pages/DoctorsList.jsx";
import PatientDash from "./pages/Patient-Dash.jsx";
import Schedule from "./pages/Schedule.jsx";
import MyAppointments from "./pages/MyAppointments.jsx";
import AppointmentDetails from "./pages/AppointmentDetails.jsx";
import PatientLayout from "./layout/PatientLayout.jsx";
import AdDashboard from "./pages/Reports/AdDashboard.jsx";
import AppointmentsReports from "./pages/AppointmentsReports.jsx";
import ReportsLandingPage from "./pages/Reports/ReportsLandingPage.jsx";
import FindDoctors from "./pages/FindDoctors.jsx";

const qc = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route
              path="/"
              element={
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              }
            />
          </Route>

          {/* Protected (patient-only) */}
          <Route element={<ProtectedRoute roles={["PATIENT","DOCTOR","STAFF"]} />}>
            <Route element={<PatientLayout />}>
              <Route path="/PatientDash" element={<PatientDash />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/appointments" element={<MyAppointments />} />
              <Route
                path="/appointments/:id"
                element={<AppointmentDetails />}
              />
              <Route path="/find-doctors" element={<FindDoctors />} />

              {/* Patient Payments */}
              <Route path="/payments" element={<Payments />} />
              <Route path="/payments/credit-card" element={<CreditCardPayment />} />
              <Route path="/payments/insurance" element={<InsurancePayment />} />
              <Route path="/payments/success/:id" element={<PaymentSuccess />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={["STAFF"]} />}>
            <Route
              path="/doctors"
              element={
                <AppLayout>
                  <DoctorsList />
                </AppLayout>
              }
            />
            <Route
              path="/doctors/new"
              element={
                <AppLayout>
                  <DoctorsNew />
                </AppLayout>
              }
            />
          </Route>

          <Route element={<ProtectedRoute roles={["DOCTOR", "STAFF"]} />}>
            <Route
              path="/patients/new"
              element={
                <AppLayout>
                  <PatientsNew />
                </AppLayout>
              }
            />
            {/* Staff billing section (if still needed for staff workflow) */}
            <Route
              path="/patients"
              element={
                <AppLayout>
                  <PatientsSearch />
                </AppLayout>
              }
            />
            <Route
              path="/patients/:idOrPid"
              element={
                <AppLayout>
                  <PatientsDetail />
                </AppLayout>
              }
            />
            <Route
              path="/patients/:idOrPid/edit"
              element={
                <AppLayout>
                  <PatientsEdit />
                </AppLayout>
              }
            />
            {/* Removed /billing routes to avoid public access; now under /payments (patient-only) */}
            <Route
              path="/reports"
              element={
                <ReportsLayout>
                  <AdDashboard />
                </ReportsLayout>
              }
            />
            <Route
              path="/reports/gen/land"
              element={
                <ReportsLayout>
                  <ReportsLandingPage />
                </ReportsLayout>
              }
            />
            <Route
              path="/reports/generate"
              element={
                <ReportsLayout>
                  <Reports />
                </ReportsLayout>
              }
            />
            <Route
              path="/reports/history"
              element={
                <ReportsLayout>
                  <ReportHistory />
                </ReportsLayout>
              }
            />
                        <Route
              path="/reports/appointments"
              element={
                <ReportsLayout>
                  <AppointmentsReports />
                </ReportsLayout>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
