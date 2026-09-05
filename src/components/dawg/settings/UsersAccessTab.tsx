'use client';

import React, { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Mail, 
  Lock, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Key, 
  Shield, 
  UserCheck, 
  RefreshCw,
  Search,
  Sliders,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Salon Manager' | 'Operations Admin' | 'Billing Specialist';
  avatarInitials: string;
  avatarBg: string;
  twoFactorEnabled: boolean;
  status: 'Active' | 'Invited' | 'Suspended';
  lastActive: string;
}

interface RolePermissionItem {
  id: string;
  category: string;
  label: string;
  description: string;
  superAdmin: boolean;
  manager: boolean;
  groomer: boolean;
  receptionist: boolean;
}

const INITIAL_ADMINS: AdminUser[] = [
  {
    id: 'adm-1',
    name: 'Admin User (You)',
    email: 'allaboutpawz901@gmail.com',
    role: 'Super Admin',
    avatarInitials: 'AD',
    avatarBg: 'bg-indigo-600 text-white',
    twoFactorEnabled: true,
    status: 'Active',
    lastActive: 'Just now',
  },
  {
    id: 'adm-2',
    name: 'Sarah Mitchell',
    email: 'sarah.m@allaboutthedawg.com',
    role: 'Salon Manager',
    avatarInitials: 'SM',
    avatarBg: 'bg-purple-600 text-white',
    twoFactorEnabled: true,
    status: 'Active',
    lastActive: '24 mins ago',
  },
  {
    id: 'adm-3',
    name: 'Marcus Vance',
    email: 'marcus.v@allaboutthedawg.com',
    role: 'Operations Admin',
    avatarInitials: 'MV',
    avatarBg: 'bg-emerald-600 text-white',
    twoFactorEnabled: false,
    status: 'Active',
    lastActive: 'Yesterday at 4:15 PM',
  },
  {
    id: 'adm-4',
    name: 'Elena Rostova',
    email: 'elena.billing@allaboutthedawg.com',
    role: 'Billing Specialist',
    avatarInitials: 'ER',
    avatarBg: 'bg-amber-600 text-white',
    twoFactorEnabled: true,
    status: 'Active',
    lastActive: '3 days ago',
  },
  {
    id: 'adm-5',
    name: 'Jordan Hayes',
    email: 'jordan.h@allaboutthedawg.com',
    role: 'Salon Manager',
    avatarInitials: 'JH',
    avatarBg: 'bg-blue-600 text-white',
    twoFactorEnabled: false,
    status: 'Invited',
    lastActive: 'Pending Acceptance',
  },
];

const INITIAL_PERMISSIONS: RolePermissionItem[] = [
  {
    id: 'perm-1',
    category: 'Administration & System',
    label: 'Modify System & Salon Settings',
    description: 'Change business identity, locations, taxes, and system configs',
    superAdmin: true,
    manager: true,
    groomer: false,
    receptionist: false,
  },
  {
    id: 'perm-2',
    category: 'Administration & System',
    label: 'Manage Admin Users & Roles',
    description: 'Create, edit, suspend admin accounts and adjust access levels',
    superAdmin: true,
    manager: false,
    groomer: false,
    receptionist: false,
  },
  {
    id: 'perm-3',
    category: 'Financial & Payments',
    label: 'View Revenue & Financial Analytics',
    description: 'Access P&L reports, ledger, daily takings, and profit metrics',
    superAdmin: true,
    manager: true,
    groomer: false,
    receptionist: false,
  },
  {
    id: 'perm-4',
    category: 'Financial & Payments',
    label: 'Issue Refunds & Manual Voids',
    description: 'Process credit card refunds and invoice cancellations',
    superAdmin: true,
    manager: true,
    groomer: false,
    receptionist: false,
  },
  {
    id: 'perm-5',
    category: 'Operations & Appointments',
    label: 'Override Booking Schedule & Pricing',
    description: 'Book over blackout slots and apply manual custom discounts',
    superAdmin: true,
    manager: true,
    groomer: false,
    receptionist: true,
  },
  {
    id: 'perm-6',
    category: 'Client & Pet Data',
    label: 'Export Client & Dog Database',
    description: 'Download CSV spreadsheets of customer contact info and records',
    superAdmin: true,
    manager: false,
    groomer: false,
    receptionist: false,
  },
  {
    id: 'perm-7',
    category: 'Client & Pet Data',
    label: 'Delete Customers or Health Records',
    description: 'Permanently remove customer, vaccination, or pet files',
    superAdmin: true,
    manager: false,
    groomer: false,
    receptionist: false,
  },
];

export const UsersAccessTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'admins' | 'roles' | 'portal' | 'invitations'>('admins');
  const [admins, setAdmins] = useState<AdminUser[]>(INITIAL_ADMINS);
  const [permissions, setPermissions] = useState<RolePermissionItem[]>(INITIAL_PERMISSIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  // New Admin Form State
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AdminUser['role']>('Salon Manager');
  const [require2FA, setRequire2FA] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    const newAdmin: AdminUser = {
      id: `adm-${Date.now()}`,
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      avatarInitials: inviteName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase(),
      avatarBg: 'bg-indigo-600 text-white',
      twoFactorEnabled: require2FA,
      status: 'Invited',
      lastActive: 'Invitation Sent',
    };

    setAdmins((prev) => [newAdmin, ...prev]);
    setIsInviteModalOpen(false);
    setInviteName('');
    setInviteEmail('');
    setSuccessMsg(`Invitation sent to ${inviteEmail}!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleToggleAdminStatus = (id: string) => {
    setAdmins((prev) =>
      prev.map((adm) => {
        if (adm.id === id) {
          const nextStatus = adm.status === 'Active' ? 'Suspended' : 'Active';
          return { ...adm, status: nextStatus };
        }
        return adm;
      })
    );
  };

  const handleDeleteAdmin = (id: string) => {
    if (confirm('Are you sure you want to remove this admin user?')) {
      setAdmins((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleTogglePermission = (
    permId: string,
    roleKey: 'superAdmin' | 'manager' | 'groomer' | 'receptionist'
  ) => {
    if (roleKey === 'superAdmin') return; // Super admin always has full privileges
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.id === permId) {
          return { ...p, [roleKey]: !p[roleKey] };
        }
        return p;
      })
    );
  };

  const filteredAdmins = admins.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Banner / Tab Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Admin Users &amp; Security Control</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Users, Access &amp; Permissions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidated management of system administrators, staff privileges, role access matrices, and client logins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Invite Admin User</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-medium">
        <button
          onClick={() => setSubTab('admins')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 cursor-pointer ${
            subTab === 'admins'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Admin Users ({admins.length})</span>
        </button>

        <button
          onClick={() => setSubTab('roles')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 cursor-pointer ${
            subTab === 'roles'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Roles &amp; Permissions Matrix</span>
        </button>

        <button
          onClick={() => setSubTab('portal')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 cursor-pointer ${
            subTab === 'portal'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Customer Portal Accounts</span>
        </button>

        <button
          onClick={() => setSubTab('invitations')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 cursor-pointer ${
            subTab === 'invitations'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Pending Invitations</span>
        </button>
      </div>

      {/* SUB-TAB 1: Admin Users Table */}
      {subTab === 'admins' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Table Header Filter */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search admin users by name, email, or role..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium">Total Admin Seats:</span>
              <span className="font-bold text-slate-800">{admins.length} / 10 Active</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">2FA Security</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Active</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmins.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full ${user.avatarBg} font-bold text-xs flex items-center justify-center shrink-0`}
                        >
                          {user.avatarInitials}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{user.name}</p>
                          <p className="text-[11px] text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          user.role === 'Super Admin'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : user.role === 'Salon Manager'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : user.role === 'Operations Admin'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {user.twoFactorEnabled ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Enabled</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 text-[11px]">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Not set up</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : user.status === 'Invited'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {user.lastActive}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleAdminStatus(user.id)}
                          className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                            user.status === 'Active'
                              ? 'text-slate-600 hover:bg-slate-100'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          {user.status === 'Active' ? 'Suspend' : 'Activate'}
                        </button>

                        {user.id !== 'adm-1' && (
                          <button
                            onClick={() => handleDeleteAdmin(user.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove Admin User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Roles & Permissions Matrix */}
      {subTab === 'roles' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Granular Role Permissions Matrix</h3>
            <p className="text-xs text-slate-500 mb-4">
              Control what actions staff members and salon administrators can perform across the system.
            </p>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="py-3 px-4 w-2/5">Permission Capability</th>
                    <th className="py-3 px-3 text-center">Super Admin</th>
                    <th className="py-3 px-3 text-center">Salon Manager</th>
                    <th className="py-3 px-3 text-center">Groomer / Stylist</th>
                    <th className="py-3 px-3 text-center">Front Desk / Reception</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {permissions.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800 leading-tight">{p.label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{p.description}</p>
                      </td>

                      {/* Super Admin */}
                      <td className="py-3 px-3 text-center">
                        <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 font-bold inline-flex items-center justify-center mx-auto">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      </td>

                      {/* Manager */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleTogglePermission(p.id, 'manager')}
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center transition-colors cursor-pointer ${
                            p.manager
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {p.manager ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* Groomer */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleTogglePermission(p.id, 'groomer')}
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center transition-colors cursor-pointer ${
                            p.groomer
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {p.groomer ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* Receptionist */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleTogglePermission(p.id, 'receptionist')}
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center transition-colors cursor-pointer ${
                            p.receptionist
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {p.receptionist ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Customer Portal Accounts */}
      {subTab === 'portal' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Customer Portal Login Security</h3>
              <p className="text-xs text-slate-500">Configure client account registration and self-service security settings.</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
              142 Registered Pet Parents
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <p className="font-bold text-slate-800">Phone SMS OTP Login</p>
              <p className="text-slate-500 text-[11px]">
                Clients log in instantly using SMS one-time verification codes sent to their registered phone number.
              </p>
              <span className="inline-block font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                Active (Recommended)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <p className="font-bold text-slate-800">Vaccine Verification Wall</p>
              <p className="text-slate-500 text-[11px]">
                Require clients to upload Rabies and DHPP proof before booking appointments in the portal.
              </p>
              <span className="inline-block font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
                Enforced
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Pending Invitations */}
      {subTab === 'invitations' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pending Admin Invitations</h3>
              <p className="text-xs text-slate-500">Invitations sent to team members that have not yet been accepted.</p>
            </div>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              + Send New Invite
            </button>
          </div>

          <div className="space-y-3">
            {admins
              .filter((a) => a.status === 'Invited')
              .map((inv) => (
                <div
                  key={inv.id}
                  className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs bg-slate-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                      {inv.avatarInitials}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{inv.name}</p>
                      <p className="text-slate-500 text-[11px]">{inv.email} · {inv.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alert(`Re-sent invitation email to ${inv.email}`)}
                      className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-[11px] font-semibold text-indigo-600 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Resend</span>
                    </button>
                    <button
                      onClick={() => handleDeleteAdmin(inv.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Modal: Invite Admin User */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Invite New Administrator</h3>
                  <p className="text-[11px] text-slate-500">Add an administrator to All About the Dawg OS</p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Jordan Hayes"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. jordan.h@allaboutthedawg.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Super Admin">Super Admin (Full System Privileges)</option>
                  <option value="Salon Manager">Salon Manager (Operations &amp; Staff Lead)</option>
                  <option value="Operations Admin">Operations Admin (Appointments &amp; Schedules)</option>
                  <option value="Billing Specialist">Billing Specialist (Invoices &amp; Payments)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 text-xs">Enforce Two-Factor Authentication</p>
                  <p className="text-slate-400 text-[10px]">Require 2FA code during first sign-in</p>
                </div>
                <input
                  type="checkbox"
                  checked={require2FA}
                  onChange={(e) => setRequire2FA(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer shadow-xs"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
