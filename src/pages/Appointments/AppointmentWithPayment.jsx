// Example: How to redirect to payment after creating appointment
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAppointment } from '../../api/appointments.api';
import Toast from '../../components/Toast';

export default function AppointmentWithPaymentExample() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState(null);

  // Example appointment form submission
  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create appointment with your actual form data
      const appointmentData = {
        doctorId: '67141234abcd5678ef901234', // Get from form
        start: '2025-10-26T10:00:00Z',
        end: '2025-10-26T10:30:00Z',
        reason: 'Consultation'
      };

      const appointment = await createAppointment(appointmentData);
      setCreatedAppointment(appointment);
      setShowPaymentPrompt(true); // Show payment option dialog
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!createdAppointment) return;

    // Navigate to payment page with appointment info
    navigate('/payments/card', {
      state: {
        appointmentId: createdAppointment._id,
        doctorId: createdAppointment.doctor,
        total: 1800,
        breakdown: {
          consultationFee: 1000,
          labTests: 500,
          prescription: 250,
          processingFee: 50,
          other: 0
        }
      }
    });
  };

  const handlePayLater = () => {
    setShowPaymentPrompt(false);
    navigate('/appointments'); // Go to appointments list
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Appointment</h1>

      {error && <Toast kind="error" msg={error} />}

      {/* Payment Prompt Modal */}
      {showPaymentPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">✅ Appointment Created!</h2>
            <p className="text-gray-700 mb-6">
              Your appointment has been created successfully. Would you like to make a payment now to confirm it?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleProceedToPayment}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                💳 Pay Now
              </button>
              <button
                onClick={handlePayLater}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
              >
                Pay Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Form */}
      <form onSubmit={handleCreateAppointment} className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          {/* Add your form fields here */}
          <div>
            <label className="block text-sm font-medium mb-1">Doctor</label>
            <select className="w-full border rounded px-3 py-2">
              <option>Select Doctor...</option>
              {/* Add doctor options */}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date & Time</label>
            <input
              type="datetime-local"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              rows="3"
              placeholder="Reason for visit..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Appointment'}
          </button>
        </div>
      </form>
    </div>
  );
}
