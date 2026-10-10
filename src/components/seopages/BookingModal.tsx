'use client';

import React, { useState } from 'react';
import { X, Calendar, Check, ShieldCheck } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCity?: string;
  guideTitle?: string;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  defaultCity = 'Memphis, TN',
  guideTitle,
}) => {
  const [petName, setPetName] = useState('');
  const [petBreed, setPetBreed] = useState('Doodle / Poodle Mix');
  const [service, setService] = useState('Full Salon Bath & Scissored Haircut');
  const [city, setCity] = useState(defaultCity);
  const [rabiesConfirmed, setRabiesConfirmed] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border-2 border-stone-950 max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden rounded-none">
        
        {/* Close Button (Square) */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-8 h-8 bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 hover:text-stone-950 transition-colors rounded-none border border-stone-300 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {!submitted ? (
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Memphis & Shelby County Salon Booking</span>
            </div>
            <h3 className="text-2xl font-black text-stone-950 tracking-tight mb-1">
              Schedule Your Pet&apos;s Salon Visit
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mb-6">
              {guideTitle ? `Care standard: ${guideTitle}` : 'Certified gentle handling with fear-free salon accommodations'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Pet&apos;s Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Teddy"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 rounded-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Breed / Coat Type *
                  </label>
                  <input
                    type="text"
                    required
                    value={petBreed}
                    onChange={(e) => setPetBreed(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 rounded-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Service Package *
                </label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 rounded-none cursor-pointer"
                >
                  <option>Full Salon Bath & Scissored Haircut</option>
                  <option>De-Shedding Blowout & Mud Bath</option>
                  <option>Puppy First-Groom Desensitization (Under 6 mos)</option>
                  <option>Gentle Senior Pet Comfort Bath & Sanitary Trim</option>
                  <option>Cat Full Dematting & Lion Cut Styling</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Nearest Mid-South Location *
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 rounded-none cursor-pointer"
                >
                  <option>Memphis (Poplar / East Memphis)</option>
                  <option>Bartlett, TN</option>
                  <option>Collierville, TN</option>
                  <option>Germantown, TN</option>
                  <option>Arlington, TN</option>
                  <option>Shelby County Mobile Concierge</option>
                </select>
              </div>

              {/* Rabies Ordinance Checkbox (Square on White Canvas with Orange Border) */}
              <div className="p-3.5 bg-white border border-orange-500 rounded-none">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-stone-800">
                  <input
                    type="checkbox"
                    checked={rabiesConfirmed}
                    onChange={(e) => setRabiesConfirmed(e.target.checked)}
                    className="mt-0.5 rounded-none text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                  />
                  <span>
                    <strong className="text-orange-600 font-bold">Tennessee Rabies Verification:</strong> I confirm my pet has up-to-date rabies vaccination records from a licensed vet to present before service.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!rabiesConfirmed}
                className="w-full py-3.5 bg-[#FF6200] hover:bg-[#E65800] disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm rounded-none cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Confirm Appointment Request</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-4 rounded-none border border-emerald-300">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h3 className="text-2xl font-black text-stone-950 mb-2">
              Appointment Request Received
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mb-6 leading-relaxed">
              Thank you! Our Memphis salon concierge will text you within 2 business hours to verify {petName || 'your pet'}&apos;s rabies certificate and confirm exact arrival timing.
            </p>
            <div className="p-4 bg-stone-50 border border-stone-300 text-xs text-stone-700 text-left space-y-1 mb-6 rounded-none">
              <div><strong>Location:</strong> {city}</div>
              <div><strong>Package:</strong> {service}</div>
              <div><strong>Salon Line:</strong> (901) 555-PAWZ</div>
            </div>
            <button
              onClick={() => { setSubmitted(false); onClose(); }}
              className="px-6 py-2.5 bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-colors rounded-none cursor-pointer"
            >
              Back to Guide
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
