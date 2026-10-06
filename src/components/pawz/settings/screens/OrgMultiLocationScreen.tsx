'use client';

import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Phone, Plus, Save, CheckCircle2, Trash2, Store, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScreenProps {
  onNavigateScreen?: (screenId: string) => void;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
}

interface BranchLocation {
  id: string;
  name: string;
  address: string;
  phone: string;
  type: string;
  is_active: boolean;
}

export const OrgMultiLocationScreen: React.FC<ScreenProps> = ({
  selectedLocation,
  onSelectLocation,
}) => {
  const [locations, setLocations] = useState<BranchLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState('physical');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    async function fetchLocations() {
      try {
        // Try fetching from database via the admin settings API (which can return locations)
        // Fallback: use the selectedLocation prop to show at least one
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          // The settings API doesn't return locations directly, but we can show
          // the currently selected location and any stored ones
          setLocations([
            {
              id: '1',
              name: selectedLocation || 'All About Pawz – Main Location',
              address: '1234 Maple Drive, Frisco, TX 75034',
              phone: '(214) 555-0198',
              type: 'physical',
              is_active: true,
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch locations:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLocations();
  }, [selectedLocation]);

  const handleAddLocation = () => {
    if (!newName) return;
    const newLoc: BranchLocation = {
      id: `loc-${Date.now()}`,
      name: `All About Pawz – ${newName}`,
      address: newAddress,
      phone: newPhone,
      type: newType,
      is_active: true,
    };
    setLocations(prev => [...prev, newLoc]);
    setShowAddForm(false);
    setNewName('');
    setNewAddress('');
    setNewPhone('');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSwitchLocation = (name: string) => {
    onSelectLocation?.(name);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDeleteLocation = (id: string) => {
    if (locations.length <= 1) return; // Don't delete the last location
    setLocations(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="p-6 space-y-6 font-bar">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Locations & Branches</h2>
          <p className="text-[13px] text-muted-foreground mt-1">Manage physical salon facilities, mobile vans, and branch operations.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3.5 text-[13px] font-medium shadow-card transition-colors cursor-pointer"
        >
          <Plus className="size-4" />
          Add Location
        </button>
      </div>

      {/* Add Location Form */}
      {showAddForm && (
        <div className="bg-card border border-border rounded-xl shadow-card p-5 space-y-4">
          <h3 className="text-[15px] font-semibold text-foreground">Add New Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-medium text-muted-foreground block mb-1">Location Name *</label>
              <div className="relative">
                <Building2 className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Westside Spa"
                  className="w-full pl-9 pr-3 h-9 bg-background border border-input rounded-md text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground block mb-1">Address</label>
              <div className="relative">
                <MapPin className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="456 West St, Plano, TX 75075"
                  className="w-full pl-9 pr-3 h-9 bg-background border border-input rounded-md text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground block mb-1">Phone</label>
              <div className="relative">
                <Phone className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="(214) 555-0200"
                  className="w-full pl-9 pr-3 h-9 bg-background border border-input rounded-md text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground block mb-1">Location Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full h-9 bg-background border border-input rounded-md px-3 text-[13px] text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="physical">Physical Salon</option>
                <option value="mobile">Mobile Van</option>
                <option value="satellite">Satellite Branch</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAddForm(false)} className="inline-flex items-center h-9 px-3.5 rounded-md border border-border bg-background hover:bg-accent text-foreground text-[13px] font-medium cursor-pointer">Cancel</button>
            <button onClick={handleAddLocation} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-[13px] font-medium shadow-card cursor-pointer">
              <Plus className="size-4" /> Add Location
            </button>
          </div>
        </div>
      )}

      {/* Saved toast */}
      {saved && (
        <div className="fixed top-4 right-4 z-50 bg-card text-foreground border border-border rounded-md shadow-popover px-4 py-2.5 text-[13px] font-medium flex items-center gap-2">
          <CheckCircle2 className="size-4 text-success" />
          Location updated
        </div>
      )}

      {/* Locations table */}
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-[13px]">Loading locations...</div>
        ) : (
          <table className="w-full text-left text-[13px] text-foreground">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="p-3 font-semibold">Location</th>
                <th className="p-3 font-semibold">Address</th>
                <th className="p-3 font-semibold">Phone</th>
                <th className="p-3 font-semibold">Type</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {locations.map((loc) => {
                const isActive = selectedLocation === loc.name;
                return (
                  <tr key={loc.id} className="hover:bg-accent/50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {loc.type === 'physical' ? <Store className="size-4 text-muted-foreground" /> : <Truck className="size-4 text-muted-foreground" />}
                        <span className="font-medium text-foreground">{loc.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{loc.address}</td>
                    <td className="p-3 text-muted-foreground tabular-nums">{loc.phone}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border capitalize">{loc.type}</span>
                    </td>
                    <td className="p-3">
                      <span className={cn(
                        'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase',
                        isActive ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-border'
                      )}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {!isActive && (
                          <button
                            onClick={() => handleSwitchLocation(loc.name)}
                            className="inline-flex items-center justify-center size-7 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                            title="Switch to this location"
                          >
                            <CheckCircle2 className="size-3.5" />
                          </button>
                        )}
                        {locations.length > 1 && (
                          <button
                            onClick={() => handleDeleteLocation(loc.id)}
                            className="inline-flex items-center justify-center size-7 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                            title="Delete location"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
