'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, Shield, Plus, Trash2, Edit2, Lock, Check, X,
  Key, Mail, Phone, UserCircle, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminUser {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  twoFactorEnabled: boolean;
  status: string;
  lastActive: string;
  avatarInitials: string;
  scope: string;
}

interface RoleDef {
  id: string;
  role_key: string;
  label: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  can_sign_off: boolean;
  signoff_max_level: number;
}

interface PermissionModule {
  code: string;
  label: string;
  module: string;
}

interface ScreenProps {
  onNavigateScreen?: (screenId: string) => void;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
}

export const UsersStaffRolesScreen: React.FC<ScreenProps> = ({
  onNavigateScreen,
  selectedLocation = 'All Locations',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'permissions' | 'roles' | 'invitations'>('users');
  const [permissionModules, setPermissionModules] = useState<PermissionModule[]>([]);
  const [userPermissions, setUserPermissions] = useState<Record<string, string>>({});
  const [selectedPermissionUser, setSelectedPermissionUser] = useState<AdminUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Create user form state
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('staff');
  const [newPhone, setNewPhone] = useState('');
  const [newScope, setNewScope] = useState('employee');
  const [enforce2FA, setEnforce2FA] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch users + roles from live API
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/users');
        if (res.ok) {
          const data = await res.json();
          setUsers([...(data.admins || []), ...(data.staff || []), ...(data.customers || [])]);
          setRoles(data.roles || []);
        }
        // Also fetch permission modules
        const permRes = await fetch('/api/admin/permissions');
        if (permRes.ok) {
          const permData = await permRes.json();
          setPermissionModules(permData.modules || []);
        }
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Fetch per-user permissions when a user is selected
  const fetchUserPermissions = async (user: AdminUser) => {
    setSelectedPermissionUser(user);
    try {
      const res = await fetch(`/api/admin/permissions?userId=${user.userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserPermissions(data.userPermissions || {});
      }
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
  };

  // Toggle a module permission for the selected user
  const togglePermission = async (moduleCode: string, level: 'view' | 'edit' | 'none') => {
    if (!selectedPermissionUser) return;
    const newLevel = userPermissions[moduleCode] === level ? 'none' : level;
    setUserPermissions(prev => {
      const next = { ...prev };
      if (newLevel === 'none') delete next[moduleCode];
      else next[moduleCode] = newLevel;
      return next;
    });
    try {
      await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedPermissionUser.userId, moduleCode, accessLevel: newLevel }),
      });
    } catch (err) {
      console.error('Failed to update permission:', err);
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newRole) {
      showToast('Email and Role are required');
      return;
    }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          role: newRole,
          scope: newScope,
          phone: newPhone,
          enforce2FA,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`User ${newEmail} provisioned as ${newRole}`);
        // Refresh users
        const refreshRes = await fetch('/api/admin/users');
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setUsers([...(refreshData.admins || []), ...(refreshData.staff || []), ...(refreshData.customers || [])]);
        }
        setShowCreateForm(false);
        setNewEmail('');
        setNewName('');
        setNewPhone('');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to create user');
      }
    } catch (err) {
      showToast('Network error');
    }
  };

  const handleUpdateUser = async (userId: string, updates: { role?: string; status?: string }) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates }),
      });
      if (res.ok) {
        showToast('User updated');
        setUsers(prev => prev.map(u => u.userId === userId ? { ...u, ...updates } : u));
      }
    } catch (err) {
      showToast('Update failed');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Revoke access for this user?')) return;
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Access revoked');
        setUsers(prev => prev.filter(u => u.userId !== userId));
      }
    } catch (err) {
      showToast('Delete failed');
    }
  };

  const roleLabels: Record<string, string> = {
    owner: 'Super Admin / Owner',
    admin: 'Salon Manager',
    manager: 'Salon Manager',
    groomer: 'Groomer / Stylist',
    front_desk: 'Front Desk / Reception',
    staff: 'Staff',
    customer: 'Customer',
  };

  return (
    <div className="p-6 space-y-6 font-bar">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-card text-foreground border border-border rounded-md shadow-popover px-4 py-2.5 text-[13px] font-medium">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Users & Access</h2>
          <p className="text-[13px] text-muted-foreground mt-1">Manage team members, assign roles, and control portal access.</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3.5 text-[13px] font-medium shadow-card transition-colors cursor-pointer"
        >
          <Plus className="size-4" />
          Add Team Member
        </button>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="bg-card border border-border rounded-xl shadow-card p-5 space-y-4">
          <h3 className="text-[15px] font-semibold text-foreground">Provision New User</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="text-[12px] font-medium text-muted-foreground block mb-1">Full Name</label>
              <div className="relative">
                <UserCircle className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full pl-9 pr-3 h-9 bg-background border border-input rounded-md text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            {/* Email */}
            <div>
              <label className="text-[12px] font-medium text-muted-foreground block mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="jane@allaboutpawz.com"
                  className="w-full pl-9 pr-3 h-9 bg-background border border-input rounded-md text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            {/* Phone */}
            <div>
              <label className="text-[12px] font-medium text-muted-foreground block mb-1">Phone</label>
              <div className="relative">
                <Phone className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="(214) 555-0000"
                  className="w-full pl-9 pr-3 h-9 bg-background border border-input rounded-md text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            {/* Role */}
            <div>
              <label className="text-[12px] font-medium text-muted-foreground block mb-1">Assigned Role *</label>
              <div className="relative">
                <Shield className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full pl-9 pr-8 h-9 bg-background border border-input rounded-md text-[13px] text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                >
                  <option value="owner">Super Admin / Owner</option>
                  <option value="admin">Salon Manager</option>
                  <option value="groomer">Groomer / Stylist</option>
                  <option value="front_desk">Front Desk / Reception</option>
                  <option value="staff">Staff</option>
                  <option value="customer">Customer Portal</option>
                </select>
                <ChevronDown className="size-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            {/* Scope */}
            <div>
              <label className="text-[12px] font-medium text-muted-foreground block mb-1">Portal Scope</label>
              <div className="relative">
                <Users className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={newScope}
                  onChange={(e) => setNewScope(e.target.value)}
                  className="w-full pl-9 pr-8 h-9 bg-background border border-input rounded-md text-[13px] text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                >
                  <option value="admin">Admin Portal</option>
                  <option value="employee">Employee / Groomer Portal</option>
                  <option value="customer">Customer Portal</option>
                </select>
                <ChevronDown className="size-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            {/* 2FA */}
            <div className="flex items-center gap-2 pt-6">
              <button
                type="button"
                onClick={() => setEnforce2FA(!enforce2FA)}
                className={cn(
                  'inline-flex items-center gap-2 h-9 px-3 rounded-md border text-[13px] font-medium cursor-pointer transition-colors',
                  enforce2FA
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'border-border text-muted-foreground hover:bg-accent'
                )}
              >
                <Lock className="size-4" />
                {enforce2FA ? '2FA Required' : '2FA Optional'}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowCreateForm(false)}
              className="inline-flex items-center h-9 px-3.5 rounded-md border border-border bg-background hover:bg-accent text-foreground text-[13px] font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateUser}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-[13px] font-medium shadow-card cursor-pointer"
            >
              <Plus className="size-4" />
              Create User
            </button>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {([
          { id: 'users', label: 'Users' },
          { id: 'permissions', label: 'Module Access' },
          { id: 'roles', label: 'Roles & Permissions' },
          { id: 'invitations', label: 'Pending Invitations' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              'px-4 py-2 text-[13px] font-medium transition-colors cursor-pointer border-b-2 -mb-px',
              activeSubTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {activeSubTab === 'users' && (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-[13px]">Loading users from database...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-[13px]">No users found. Click "Add Team Member" to create one.</div>
          ) : (
            <table className="w-full text-left text-[13px] text-foreground">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="p-3 font-semibold">User</th>
                  <th className="p-3 font-semibold">Email</th>
                  <th className="p-3 font-semibold">Assigned Role</th>
                  <th className="p-3 font-semibold">2FA</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Last Active</th>
                  <th className="p-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id + user.userId} className="hover:bg-accent/50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[11px] font-semibold">
                          {user.avatarInitials}
                        </div>
                        <span className="font-medium text-foreground">{user.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{user.email}</td>
                    <td className="p-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateUser(user.userId, { role: e.target.value })}
                        className="bg-background border border-input rounded-md h-7 px-2 text-[12px] text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="owner">Super Admin</option>
                        <option value="admin">Salon Manager</option>
                        <option value="groomer">Groomer</option>
                        <option value="front_desk">Front Desk</option>
                        <option value="staff">Staff</option>
                        <option value="customer">Customer</option>
                      </select>
                    </td>
                    <td className="p-3">
                      {user.twoFactorEnabled ? (
                        <span className="inline-flex items-center gap-1 text-success text-[12px] font-medium">
                          <Check className="size-3.5" /> Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground text-[12px]">
                          <X className="size-3.5" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={cn(
                        'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase',
                        user.status === 'Active' ? 'bg-success/10 text-success border-success/20' :
                        user.status === 'Invited' ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-muted text-muted-foreground border-border'
                      )}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground text-[12px] tabular-nums">{user.lastActive}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteUser(user.userId)}
                        className="inline-flex items-center justify-center size-7 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                        title="Revoke Access"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Module Access (per-user permission checklist) */}
      {activeSubTab === 'permissions' && (
        <div className="space-y-4">
          {/* User selector */}
          <div className="bg-card border border-border rounded-xl shadow-card p-5">
            <h3 className="text-[15px] font-semibold text-foreground mb-3">Select User to Configure Module Access</h3>
            <div className="flex flex-wrap gap-2">
              {users.filter(u => u.scope !== 'customer').map((user) => (
                <button
                  key={user.userId}
                  onClick={() => fetchUserPermissions(user)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md border px-3 h-8 text-[12px] font-medium cursor-pointer transition-colors',
                    selectedPermissionUser?.userId === user.userId
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <span className="size-5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[9px] font-semibold">{user.avatarInitials}</span>
                  {user.name}
                </button>
              ))}
            </div>
          </div>

          {/* Permission checklist */}
          {selectedPermissionUser && (
            <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
              <div className="bg-muted/40 border-b border-border px-4 py-2.5">
                <span className="text-[13px] font-medium text-foreground">Module Access for {selectedPermissionUser.name}</span>
                <span className="text-[11px] text-muted-foreground ml-2">({selectedPermissionUser.role})</span>
              </div>
              <table className="w-full text-left text-[13px] text-foreground">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="p-3 font-semibold">Module</th>
                    <th className="p-3 text-center font-semibold">View</th>
                    <th className="p-3 text-center font-semibold">Edit</th>
                    <th className="p-3 text-center font-semibold">No Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(['CRM', 'ORDERS', 'ACCOUNTING', 'SYSTEM'].map(group => ({
                    group,
                    items: permissionModules.filter(m => m.module === group)
                  }))).map(({ group, items }) => (
                    <>
                      <tr key={group} className="bg-muted/20">
                        <td colSpan={4} className="p-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</td>
                      </tr>
                      {items.map((mod) => {
                        const current = userPermissions[mod.code] || 'none';
                        return (
                          <tr key={mod.code} className="hover:bg-accent/50 transition-colors">
                            <td className="p-3 font-medium text-foreground">{mod.label}</td>
                            <td className="p-3 text-center">
                              <input type="radio" name={mod.code} checked={current === 'view'} onChange={() => togglePermission(mod.code, 'view')} className="size-4 cursor-pointer accent-primary" />
                            </td>
                            <td className="p-3 text-center">
                              <input type="radio" name={mod.code} checked={current === 'edit'} onChange={() => togglePermission(mod.code, 'edit')} className="size-4 cursor-pointer accent-primary" />
                            </td>
                            <td className="p-3 text-center">
                              <input type="radio" name={mod.code} checked={current === 'none'} onChange={() => togglePermission(mod.code, 'none')} className="size-4 cursor-pointer accent-muted-foreground" />
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!selectedPermissionUser && (
            <div className="bg-card border border-border rounded-xl shadow-card p-8 text-center">
              <p className="text-[13px] text-muted-foreground">Select a user above to configure their module access.</p>
            </div>
          )}
        </div>
      )}

      {/* Roles & Permissions tab */}
      {activeSubTab === 'roles' && (
        <div className="space-y-4">
          {roles.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-[13px]">No role definitions found in database.</div>
          ) : (
            roles.map((role) => (
              <div key={role.id} className="bg-card border border-border rounded-xl shadow-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-[15px] font-semibold text-foreground">{role.label}</h3>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{role.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {role.is_system && (
                      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border uppercase">System</span>
                    )}
                    {role.can_sign_off && (
                      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase">Can Sign Off</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions?.map((perm, idx) => (
                    <span key={idx} className="inline-flex items-center text-[11px] font-medium px-2 py-1 rounded-md bg-muted/40 text-muted-foreground border border-border">
                      <Shield className="size-3 mr-1" />
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Invitations tab */}
      {activeSubTab === 'invitations' && (
        <div className="bg-card border border-border rounded-xl shadow-card p-8 text-center">
          <p className="text-[13px] text-muted-foreground">No pending invitations.</p>
        </div>
      )}
    </div>
  );
};
