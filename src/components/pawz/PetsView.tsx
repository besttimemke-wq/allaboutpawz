'use client';

import React, { useState } from 'react';
import { PetRecord } from '@/lib/types';
import { Plus, User, Calendar, Search, PawPrint } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PetsViewProps {
  pets: PetRecord[];
  onAddPet: () => void;
}

export const PetsView: React.FC<PetsViewProps> = ({ pets, onAddPet }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [vaccinationFilter, setVaccinationFilter] = useState('all');

  const filteredPets = pets.filter((pet) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      pet.name.toLowerCase().includes(q) ||
      pet.breed.toLowerCase().includes(q) ||
      pet.ownerName.toLowerCase().includes(q);
    const matchesVax =
      vaccinationFilter === 'all' ||
      (vaccinationFilter === 'uptodate' && pet.vaccinationStatus === 'Up to date') ||
      (vaccinationFilter === 'due' && pet.vaccinationStatus !== 'Up to date');
    return matchesSearch && matchesVax;
  });

  const upToDateCount = pets.filter((p) => p.vaccinationStatus === 'Up to date').length;
  const vaxDueCount = pets.length - upToDateCount;

  return (
    <div className="flex flex-col w-full bg-background text-foreground min-h-full">
      {/* STATUS STRIP */}
      <div className="w-full bg-muted/60 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-success animate-pulse shrink-0"></span>
          <span className="font-medium text-[11px] text-muted-foreground">Pets & Grooming Profiles</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="font-medium">
            Vaccinations: <span className="text-success font-semibold">{upToDateCount} up to date</span>
            {vaxDueCount > 0 && (
              <span className="text-warning font-semibold"> · {vaxDueCount} due</span>
            )}
          </span>
        </div>
      </div>

      {/* PAGE HEADER */}
      <div className="p-6 border-b border-border bg-background flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Pets &amp; Grooming Profiles
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
              {pets.length} Total
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Vaccination logs, coat types, behavioral notes, and grooming history for every pet in your care.
          </p>
        </div>
        <button
          onClick={onAddPet}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3.5 text-[13px] font-medium shadow-card transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus className="size-4" />
          Add Pet Profile
        </button>
      </div>

      {/* CONTENT */}
      <div className="p-6 space-y-6">
        {/* FILTERS ROW */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-xl shadow-card p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1.5 mr-1">
              <Search className="size-3.5" />
              Search:
            </span>
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, breed, or owner..."
                className="bg-background border border-input rounded-md pl-8 pr-3 h-8 text-[12px] text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring transition-colors w-64 max-w-full"
              />
            </div>
            <div className="relative inline-flex">
              <select
                aria-label="Filter by vaccination status"
                value={vaccinationFilter}
                onChange={(e) => setVaccinationFilter(e.target.value)}
                className="appearance-none bg-background border border-input hover:border-primary/40 rounded-md pl-3 pr-8 h-8 text-[12px] font-medium text-foreground cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">All Vaccination Statuses</option>
                <option value="uptodate">Up to Date</option>
                <option value="due">Due / Overdue</option>
              </select>
              <svg
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <span className="text-[12px] font-medium text-muted-foreground">
            {filteredPets.length} of {pets.length} pets
          </span>
        </div>

        {/* PETS GRID */}
        {filteredPets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <PawPrint className="size-6 text-muted-foreground" />
            </div>
            <p className="text-[14px] font-medium text-foreground">No pets found</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              Try adjusting your search or vaccination filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
            {filteredPets.map((pet) => {
              const isVaxUpToDate = pet.vaccinationStatus === 'Up to date';
              return (
                <div
                  key={pet.id}
                  className="bg-card border border-border rounded-xl shadow-card p-5 space-y-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-md hover:border-primary/30"
                >
                  <div className="flex items-start justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg text-primary border border-primary/20 flex items-center justify-center text-xl">
                        {pet.emoji}
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-foreground text-[15px]">{pet.name}</h3>
                        <p className="text-[11px] text-muted-foreground">{pet.breed} • {pet.age} ({pet.weight})</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                        isVaxUpToDate
                          ? 'bg-success/10 text-success border-success/20'
                          : 'bg-warning/10 text-warning border-warning/20',
                      )}
                    >
                      {pet.vaccinationStatus}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[12px] text-foreground bg-muted/40 border border-border rounded-md p-3">
                    <div className="flex items-center gap-2">
                      <User className="size-3.5 text-muted-foreground" />
                      <span>Owner: <strong className="text-foreground font-medium">{pet.ownerName}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      <span>Last Groom: <span className="text-foreground font-medium tabular-nums">{pet.lastGroomDate}</span></span>
                    </div>
                  </div>

                  <div className="p-3 border border-border rounded-md text-[11px] text-foreground bg-background">
                    <p className="font-semibold uppercase text-[10px] tracking-wider text-muted-foreground mb-1">
                      Styling &amp; Medical Notes
                    </p>
                    <p className="text-muted-foreground italic leading-relaxed">{pet.specialNotes}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
