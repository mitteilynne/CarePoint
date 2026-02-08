import { useState, useEffect } from 'react';
import { pharmacistAPI } from '../services/api';

interface Prescription {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  doctor_specialization?: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  dispensed_quantity: number;
  instructions: string;
  status: 'pending' | 'dispensed' | 'partially_dispensed' | 'cancelled' | 'referred';
  dispensed_at: string | null;
  dispensed_by: string | null;
  referral_notes: string | null;
  referred_at: string | null;
  prescribed_at: string;
  created_at: string;
  medical_record_id?: number;
  priority?: 'normal' | 'urgent' | 'high';
  diagnosis?: string;
}

interface InventoryItem {
  id: number;
  medication_name: string;
  generic_name: string | null;
  brand_name: string | null;
  dosage_form: string | null;
  strength: string | null;
  quantity_in_stock: number;
  minimum_stock_level: number;
  unit_of_measure: string;
  batch_number: string | null;
  expiry_date: string | null;
  storage_location: string | null;
  unit_price: number | null;
  supplier: string | null;
  is_active: boolean;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  notes: string | null;
  last_restocked_at: string | null;
  created_at: string;
}

interface Stats {
  pending_prescriptions: number;
  low_stock_items: number;
  out_of_stock_items: number;
  dispensed_today: number;
}

export default function PharmacistDashboard() {
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'inventory'>('prescriptions');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [prescriptionStatus, setPrescriptionStatus] = useState<string>('pending');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'low_stock'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'success' | 'info' | 'warning' | 'error', timestamp: Date}>>([]);
  const [lastPrescriptionCheck, setLastPrescriptionCheck] = useState<Date>(new Date());

  // Modals
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [showReferModal, setShowReferModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showPrescriptionDetailsModal, setShowPrescriptionDetailsModal] = useState(false);
  const [isEditingInventory, setIsEditingInventory] = useState(false);

  // Form states
  const [dispenseForm, setDispenseForm] = useState({ quantity_dispensed: 0, notes: '' });
  const [referForm, setReferForm] = useState({ referral_notes: '' });
  const [inventoryForm, setInventoryForm] = useState({
    medication_name: '',
    generic_name: '',
    brand_name: '',
    dosage_form: '',
    strength: '',
    quantity_in_stock: 0,
    minimum_stock_level: 10,
    unit_of_measure: 'units',
    batch_number: '',
    expiry_date: '',
    storage_location: '',
    unit_price: 0,
    supplier: '',
    notes: ''
  });

  useEffect(() => {
    fetchStats();
    
    // Set up periodic checking for new prescriptions
    const prescriptionCheckInterval = setInterval(checkForNewPrescriptions, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(prescriptionCheckInterval);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'prescriptions') {
      fetchPrescriptions();
    } else {
      fetchInventory();
    }
  }, [activeTab, prescriptionStatus, inventoryFilter, searchTerm]);

  // Add notification function
  const addNotification = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = Date.now().toString();
    const notification = { id, message, type, timestamp: new Date() };
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Check for new prescriptions
  const checkForNewPrescriptions = async () => {
    try {
      const response = await pharmacistAPI.getPrescriptions('pending');
      const currentPrescriptions = response.prescriptions;
      
      const newPrescriptions = currentPrescriptions.filter((prescription: Prescription) => {
        const prescribedAt = new Date(prescription.prescribed_at);
        return prescribedAt > lastPrescriptionCheck;
      });
      
      if (newPrescriptions.length > 0) {
        const message = `${newPrescriptions.length} new prescription${newPrescriptions.length > 1 ? 's' : ''} received from doctor${newPrescriptions.length > 1 ? 's' : ''}`;
        addNotification(message, 'info');
        
        // Update last check time
        setLastPrescriptionCheck(new Date());
        
        // Refresh prescriptions if on pending tab
        if (prescriptionStatus === 'pending') {
          fetchPrescriptions();
        }
        
        // Refresh stats
        fetchStats();
      }
    } catch (err) {
      console.error('Error checking for new prescriptions:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await pharmacistAPI.getStats();
      setStats(response);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await pharmacistAPI.getPrescriptions(prescriptionStatus, searchTerm);
      setPrescriptions(response.prescriptions);
      setError(null);
    } catch (err) {
      setError('Failed to fetch prescriptions');
      console.error('Error fetching prescriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await pharmacistAPI.getInventory(searchTerm, inventoryFilter === 'low_stock');
      setInventory(response.inventory);
      setError(null);
    } catch (err) {
      setError('Failed to fetch inventory');
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async (prescriptionId: number) => {
    try {
      await pharmacistAPI.dispensePrescription(prescriptionId, dispenseForm);
      setShowDispenseModal(false);
      setSelectedPrescription(null);
      setDispenseForm({ quantity_dispensed: 0, notes: '' });
      fetchPrescriptions();
      fetchStats();
      addNotification('Prescription dispensed successfully', 'success');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to dispense prescription');
      console.error('Error dispensing prescription:', err);
    }
  };

  const handleRefer = async (prescriptionId: number) => {
    try {
      await pharmacistAPI.referPrescription(prescriptionId, referForm);
      setShowReferModal(false);
      setSelectedPrescription(null);
      setReferForm({ referral_notes: '' });
      fetchPrescriptions();
      fetchStats();
      addNotification('Patient referred successfully', 'success');
    } catch (err) {
      setError('Failed to refer prescription');
      console.error('Error referring prescription:', err);
    }
  };

  const handleSaveInventory = async () => {
    try {
      if (isEditingInventory && selectedInventoryItem) {
        await pharmacistAPI.updateInventoryItem(selectedInventoryItem.id, inventoryForm);
      } else {
        await pharmacistAPI.addInventoryItem(inventoryForm);
      }
      setShowInventoryModal(false);
      setSelectedInventoryItem(null);
      setIsEditingInventory(false);
      resetInventoryForm();
      fetchInventory();
      fetchStats();
    } catch (err) {
      setError('Failed to save inventory item');
      console.error('Error saving inventory item:', err);
    }
  };

  const handleDeleteInventory = async (itemId: number) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) return;
    
    try {
      await pharmacistAPI.deleteInventoryItem(itemId);
      fetchInventory();
      fetchStats();
    } catch (err) {
      setError('Failed to delete inventory item');
      console.error('Error deleting inventory item:', err);
    }
  };

  const openDispenseModal = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setDispenseForm({ quantity_dispensed: prescription.quantity, notes: '' });
    setShowDispenseModal(true);
  };

  const openReferModal = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setReferForm({ referral_notes: '' });
    setShowReferModal(true);
  };

  const openInventoryModal = (item?: InventoryItem) => {
    if (item) {
      setSelectedInventoryItem(item);
      setIsEditingInventory(true);
      setInventoryForm({
        medication_name: item.medication_name,
        generic_name: item.generic_name || '',
        brand_name: item.brand_name || '',
        dosage_form: item.dosage_form || '',
        strength: item.strength || '',
        quantity_in_stock: item.quantity_in_stock,
        minimum_stock_level: item.minimum_stock_level,
        unit_of_measure: item.unit_of_measure,
        batch_number: item.batch_number || '',
        expiry_date: item.expiry_date || '',
        storage_location: item.storage_location || '',
        unit_price: item.unit_price || 0,
        supplier: item.supplier || '',
        notes: item.notes || ''
      });
    } else {
      resetInventoryForm();
    }
    setShowInventoryModal(true);
  };

  const resetInventoryForm = () => {
    setInventoryForm({
      medication_name: '',
      generic_name: '',
      brand_name: '',
      dosage_form: '',
      strength: '',
      quantity_in_stock: 0,
      minimum_stock_level: 10,
      unit_of_measure: 'units',
      batch_number: '',
      expiry_date: '',
      storage_location: '',
      unit_price: 0,
      supplier: '',
      notes: ''
    });
    setIsEditingInventory(false);
    setSelectedInventoryItem(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'dispensed': return 'bg-green-100 text-green-800';
      case 'partially_dispensed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'referred': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 space-y-2 z-50">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ${
                notification.type === 'success' ? 'bg-green-100 border-green-500' :
                notification.type === 'info' ? 'bg-blue-100 border-blue-500' :
                notification.type === 'warning' ? 'bg-yellow-100 border-yellow-500' :
                'bg-red-100 border-red-500'
              } border-l-4 p-4`}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {notification.type === 'success' && (
                    <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {notification.type === 'info' && (
                    <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {notification.type === 'warning' && (
                    <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                  {notification.type === 'error' && (
                    <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <p className={`text-sm font-medium ${
                    notification.type === 'success' ? 'text-green-800' :
                    notification.type === 'info' ? 'text-blue-800' :
                    notification.type === 'warning' ? 'text-yellow-800' :
                    'text-red-800'
                  }`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {notification.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                    className={`rounded-md inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      notification.type === 'success' ? 'focus:ring-green-500' :
                      notification.type === 'info' ? 'focus:ring-blue-500' :
                      notification.type === 'warning' ? 'focus:ring-yellow-500' :
                      'focus:ring-red-500'
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Pharmacist Dashboard</h1>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Pending Prescriptions</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.pending_prescriptions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-orange-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.low_stock_items}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Out of Stock</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.out_of_stock_items}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Dispensed Today</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.dispensed_today}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('prescriptions')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'prescriptions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Prescriptions
                {stats && stats.pending_prescriptions > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {stats.pending_prescriptions}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'inventory'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Inventory Management
                {stats && (stats.low_stock_items > 0 || stats.out_of_stock_items > 0) && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {stats.low_stock_items + stats.out_of_stock_items}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Prescriptions Tab */}
          {activeTab === 'prescriptions' && (
            <div className="p-6">
              {/* Prescription Summary Cards */}
              {prescriptionStatus === 'all' && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium opacity-90">Total Prescriptions</p>
                        <p className="text-xl font-semibold">{prescriptions.length}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium opacity-90">Dispensed</p>
                        <p className="text-xl font-semibold">
                          {prescriptions.filter(p => p.status === 'dispensed').length}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium opacity-90">Pending</p>
                        <p className="text-xl font-semibold">
                          {prescriptions.filter(p => p.status === 'pending').length}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium opacity-90">Referred</p>
                        <p className="text-xl font-semibold">
                          {prescriptions.filter(p => p.status === 'referred').length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Doctor Analytics */}
              {prescriptionStatus === 'all' && prescriptions.length > 0 && (
                <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-indigo-900 mb-4 flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Prescription Analytics from Doctors
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600 mb-3">Top Prescribing Doctors</h4>
                      <div className="space-y-2">
                        {(() => {
                          const doctorCounts = prescriptions.reduce((acc, p) => {
                            acc[p.doctor_name] = (acc[p.doctor_name] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);
                          return Object.entries(doctorCounts)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 3)
                            .map(([doctor, count]) => (
                              <div key={doctor} className="flex justify-between items-center">
                                <span className="text-sm text-gray-900 truncate">{doctor}</span>
                                <span className="text-sm font-medium text-indigo-600">{count}</span>
                              </div>
                            ));
                        })()}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600 mb-3">Most Prescribed Medications</h4>
                      <div className="space-y-2">
                        {(() => {
                          const medicationCounts = prescriptions.reduce((acc, p) => {
                            acc[p.medication_name] = (acc[p.medication_name] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);
                          return Object.entries(medicationCounts)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 3)
                            .map(([medication, count]) => (
                              <div key={medication} className="flex justify-between items-center">
                                <span className="text-sm text-gray-900 truncate">{medication}</span>
                                <span className="text-sm font-medium text-indigo-600">{count}</span>
                              </div>
                            ));
                        })()}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600 mb-3">Success Metrics</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Dispensed Rate</span>
                          <span className="text-sm font-medium text-green-600">
                            {Math.round((prescriptions.filter(p => p.status === 'dispensed').length / prescriptions.length) * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Referral Rate</span>
                          <span className="text-sm font-medium text-purple-600">
                            {Math.round((prescriptions.filter(p => p.status === 'referred').length / prescriptions.length) * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Unique Doctors</span>
                          <span className="text-sm font-medium text-indigo-600">
                            {new Set(prescriptions.map(p => p.doctor_name)).size}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by patient name or medication..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={prescriptionStatus}
                  onChange={(e) => setPrescriptionStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">Pending Prescriptions</option>
                  <option value="dispensed">Dispensed Prescriptions</option>
                  <option value="partially_dispensed">Partially Dispensed</option>
                  <option value="referred">Referred Prescriptions</option>
                  <option value="cancelled">Cancelled Prescriptions</option>
                  <option value="all">All Prescriptions (History)</option>
                </select>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{prescriptions.length} prescription(s) found</span>
                </div>
              </div>

              {/* Prescriptions List */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading prescriptions...</p>
                </div>
              ) : prescriptions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No prescriptions found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medication</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosage & Frequency</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prescribed</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {prescriptions.map((prescription) => (
                        <tr key={prescription.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{prescription.patient_name}</div>
                                <div className="text-sm text-gray-500">ID: {prescription.patient_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m4 0l-5-5-5 5m14-14l-5 5-5-5" />
                                  </svg>
                                </div>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{prescription.doctor_name}</div>
                                {prescription.doctor_specialization && (
                                  <div className="text-xs text-gray-500">{prescription.doctor_specialization}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{prescription.medication_name}</div>
                            {prescription.instructions && (
                              <div className="text-xs text-gray-500 mt-1">
                                <span className="italic">{prescription.instructions.substring(0, 50)}{prescription.instructions.length > 50 ? '...' : ''}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              <span className="font-medium">{prescription.dosage}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {prescription.frequency} • {prescription.duration}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <span className={prescription.dispensed_quantity > 0 ? 'text-green-600' : ''}>
                                {prescription.dispensed_quantity}
                              </span>
                              <span className="text-gray-400">/{prescription.quantity}</span>
                            </div>
                            {prescription.dispensed_quantity > 0 && prescription.dispensed_quantity < prescription.quantity && (
                              <div className="text-xs text-orange-600">Partial</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(prescription.status)}`}>
                              {prescription.status.replace('_', ' ')}
                            </span>
                            {prescription.priority === 'urgent' && (
                              <div className="mt-1">
                                <span className="px-1 inline-flex text-xs leading-4 font-semibold rounded bg-red-100 text-red-800">
                                  URGENT
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>{new Date(prescription.prescribed_at).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(prescription.prescribed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {prescription.status === 'pending' && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => openDispenseModal(prescription)}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                  Dispense
                                </button>
                                <button
                                  onClick={() => openReferModal(prescription)}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                                >
                                  Refer
                                </button>
                              </div>
                            )}
                            {prescription.status === 'referred' && prescription.referral_notes && (
                              <button
                                onClick={() => {
                                  alert(`Referral Notes:\n${prescription.referral_notes}`);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View Notes
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedPrescription(prescription);
                                setShowPrescriptionDetailsModal(true);
                              }}
                              className="ml-2 text-gray-400 hover:text-gray-600"
                              title="View Details"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="p-6">
              {/* Filters and Actions */}
              <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search medications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={inventoryFilter}
                  onChange={(e) => setInventoryFilter(e.target.value as 'all' | 'low_stock')}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Items</option>
                  <option value="low_stock">Low Stock Only</option>
                </select>
                <button
                  onClick={() => openInventoryModal()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
              </div>

              {/* Inventory List */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading inventory...</p>
                </div>
              ) : inventory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No inventory items found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medication</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strength</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Level</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inventory.map((item) => (
                        <tr key={item.id} className={`hover:bg-gray-50 ${item.is_out_of_stock ? 'bg-red-50' : item.is_low_stock ? 'bg-yellow-50' : ''}`}>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{item.medication_name}</div>
                            {item.generic_name && (
                              <div className="text-xs text-gray-500">{item.generic_name}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.strength || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {item.quantity_in_stock} {item.unit_of_measure}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.minimum_stock_level}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.is_out_of_stock ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                Out of Stock
                              </span>
                            ) : item.is_low_stock ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Low Stock
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.storage_location || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => openInventoryModal(item)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteInventory(item.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dispense Modal */}
      {showDispenseModal && selectedPrescription && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Dispense Prescription</h3>
            <div className="space-y-4">
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
                  value={dispenseForm.quantity_dispensed}
                  onChange={(e) => setDispenseForm({ ...dispenseForm, quantity_dispensed: parseInt(e.target.value) })}
                  max={selectedPrescription.quantity}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                <textarea
                  value={dispenseForm.notes}
                  onChange={(e) => setDispenseForm({ ...dispenseForm, notes: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
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
                onClick={() => handleDispense(selectedPrescription.id)}
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
            <div className="space-y-4">
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
                  value={referForm.referral_notes}
                  onChange={(e) => setReferForm({ ...referForm, referral_notes: e.target.value })}
                  placeholder="Provide details about where the patient should obtain this medication..."
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowReferModal(false);
                  setSelectedPrescription(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRefer(selectedPrescription.id)}
                disabled={!referForm.referral_notes}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
              >
                Refer Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              {isEditingInventory ? 'Edit Inventory Item' : 'Add New Inventory Item'}
            </h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Medication Name *</label>
                  <input
                    type="text"
                    value={inventoryForm.medication_name}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, medication_name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Generic Name</label>
                  <input
                    type="text"
                    value={inventoryForm.generic_name}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, generic_name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Brand Name</label>
                  <input
                    type="text"
                    value={inventoryForm.brand_name}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, brand_name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Dosage Form</label>
                  <input
                    type="text"
                    value={inventoryForm.dosage_form}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, dosage_form: e.target.value })}
                    placeholder="e.g., Tablet, Capsule, Syrup"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Strength</label>
                  <input
                    type="text"
                    value={inventoryForm.strength}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, strength: e.target.value })}
                    placeholder="e.g., 500mg, 10ml"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity in Stock *</label>
                  <input
                    type="number"
                    value={inventoryForm.quantity_in_stock}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, quantity_in_stock: parseInt(e.target.value) || 0 })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Minimum Stock Level</label>
                  <input
                    type="number"
                    value={inventoryForm.minimum_stock_level}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, minimum_stock_level: parseInt(e.target.value) || 0 })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit of Measure</label>
                  <input
                    type="text"
                    value={inventoryForm.unit_of_measure}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, unit_of_measure: e.target.value })}
                    placeholder="e.g., units, boxes, bottles"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Batch Number</label>
                  <input
                    type="text"
                    value={inventoryForm.batch_number}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, batch_number: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                  <input
                    type="date"
                    value={inventoryForm.expiry_date}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, expiry_date: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Storage Location</label>
                  <input
                    type="text"
                    value={inventoryForm.storage_location}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, storage_location: e.target.value })}
                    placeholder="e.g., Shelf A-5"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={inventoryForm.unit_price}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, unit_price: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier</label>
                  <input
                    type="text"
                    value={inventoryForm.supplier}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, supplier: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={inventoryForm.notes}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, notes: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowInventoryModal(false);
                  resetInventoryForm();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInventory}
                disabled={!inventoryForm.medication_name}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isEditingInventory ? 'Update' : 'Add'} Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Details Modal */}
      {showPrescriptionDetailsModal && selectedPrescription && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Prescription Details</h3>
              <button
                onClick={() => {
                  setShowPrescriptionDetailsModal(false);
                  setSelectedPrescription(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Patient Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Patient Information
                </h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Name</dt>
                    <dd className="text-sm text-gray-900">{selectedPrescription.patient_name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Patient ID</dt>
                    <dd className="text-sm text-gray-900">{selectedPrescription.patient_id}</dd>
                  </div>
                </dl>
              </div>

              {/* Doctor Information */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-green-800 mb-3 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Prescribing Doctor
                </h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Name</dt>
                    <dd className="text-sm text-gray-900">{selectedPrescription.doctor_name}</dd>
                  </div>
                  {selectedPrescription.doctor_specialization && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Specialization</dt>
                      <dd className="text-sm text-gray-900">{selectedPrescription.doctor_specialization}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Doctor ID</dt>
                    <dd className="text-sm text-gray-900">{selectedPrescription.doctor_id}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Medication Details */}
            <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-yellow-800 mb-3 flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Medication Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Medication</dt>
                    <dd className="text-sm font-medium text-gray-900">{selectedPrescription.medication_name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Dosage</dt>
                    <dd className="text-sm text-gray-900">{selectedPrescription.dosage}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Frequency</dt>
                    <dd className="text-sm text-gray-900">{selectedPrescription.frequency}</dd>
                  </div>
                </dl>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Duration</dt>
                    <dd className="text-sm text-gray-900">{selectedPrescription.duration}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Total Quantity</dt>
                    <dd className="text-sm text-gray-900">{selectedPrescription.quantity} units</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Dispensed</dt>
                    <dd className="text-sm text-gray-900">
                      {selectedPrescription.dispensed_quantity} / {selectedPrescription.quantity} units
                      <span className="ml-2 text-xs text-gray-500">
                        ({Math.round((selectedPrescription.dispensed_quantity / selectedPrescription.quantity) * 100)}%)
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Instructions */}
            {selectedPrescription.instructions && (
              <div className="mt-6 bg-purple-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-purple-800 mb-3 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Special Instructions
                </h4>
                <p className="text-sm text-gray-900 leading-relaxed">{selectedPrescription.instructions}</p>
              </div>
            )}

            {/* Status and Timeline */}
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Status & Timeline
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500">Current Status</dt>
                  <dd>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedPrescription.status)}`}>
                      {selectedPrescription.status.replace('_', ' ')}
                    </span>
                    {selectedPrescription.priority === 'urgent' && (
                      <span className="ml-2 px-1 inline-flex text-xs leading-4 font-semibold rounded bg-red-100 text-red-800">
                        URGENT
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">Prescribed Date</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(selectedPrescription.prescribed_at).toLocaleDateString()}
                    <div className="text-xs text-gray-500">
                      {new Date(selectedPrescription.prescribed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </dd>
                </div>
                {selectedPrescription.dispensed_at && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Dispensed Date</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(selectedPrescription.dispensed_at).toLocaleDateString()}
                      <div className="text-xs text-gray-500">
                        by {selectedPrescription.dispensed_by}
                      </div>
                    </dd>
                  </div>
                )}
              </div>
              {selectedPrescription.referral_notes && (
                <div className="mt-3 p-3 bg-white border border-orange-200 rounded">
                  <dt className="text-xs font-medium text-orange-700">Referral Notes</dt>
                  <dd className="text-sm text-gray-900 mt-1">{selectedPrescription.referral_notes}</dd>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {selectedPrescription.status === 'pending' && (
              <div className="mt-6 flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowPrescriptionDetailsModal(false);
                    openDispenseModal(selectedPrescription);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Dispense Medication
                </button>
                <button
                  onClick={() => {
                    setShowPrescriptionDetailsModal(false);
                    openReferModal(selectedPrescription);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Refer Patient
                </button>
              </div>
            )}
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
