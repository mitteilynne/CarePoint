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
  XMarkIcon
} from '@heroicons/react/24/outline';

export interface SidebarItem {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  count?: number;
  badge?: string;
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
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {items.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onViewChange(item.key);
                  setIsMobileMenuOpen(false); // Close mobile menu on selection
                }}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  currentView === item.key
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <IconComponent className="mr-3 h-5 w-5 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.count !== undefined && (
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    currentView === item.key 
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
              </button>
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
    key: 'doctors',
    label: 'Doctors',
    icon: UserIcon,
    count: counts?.doctors
  },
  {
    key: 'receptionists',
    label: 'Receptionists',
    icon: UserGroupIcon,
    count: counts?.receptionists
  },
  {
    key: 'lab_technicians',
    label: 'Lab Technicians',
    icon: BeakerIcon,
    count: counts?.labTechs
  },
  {
    key: 'organization',
    label: 'Organization',
    icon: BuildingOffice2Icon
  },
  {
    key: 'doctor_module',
    label: 'Doctor Module',
    icon: ClipboardDocumentListIcon
  },
  {
    key: 'receptionist_module',
    label: 'Reception Module',
    icon: UserGroupIcon
  },
  {
    key: 'lab_tech_module',
    label: 'Lab Tech Module',
    icon: BeakerIcon
  },
  {
    key: 'pharmacist_module',
    label: 'Pharmacy Module',
    icon: UserIcon
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