'use client';

import React from 'react';
import { 
  MonitorCheck, 
  TrendingUp, 
  Shapes, 
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Phone,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { GuidePageData } from '@/lib/seopages/types';

interface WhyFeaturesColProps {
  data: GuidePageData;
  onLearnMore?: () => void;
}

export const WhyFeaturesCol: React.FC<WhyFeaturesColProps> = ({ data, onLearnMore }) => {
  return (
    <section className="my-14 lg:my-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        
        {/* Left Column: 3 Structured Feature Pillars (Square Geometry) */}
        <div className="lg:col-span-7 flex flex-col items-start">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-stone-950 tracking-tight mb-10 text-balance">
            {data.whyHeadline}
          </h2>

          <div className="space-y-9 mb-10 w-full">
            {/* Feature 1 */}
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 flex items-center justify-center shrink-0 mt-0.5 text-stone-950 rounded-none border border-stone-300 bg-stone-50">
                <MonitorCheck className="w-7 h-7 stroke-[1.6]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-stone-950 mb-2 tracking-tight">
                  {data.whyFeatures[0]?.title || 'Care from a team more pet owners trust'}
                </h3>
                <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-xl">
                  {data.whyFeatures[0]?.description || 'The All About Pawz team provides veterinary-reviewed grooming standards, stress-free handling, and coat-specific care protocols.'}
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 flex items-center justify-center shrink-0 mt-0.5 text-stone-950 rounded-none border border-stone-300 bg-stone-50">
                <TrendingUp className="w-7 h-7 stroke-[1.6]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-stone-950 mb-2 tracking-tight">
                  {data.whyFeatures[1]?.title || 'Care with tools and programs that help pets thrive'}
                </h3>
                <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-xl">
                  {data.whyFeatures[1]?.description || 'It takes dedication to keep coats healthy and mat-free. That is why we provide every client with salon-grade deshedding, hypoallergenic botanicals, and personalized home brushing routines.'}
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 flex items-center justify-center shrink-0 mt-0.5 text-stone-950 rounded-none border border-stone-300 bg-stone-50">
                <Shapes className="w-7 h-7 stroke-[1.6]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-stone-950 mb-2 tracking-tight">
                  {data.whyFeatures[2]?.title || 'Full-service salon with high-impact, optional services'}
                </h3>
                <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-xl">
                  {data.whyFeatures[2]?.description || 'We provide pet parents of all dog and cat breeds with a range of optional services at exceptional value: including blueberry facials, teeth enzyme cleaning, and Mid-South allergy mud baths.'}
                </p>
              </div>
            </div>
          </div>

          {/* Learn More Button (Square) */}
          <button
            onClick={onLearnMore}
            className="px-7 py-3 border border-stone-900 text-stone-950 hover:bg-stone-950 hover:text-white transition-colors text-sm font-bold cursor-pointer rounded-none"
          >
            {data.whyCtaText}
          </button>
        </div>

        {/* Right Column: Appointment & Consultation Booking Card (White canvas with crisp orange border) */}
        <div className="lg:col-span-5 w-full">
          <div className="bg-white border-2 border-orange-500 p-7 lg:p-8 flex flex-col justify-between rounded-none shadow-sm">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-200">
                <span className="text-xs font-black uppercase tracking-wider text-orange-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
                  Salon & Mobile Booking
                </span>
                <span className="text-[11px] font-bold bg-stone-100 text-stone-700 px-2 py-0.5 border border-stone-200">
                  Mid-South TN
                </span>
              </div>

              <h3 className="text-2xl font-black text-stone-950 tracking-tight mb-2">
                Book Professional Care & Salon Services
              </h3>
              
              <p className="text-sm text-stone-600 leading-relaxed mb-6">
                Reserve your pet’s appointment at our Memphis salon or request mobile grooming concierge. Low-stress handling certified with veterinary-grade sanitization.
              </p>

              {/* Verified Features */}
              <div className="space-y-3 mb-6 bg-stone-50 p-4 border border-stone-200">
                <div className="flex items-start gap-3 text-xs text-stone-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Rabies Verification Required:</strong> State & municipal public safety compliance enforced for every pet.</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-stone-800">
                  <Clock className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                  <span><strong>Salon Hours:</strong> Monday to Saturday: 7:30 AM to 6:00 PM (Appointments & Walk-in Nails).</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-stone-800">
                  <MapPin className="w-4 h-4 text-stone-900 shrink-0 mt-0.5" />
                  <span><strong>Service Coverage:</strong> Full salon facilities and regional mobile concierge grooming.</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100">
              <button
                onClick={onLearnMore}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer rounded-none mb-3 shadow-xs"
              >
                <Calendar className="w-4 h-4" />
                <span>Open Appointment Booking System</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between text-xs text-stone-600 px-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Phone className="w-3.5 h-3.5 text-stone-500" />
                  Call: (901) 555-PAWZ
                </span>
                <span className="text-stone-400 font-medium">No Waitlist Deposit</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
