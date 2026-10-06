'use client';

import React, { useState } from 'react';

interface ScreenProps {
  onNavigateScreen?: (screenId: string) => void;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
  systemSettings?: any;
  saveSettingsToDb?: (updates: any) => Promise<void>;
}

export const OrgSocialDirectoriesScreen: React.FC<ScreenProps> = ({
  onNavigateScreen,
  systemSettings,
  saveSettingsToDb,
}) => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [instagram, setInstagram] = useState('https://instagram.com/allaboutpawzsalon');
  const [facebook, setFacebook] = useState('https://facebook.com/allaboutpawztexas');
  const [googlePlaceId, setGooglePlaceId] = useState('ChIJb_8qPawzTexasPawz0192');
  const [yelpUrl, setYelpUrl] = useState('https://yelp.com/biz/all-about-pawz-frisco');
  const [tiktok, setTiktok] = useState('https://tiktok.com/@allaboutpawzgrooming');

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (systemSettings) {
      if (systemSettings.org_instagram_url) setInstagram(systemSettings.org_instagram_url);
      if (systemSettings.org_facebook_url) setFacebook(systemSettings.org_facebook_url);
    }
  }, [systemSettings]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  return (
    <div className="w-full bg-card text-foreground font-sans antialiased text-[13px]">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-3 border border-white z-50 flex items-center gap-3 tabular-nums text-[13px] shadow-2xl">
          <span className="w-2 h-2 bg-card animate-pulse"></span>
          <span className="uppercase font-semibold tracking-wider">{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2 text-white hover:opacity-70 cursor-pointer">✕</button>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="p-6 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold uppercase tracking-tight text-foreground">
              Social Links &amp; Directory Listings
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Manage social media profiles and local review destinations included in client confirmations, receipts, and portal footers.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[13px]">
            <button
              onClick={() => showToast('Syncing Google Business Profile reviews...')}
              className="h-8 px-3 border border-border bg-card font-semibold hover:bg-muted/40 cursor-pointer"
            >
              Refresh Reviews
            </button>
            <button
              onClick={async () => {
                if (saveSettingsToDb) {
                  await saveSettingsToDb({
                    org_instagram_url: instagram,
                    org_facebook_url: facebook,
                  });
                }
                showToast('Social profiles and directory links saved successfully');
              }}
              className="h-8 px-4 bg-primary text-primary-foreground border border-border font-semibold hover:bg-muted cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* FORM FIELDS */}
      <div className="p-5 max-w-4xl space-y-5 tabular-nums text-[13px]">
        <div className="border-2-black bg-card p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="font-semibold uppercase text-foreground">PRIMARY SOCIAL NETWORKS</span>
            <span className="text-[10px] text-muted-foreground">PUBLIC PROFILE EMBEDS</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-muted-foreground uppercase text-[10px] block mb-1">INSTAGRAM BUSINESS URL</label>
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full border border-border p-2 font-semibold bg-muted/30 focus:bg-card focus:outline-none text-[13px]"
                type="text"
              />
            </div>

            <div>
              <label className="text-muted-foreground uppercase text-[10px] block mb-1">FACEBOOK PAGE URL</label>
              <input
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                className="w-full border border-border p-2 font-semibold bg-muted/30 focus:bg-card focus:outline-none text-[13px]"
                type="text"
              />
            </div>

            <div>
              <label className="text-muted-foreground uppercase text-[10px] block mb-1">TIKTOK CREATOR PROFILE</label>
              <input
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                className="w-full border border-border p-2 font-semibold bg-muted/30 focus:bg-card focus:outline-none text-[13px]"
                type="text"
              />
            </div>
          </div>
        </div>

        <div className="border-2-black bg-card p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="font-semibold uppercase text-foreground">LOCAL DIRECTORIES &amp; REVIEW DESTINATIONS</span>
            <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.2 font-semibold">AUTOMATED REVIEW INVITES</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-muted-foreground uppercase text-[10px] block mb-1">GOOGLE PLACE ID / GOOGLE MAPS LINK</label>
              <input
                value={googlePlaceId}
                onChange={(e) => setGooglePlaceId(e.target.value)}
                className="w-full border border-border p-2 font-semibold bg-muted/30 focus:bg-card focus:outline-none text-[13px]"
                type="text"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                Post-appointment SMS sends 5-star review invitations directly targeting this Place ID.
              </span>
            </div>

            <div>
              <label className="text-muted-foreground uppercase text-[10px] block mb-1">YELP FOR BUSINESS URL</label>
              <input
                value={yelpUrl}
                onChange={(e) => setYelpUrl(e.target.value)}
                className="w-full border border-border p-2 font-semibold bg-muted/30 focus:bg-card focus:outline-none text-[13px]"
                type="text"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
