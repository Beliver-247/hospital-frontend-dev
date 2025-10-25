import { API } from './api';

// Initiate card payment: sends OTP to patient email
export async function initiateCardPayment(payload) {
  // payload: { breakdown, currency, card, patientId, doctorId?, appointmentId?, notes? }
  const { data } = await API.post('/payments/card/initiate', payload);
  return data; // { paymentId, otpRefId, devOtpCode?, otpSentTo, expiresAt }
}

// Confirm card payment with OTP
export async function confirmCardPayment(paymentId, { otpRefId, otpCode }) {
  const { data } = await API.post(`/payments/card/${paymentId}/confirm`, { otpRefId, otpCode });
  return data.payment; // full payment
}

// List current user's payments
export async function listMyPayments(params = {}) {
  const { data } = await API.get('/payments/me', { params });
  return data; // { items, total, page, limit }
}

export async function getPaymentById(id) {
  const { data } = await API.get(`/payments/${id}`);
  return data; // payment JSON
}

export async function updatePayment(id, patch) {
  const { data } = await API.patch(`/payments/${id}`, patch);
  return data; // updated payment
}

export async function deletePayment(id) {
  await API.delete(`/payments/${id}`);
  return true;
}
