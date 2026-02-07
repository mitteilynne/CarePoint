import React, { useState } from 'react';
import { 
  HomeIcon, 
  UsersIcon, 
  UserGroupIcon,
  BeakerIcon,
  BuildingOffice2Icon,
  CogIcon,
  ChartBarIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  PlusCircleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

export interface SidebarSubItem {
  key: string;
  label: string;
  icon?: React.ComponentType<any>;
}

export interface SidebarItem {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  count?: number;
  badge?: string;
  children?: SidebarSubItem[];
  hasDropdown?: boolean;
}

interface AdminSidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  items: SidebarItem[];
  onLogout?: () => void;
  userInfo?: {
    name: string;
    role: string;
  };
}

export default function AdminSidebar({ 
  currentView, 
  onViewChange, 
  items, 
  onLogout,
  userInfo 
}: AdminSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemKey: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemKey)) {
      newExpanded.delete(itemKey);
    } else {
      newExpanded.add(itemKey);
    }
    setExpandedItems(newExpanded);
  };

  const handleItemClick = (item: SidebarItem) => {
    if (item.hasDropdown) {
      toggleExpanded(item.key);
    } else {
      onViewChange(item.key);
      setIsMobileMenuOpen(false);
    }
  };

  const handleSubItemClick = (subItem: SidebarSubItem) => {
    onViewChange(subItem.key);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-white shadow-md"
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="h-6 w-6" />
          ) : (
            <Bars3Icon className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">CarePoint Admin</h1>
        </div>

        {/* User Info */}
        {userInfo && (
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{userInfo.name}</p>
                <p className="text-xs text-gray-500 capitalize">{userInfo.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const IconComponent = item.icon;
            const isExpanded = expandedItems.has(item.key);
            const isActive = currentView === item.key || (item.children?.some(child => child.key === currentView));
            
            return (
              <div key={item.key} className="space-y-1">
                <button
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <IconComponent className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count !== undefined && (
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      isActive 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.count}
                    </span>
                  )}
                  {item.badge && (
                    <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {item.hasDropdown && (
                    <div className="ml-2">
                      {isExpanded ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </div>
                  )}
                </button>

                {/* Dropdown content */}
                {item.hasDropdown && isExpanded && item.children && (
                  <div className="ml-4 space-y-1">
                    {item.children.map((subItem, index) => {
                      const SubItemIcon = subItem.icon;
                      const isDashboardOrModule = subItem.key.includes('dashboard') || subItem.key.includes('module');
                      
                      return (
                        <div key={subItem.key}>
                          {/* Add separator line after module items */}
                          {index === 1 && (
                            <div className="border-t border-gray-200 my-2"></div>
                          )}
                          <button
                            onClick={() => handleSubItemClick(subItem)}
                            className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
                              currentView === subItem.key
                                ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                                : isDashboardOrModule
                                ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 font-medium'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-700 pl-6'
                            }`}
                          >
                            {SubItemIcon && (
                              <SubItemIcon className={`mr-2 flex-shrink-0 ${
                                isDashboardOrModule ? 'h-4 w-4' : 'h-3 w-3'
                              }`} />
                            )}
                            <span className={isDashboardOrModule ? 'font-medium' : 'text-sm'}>
                              {subItem.label}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        {onLogout && (
          <div className="px-4 py-4 border-t border-gray-200">
            <button
              onClick={onLogout}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
            >
              <CogIcon className="mr-3 h-5 w-5 flex-shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// Export predefined sidebar configurations
export const getAdminSidebarItems = (counts?: { 
  users?: number; 
  doctors?: number; 
  receptionists?: number; 
  labTechs?: number; 
}): SidebarItem[] => [
  {
    key: 'overview',
    label: 'Overview',
    icon: HomeIcon
  },
  {
    key: 'users',
    label: 'All Users',
    icon: UsersIcon,
    count: counts?.users
  },
  {
    key: 'receptionist',
    label: 'Reception',
    icon: UserGroupIcon,
    count: counts?.receptionists,
    hasDropdown: true,
    children: [
      {
        key: 'receptionists',
        label: 'Reception Dashboard',
        icon: ChartBarIcon
      },
      {
        key: 'receptionist_module',
        label: 'Reception Module',
        icon: ClipboardDocumentListIcon
      },

    ]
  },
  {
    key: 'doctor',
    label: 'Doctors',
    icon: UserIcon,
    count: counts?.doctors,
    hasDropdown: true,
    children: [
      {
        key: 'doctors',
        label: 'Doctors Dashboard',
        icon: ChartBarIcon
      },
      {
        key: 'doctor_module',
        label: 'Doctor Module',
        icon: ClipboardDocumentListIcon
      },

    ]
  },
  {
    key: 'lab_technician',
    label: 'Lab Technicians',
    icon: BeakerIcon,
    count: counts?.labTechs,
    hasDropdown: true,
    children: [
      {
        key: 'lab_technicians',
        label: 'Lab Tech Dashboard',
        icon: ChartBarIcon
      },
      {
        key: 'lab_tech_module',
        label: 'Lab Tech Module',
        icon: ClipboardDocumentListIcon
      },

    ]
  },
  {
    key: 'pharmacist',
    label: 'Pharmacists',
    icon: BuildingOffice2Icon,
    hasDropdown: true,
    children: [
      {
        key: 'pharmacist_dashboard',
        label: 'Pharmacist Dashboard',
        icon: ChartBarIcon
      },
      {
        key: 'pharmacist_module',
        label: 'Pharmacist Module',
        icon: ClipboardDocumentListIcon
      },

    ]
  },
  {
    key: 'organization',
    label: 'Organization',
    icon: BuildingOffice2Icon
  }
];

export const getSuperAdminSidebarItems = (counts?: { 
  organizations?: number; 
  totalUsers?: number; 
}): SidebarItem[] => [
  {
    key: 'overview',
    label: 'Platform Overview',
    icon: ChartBarIcon
  },
  {
    key: 'organizations',
    label: 'Organizations',
    icon: BuildingOffice2Icon,
    count: counts?.organizations
  },
  {
    key: 'create_organization',
    label: 'Create Organization',
    icon: PlusCircleIcon
  }
];

// Role-specific feature configurations
export const getReceptionFeatures = (): SidebarSubItem[] => [
  { key: 'patient_registration', label: 'Patient Registration' },
  { key: 'triage_management', label: 'Triage Management' },
  { key: 'queue_management', label: 'Queue Management' },
  { key: 'appointment_scheduling', label: 'Appointment Scheduling' },
  { key: 'visit_recording', label: 'Visit Recording' }
];

export const getDoctorFeatures = (): SidebarSubItem[] => [
  { key: 'patient_consultations', label: 'Patient Consultations' },
  { key: 'medical_records', label: 'Medical Records' },
  { key: 'diagnosis_management', label: 'Diagnosis Management' },
  { key: 'lab_test_orders', label: 'Lab Test Orders' },
  { key: 'prescription_writing', label: 'Prescription Writing' },
  { key: 'patient_queue', label: 'Patient Queue' }
];

export const getLabTechFeatures = (): SidebarSubItem[] => [
  { key: 'test_management', label: 'Test Management' },
  { key: 'sample_processing', label: 'Sample Processing' },
  { key: 'result_entry', label: 'Result Entry' },
  { key: 'quality_control', label: 'Quality Control' },
  { key: 'equipment_maintenance', label: 'Equipment Maintenance' }
];

export const getPharmacistFeatures = (): SidebarSubItem[] => [
  { key: 'prescription_management', label: 'Prescription Management' },
  { key: 'inventory_management', label: 'Inventory Management' },
  { key: 'drug_dispensing', label: 'Drug Dispensing' },
  { key: 'stock_monitoring', label: 'Stock Monitoring' },
  { key: 'supplier_management', label: 'Supplier Management' },
  { key: 'expiry_tracking', label: 'Expiry Tracking' }
];

// Enhanced admin sidebar items with nested features
export const getEnhancedAdminSidebarItems = (counts?: { 
  users?: number; 
  doctors?: number; 
  receptionists?: number; 
  labTechs?: number; 
}): SidebarItem[] => [
  {
    key: 'overview',
    label: 'Dashboard Overview',
    icon: HomeIcon
  },
  {
    key: 'users',
    label: 'All Users',
    icon: UsersIcon,
    count: counts?.users
  },
  // Reception - First in order
  {
    key: 'receptionist',
    label: 'Reception',
    icon: UserGroupIcon,
    count: counts?.receptionists,
    hasDropdown: true,
    children: [
      {
        key: 'receptionists',
        label: 'Reception Dashboard',
        icon: ChartBarIcon
      },
      {
        key: 'receptionist_module',
        label: 'Reception Module',
        icon: ClipboardDocumentListIcon
      },
      // Reception Features
      {
        key: 'patient_registration',
        label: 'Patient Registration',
        icon: UserGroupIcon
      },
      {
        key: 'triage_management',
        label: 'Triage Management',
        icon: ClipboardDocumentListIcon
      },
      {
        key: 'queue_management',
        label: 'Queue Management',
        icon: ChartBarIcon
      },
      {
        key: 'appointment_scheduling',
        label: 'Appointment Scheduling',
        icon: ClipboardDocumentListIcon
      },
      {
        key: 'visit_recording',
        label: 'Visit Recording',
        icon: ClipboardDocumentListIcon
      }
    ]
  },
  // Doctor - Second in order
  {
    key: 'doctor',
    label: 'Doctors',
    icon: UserIcon,
    count: counts?.doctors,
    hasDropdown: true,
    children: [
      {
        key: 'doctors',
        label: 'Doctors Dashboard',
        icon: ChartBarIcon
      },
      {
        key: 'doctor_module',
        label: 'Doctor Module',
        icon: ClipboardDocumentListIcon
      },
      // Doctor Features
      {
        key: 'patient_consultations',
        label: 'Patient Consultations',
        icon: UserIcon
      },
      {
        key: 'medical_records',
        label: 'Medical Records',
        icon: ClipboardDocumentListIcon
      },
      {
        key: 'diagnosis_management',
        label: 'Diagnosis Management',
        icon: ClipboardDocumentListIcon
      },
      {
        key: 'lab_test_orders',
        label: 'Lab Test Orders',
        icon: BeakerIcon
      },
      {
        key: 'prescription_writing',
        label: 'Prescription Writing',
        icon: ClipboardDocumentListIcon
      },
      {
        key: 'patient_queue',
        label: 'Patient Queue',
        icon: ChartBarIcon
      }
    ]
  },
  // Lab - Third in order
  {
    key: 'lab_technician',
    label: 'Lab Technicians',
    icon: BeakerIcon,
    count: counts?.labTechs,
    hasDropdown: true,
    children: [
      {
        key: 'lab_technicians',
        label: 'Lab Tech Dashboard',
        icon: ChartBarIcon
      },
      {
        key: 'lab_tech_module',
        label: 'Lab Tech Module',
        icon: ClipboardDocumentListIcon
      },
      // Lab Tech Features
      {
        key: 'test_management',
        label: 'Test Management',
        icon: BeakerIcon
      },
      {
        key: 'sample_processing',
        label: 'Sample Processing',
        icon: BeakerIcon
      },
      {
        key: 'result_entry',
        label: 'Result Entry',
        icon: ClipboardDocumentListIcon
      },
      {
        key: 'quality_control',
        label: 'Quality Control',
        icon: ChartBarIcon
      },
      {
        key: 'equipment_maintenance',
        label: 'Equipment Maintenance',
        icon: CogIcon
      }
    ]
  },
  // Pharmacist - Fourth in order
  {
    key: 'pharmacist',
    label: 'Pharmacists',
    icon: BuildingOffice2Icon,
    hasDropdown: true,
    children: [
      {
        key: 'pharmacist_dashboard',
        label: 'Pharmacist Dashboard',
        icon: ChartBarIcon
      },
      {
        key: 'pharmacist_module',
        label: 'Pharmacist Module',
        icon: ClipboardDocumentListIcon
      },
      // Pharmacist Features
      {
        key: 'prescription_management',
        label: 'Prescription Management',
        icon: ClipboardDocumentListIcon
      },
      {
        key: 'inventory_management',
        label: 'Inventory Management',
        icon: ChartBarIcon
      },
      {
        key: 'drug_dispensing',
        label: 'Drug Dispensing',
        icon: BuildingOffice2Icon
      },
      {
        key: 'stock_monitoring',
        label: 'Stock Monitoring',
        icon: ChartBarIcon
      },
      {
        key: 'supplier_management',
        label: 'Supplier Management',
        icon: UserGroupIcon
      },
      {
        key: 'expiry_tracking',
        label: 'Expiry Tracking',
        icon: ClipboardDocumentListIcon
      }
    ]
  },
  {
    key: 'organization',
    label: 'Organization',
    icon: BuildingOffice2Icon
  }
];