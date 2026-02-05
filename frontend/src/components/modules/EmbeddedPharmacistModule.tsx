import { useState, useEffect } from 'react';
import { pharmacistAPI } from '../../services/api';

interface Prescription {
  id: number;
  patient_id: number;
  patient_name: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  dispensed_quantity: number;
  instructions: string;
  status: 'pending' | 'dispensed' | 'partially_dispensed' | 'cancelled' | 'referred';
  prescribed_at: string;
}

interface InventoryItem {
  id: number;
  medication_name: string;
  strength: string | null;
  quantity_in_stock: number;
  minimum_stock_level: number;
  unit_of_measure: string;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
}

export default function EmbeddedPharmacistModule() {
  const [activeView, setActiveView] = useState<'pending' | 'inventory'>('pending');
  const [pendingPrescriptions, setPendingPrescriptions] = useState<Prescription[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [showReferModal, setShowReferModal] = useState(false);
  const [dispenseQuantity, setDispenseQuantity] = useState(0);
  const [referralNotes, setReferralNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeView]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeView === 'pending') {
        const response = await pharmacistAPI.getPrescriptions('pending');
        setPendingPrescriptions(response.prescriptions);
      } else {
        const response = await pharmacistAPI.getInventory('', true);
        setLowStockItems(response.inventory);
      }
      setError(null);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openDispenseModal = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setDispenseQuantity(prescription.quantity);
    setShowDispenseModal(true);
  };

  const openReferModal = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setReferralNotes('');
    setShowReferModal(true);
  };

  const handleDispense = async () => {
    if (!selectedPrescription) return;

    try {
      await pharmacistAPI.dispensePrescription(selectedPrescription.id, {
        quantity_dispensed: dispenseQuantity,
        notes: ''
      });
      setShowDispenseModal(false);
      setSelectedPrescription(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to dispense prescription');
      console.error('Error dispensing:', err);
    }
  };

  const handleRefer = async () => {
    if (!selectedPrescription || !referralNotes) return;

    try {
      await pharmacistAPI.referPrescription(selectedPrescription.id, {
        referral_notes: referralNotes
      });
      setShowReferModal(false);
      setSelectedPrescription(null);
      setReferralNotes('');
      fetchData();
    } catch (err) {
      setError('Failed to refer prescription');
      console.error('Error referring:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header with Tabs */}
      <div className="border-b border-gray-200">
        <div className="px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Pharmacy Module</h2>
        </div>
        <nav className="flex -mb-px px-6">
          <button
            onClick={() => setActiveView('pending')}
            className={`py-3 px-4 text-sm font-medium border-b-2 ${
              activeView === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Prescriptions
            {pendingPrescriptions.length > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 py-0.5 px-2 rounded-full text-xs">
                {pendingPrescriptions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveView('inventory')}
            className={`py-3 px-4 text-sm font-medium border-b-2 ${
              activeView === 'inventory'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Low Stock Alerts
            {lowStockItems.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-800 py-0.5 px-2 rounded-full text-xs">
                {lowStockItems.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-3 text-gray-600">Loading...</p>
          </div>
        ) : activeView === 'pending' ? (
          // Pending Prescriptions View
          <div>
            {pendingPrescriptions.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-gray-500">No pending prescriptions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPrescriptions.map((prescription) => (
                  <div key={prescription.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="text-lg font-semibold text-gray-900">{prescription.patient_name}</h3>
                          <span className="ml-3 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                            Pending
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Medication:</span> {prescription.medication_name}
                          </p>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Dosage:</span> {prescription.dosage} - {prescription.frequency}
                          </p>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Duration:</span> {prescription.duration}
                          </p>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Quantity:</span> {prescription.quantity}
                          </p>
                          {prescription.instructions && (
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Instructions:</span> {prescription.instructions}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Prescribed: {new Date(prescription.prescribed_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col space-y-2">
                        <button
                          onClick={() => openDispenseModal(prescription)}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700"
                        >
                          Dispense
                        </button>
                        <button
                          onClick={() => openReferModal(prescription)}
                          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700"
                        >
                          Refer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Low Stock Inventory View
          <div>
            {lowStockItems.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-gray-500">All items are adequately stocked</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 ${
                      item.is_out_of_stock ? 'border-red-300 bg-red-50' : 'border-orange-300 bg-orange-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="text-base font-semibold text-gray-900">{item.medication_name}</h3>
                          <span
                            className={`ml-3 px-2 py-1 text-xs font-medium rounded ${
                              item.is_out_of_stock
                                ? 'bg-red-200 text-red-900'
                                : 'bg-orange-200 text-orange-900'
                            }`}
                          >
                            {item.is_out_of_stock ? 'Out of Stock' : 'Low Stock'}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {item.strength && (
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Strength:</span> {item.strength}
                            </p>
                          )}
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Current Stock:</span> {item.quantity_in_stock} {item.unit_of_measure}
                          </p>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Minimum Level:</span> {item.minimum_stock_level} {item.unit_of_measure}
                          </p>
                        </div>
                      </div>
                      {item.is_out_of_stock && (
                        <div className="ml-4">
                          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dispense Modal */}
      {showDispenseModal && selectedPrescription && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Dispense Prescription</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Patient</label>
                <p className="mt-1 text-sm text-gray-900">{selectedPrescription.patient_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Medication</label>
                <p className="mt-1 text-sm text-gray-900">{selectedPrescription.medication_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity to Dispense</label>
                <input
                  type="number"
                  value={dispenseQuantity}
                  onChange={(e) => setDispenseQuantity(parseInt(e.target.value))}
                  max={selectedPrescription.quantity}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDispenseModal(false);
                  setSelectedPrescription(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDispense}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Dispense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refer Modal */}
      {showReferModal && selectedPrescription && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Refer Patient</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Patient</label>
                <p className="mt-1 text-sm text-gray-900">{selectedPrescription.patient_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Medication</label>
                <p className="mt-1 text-sm text-gray-900">{selectedPrescription.medication_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Referral Notes *</label>
                <textarea
                  value={referralNotes}
                  onChange={(e) => setReferralNotes(e.target.value)}
                  placeholder="Provide details about where to obtain this medication..."
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowReferModal(false);
                  setSelectedPrescription(null);
                  setReferralNotes('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRefer}
                disabled={!referralNotes}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
              >
                Refer Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50">
          <div className="flex items-center">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
