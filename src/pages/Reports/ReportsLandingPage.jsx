import { Link } from 'react-router-dom';
import { BarChart3, Users } from 'lucide-react';

export default function ReportsLandingPage() {
  const reportOptions = [
    {
      id: 'patients',
      title: 'Generate Patient Reports',
      description:
        'Create detailed reports on patients, including demographics, contact details, and medical information with flexible filters.',
      path: '/reports/generate',
      icon: <Users className="w-10 h-10 text-blue-600" />,
    },
    {
      id: 'appointments',
      title: 'Generate Appointment Reports',
      description:
        'View comprehensive statistics and summaries of appointments over specific periods, including status and specialization insights.',
      path: '/reports/appointments',
      icon: <BarChart3 className="w-10 h-10 text-green-600" />,
    },
  ];

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link to="/" className="hover:text-gray-700">Dashboard</Link>
          <span>›</span>
          <span>Reports</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Reports Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Select a report type to generate insights for patients or appointments.
        </p>
      </div>

      {/* Report Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {reportOptions.map((option) => (
          <div
            key={option.id}
            className="bg-white border rounded-2xl p-6 hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gray-100 rounded-xl">{option.icon}</div>
                <h2 className="text-xl font-semibold text-gray-900">{option.title}</h2>
              </div>

              <p className="text-gray-600 mb-4">{option.description}</p>

              <div className="text-sm text-gray-500 mb-6">{option.stats}</div>
            </div>

            <Link
              to={option.path}
              className={`inline-block w-full text-center py-3 rounded-lg font-medium text-white transition-colors ${
                option.id === 'patients'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              Go to {option.title.replace('Generate ', '')}
            </Link>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-12 text-center text-sm text-gray-500">
        <p>Need help? Visit our <span className="text-blue-600 cursor-pointer hover:underline">Report Documentation</span>.</p>
      </div>
    </div>
  );
}
