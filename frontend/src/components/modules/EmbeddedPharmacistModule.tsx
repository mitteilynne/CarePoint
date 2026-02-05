import { useState, useEffect } from 'react';
import { pharmacistAPI } from '../../services/api';

type ViewMode = 'dashboard' | 'prescriptions' | 'inventory';

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

interface PharmacyStats {
  pending_prescriptions: number;
  low_stock_items: number;
  out_of_stock_items: number;
  dispensed_today: number;
}

interface EmbeddedPharmacistModuleProps {
  onBack?: () => void;
  isEmbedded?: boolean;
}

export default function EmbeddedPharmacistModule({ onBack, isEmbedded = true }: EmbeddedPharmacistModuleProps) {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [pendingPrescriptions, setPendingPrescriptions] = useState<Prescription[]>([]);
  const [allPrescriptions, setAllPrescriptions] = useState<Prescription[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<PharmacyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [showReferModal, setShowReferModal] = useState(false);
  const [dispenseQuantity, setDispenseQuantity] = useState(0);
  const [referralNotes, setReferralNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadStats();
    loadPendingData();
    const interval = setInterval(() => {
      loadStats();
      loadPendingData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentView === 'prescriptions') {
      loadPrescriptions();
    } else if (currentView === 'inventory') {
      loadInventory();
    }
  }, [currentView]);

  const loadStats = async () => {
    try {
      const response = await pharmacistAPI.getStats();
      setStats(response);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadPendingData = async () => {
    try {
      const [prescResponse, inventoryResponse] = await Promise.all([
        pharmacistAPI.getPrescriptions('pending'),
        pharmacistAPI.getInventory('', true)
      ]);
      setPendingPrescriptions(prescResponse.prescriptions);
      setLowStockItems(inventoryResponse.inventory);
    } catch (err) {
      console.error('Failed to load pending data:', err);
    }
  };

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await pharmacistAPI.getPrescriptions('');
      setAllPrescriptions(response.prescriptions);
    } catch (err) {
      showMessage('error', 'Failed to fetch prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await pharmacistAPI.getInventory('', false);
      setAllInventory(response.inventory);
    } catch (err) {
      showMessage('error', 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const openDispenseModal = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setDispenseQuantity(prescription.quantity - prescription.dispensed_quantity);
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
      showMessage('success', 'Prescription dispensed successfully');
      loadStats();
      loadPendingData();
      if (currentView === 'prescriptions') loadPrescriptions();
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Failed to dispense prescription');
    }
  };

  const handleRefer = async () => {
    if (!selectedPrescription || !referralNotes) {
      showMessage('error', 'Please provide referral notes');
      return;
    }

    try {
      await pharmacistAPI.referPrescription(selectedPrescription.id, {
        referral_notes: referralNotes
      });
      setShowReferModal(false);
      showMessage('success', 'Prescription referred successfully');
      loadStats();
      loadPendingData();
      if (currentView === 'prescriptions') loadPrescriptions();
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Failed to refer prescription');
    }
  };

  const renderHeader = () => (
    <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-4 rounded-t-lg flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <div>
          <h2 className="text-xl font-bold">Pharmacy Module</h2>
          <p className="text-teal-100 text-sm">Full pharmacy dashboard access</p>
        </div>
      </div>
      {isEmbedded && onBack && (
        <button
          onClick={onBack}
          className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Admin</span>
        </button>
      )}
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6 p-4">
      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending_prescriptions}</div>
            <div className="text-sm text-yellow-800">Pending Prescriptions</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-600">{stats.low_stock_items}</div>
            <div className="text-sm text-orange-800">Low Stock Items</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-600">{stats.out_of_stock_items}</div>
            <div className="text-sm text-red-800">Out of Stock</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{stats.dispensed_today}</div>
            <div className="text-sm text-green-800">Dispensed Today</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Pharmacy Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setCurrentView('prescriptions')}
            className="bg-yellow-600 text-white px-4 py-3 rounded-lg hover:bg-yellow-700 flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm">Prescriptions</span>
          </button>
          
          <button
            onClick={() => setCurrentView('inventory')}
            className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="text-sm">Inventory</span>
          </button>
          
          <button
            onClick={() => {
              loadPrescriptions();
              setCurrentView('prescriptions');
            }}
            className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">Dispense</span>
          </button>
          
          <button
            onClick={() => {
              loadPrescriptions();
              setCurrentView('prescriptions');
            }}
            className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-sm">Refer</span>
          </button>
        </div>
      </div>

      {/* Quick View of Pending Prescriptions */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Pending Prescriptions</h3>
          <button
            onClick={() => setCurrentView('prescriptions')}
            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
          >
            View All →
          </button>
        </div>
        {pendingPrescriptions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No pending prescriptions</p>
        ) : (
          <div className="space-y-2">
            {pendingPrescriptions.slice(0, 5).map(prescription => (
              <div key={prescription.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{prescription.patient_name}</div>
                  <div className="text-sm text-gray-600">{prescription.medication_name} - {prescription.dosage}</div>
                  <div className="text-xs text-gray-500">Qty: {prescription.quantity} | {prescription.frequency}</div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openDispenseModal(prescription)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Dispense
                  </button>
                  <button
                    onClick={() => openReferModal(prescription)}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                  >
                    Refer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick View of Low Stock Items */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Low Stock Alerts</h3>
          <button
            onClick={() => setCurrentView('inventory')}
            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
          >
            View All →
          </button>
        </div>
        {lowStockItems.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No low stock items</p>
        ) : (
          <div className="space-y-2">
            {lowStockItems.slice(0, 5).map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{item.medication_name}</div>
                  <div className="text-sm text-gray-600">
                    {item.strength && `${item.strength} - `}
                    Stock: {item.quantity_in_stock} {item.unit_of_measure}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${item.is_out_of_stock ? 'text-red-600' : 'text-orange-600'}`}>
                    {item.is_out_of_stock ? 'OUT OF STOCK' : 'LOW STOCK'}
                  </div>
                  <div className="text-xs text-gray-500">Min: {item.minimum_stock_level}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderPrescriptions = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">All Prescriptions</h3>
        <input
          type="text"
          placeholder="Search by patient or medication..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border rounded-lg w-64"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medication</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dosage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allPrescriptions
                .filter(p => 
                  p.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.medication_name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(prescription => (
                  <tr key={prescription.id}>
                    <td className="px-4 py-3">{prescription.patient_name}</td>
                    <td className="px-4 py-3">{prescription.medication_name}</td>
                    <td className="px-4 py-3">{prescription.dosage}</td>
                    <td className="px-4 py-3">{prescription.quantity}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        prescription.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        prescription.status === 'dispensed' ? 'bg-green-100 text-green-800' :
                        prescription.status === 'referred' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {prescription.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {prescription.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openDispenseModal(prescription)}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                          >
                            Dispense
                          </button>
                          <button
                            onClick={() => openReferModal(prescription)}
                            className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                          >
                            Refer
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderInventory = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Inventory Management</h3>
        <input
          type="text"
          placeholder="Search medications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border rounded-lg w-64"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medication</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strength</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">In Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allInventory
                .filter(item => 
                  item.medication_name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium">{item.medication_name}</td>
                    <td className="px-4 py-3">{item.strength || '-'}</td>
                    <td className="px-4 py-3">{item.quantity_in_stock} {item.unit_of_measure}</td>
                    <td className="px-4 py-3">{item.minimum_stock_level} {item.unit_of_measure}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.is_out_of_stock ? 'bg-red-100 text-red-800' :
                        item.is_low_stock ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {item.is_out_of_stock ? 'OUT OF STOCK' : item.is_low_stock ? 'LOW STOCK' : 'IN STOCK'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {renderHeader()}
      
      {message.text && (
        <div className={`mx-4 mt-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="float-right text-lg">&times;</button>
        </div>
      )}

      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'prescriptions' && renderPrescriptions()}
      {currentView === 'inventory' && renderInventory()}

      {/* Dispense Modal */}
      {showDispenseModal && selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Dispense Prescription</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Patient:</p>
                <p className="font-medium">{selectedPrescription.patient_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Medication:</p>
                <p className="font-medium">{selectedPrescription.medication_name}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Quantity to Dispense:</label>
                <input
                  type="number"
                  value={dispenseQuantity}
                  onChange={(e) => setDispenseQuantity(parseInt(e.target.value))}
                  max={selectedPrescription.quantity - selectedPrescription.dispensed_quantity}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              <button
                onClick={handleDispense}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Dispense
              </button>
              <button
                onClick={() => setShowDispenseModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refer Modal */}
      {showReferModal && selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Refer Prescription</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Patient:</p>
                <p className="font-medium">{selectedPrescription.patient_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Medication:</p>
                <p className="font-medium">{selectedPrescription.medication_name}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Referral Notes:</label>
                <textarea
                  value={referralNotes}
                  onChange={(e) => setReferralNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                  placeholder="Reason for referral..."
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              <button
                onClick={handleRefer}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Refer
              </button>
              <button
                onClick={() => setShowReferModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
