// ---------------------------------------------------------------------------
// Cookie consent BOOT SCRIPT — rendered inline in <head> of the root layout
// so it executes BEFORE first paint and BEFORE any tag can fire.
//
// Responsibilities (in order):
//   1. Bootstrap `window.dataLayer` + the `gtag` stub.
//   2. Declare Google Consent Mode v2 DEFAULTS — everything optional DENIED.
//      Google requires defaults to be set before gtag.js loads; this is what
//      keeps GA4 cookie-less until the visitor opts in.
//   3. Restore a previously saved consent record from the
//      `pawz_cookie_consent` cookie and immediately `gtag('consent','update')`
//      with it — returning visitors keep their choice with no banner flash.
//      On PORTAL pages (admin / groomer / customer + their auth screens) the
//      restore is SKIPPED: portals run on strictly-necessary cookies only, so
//      Consent Mode stays fully denied there and no tag fires on portal
//      views. Entering the public site re-applies the saved choice (see
//      GoogleAnalytics.tsx).
//   4. Expose the restored record on `window.__pawzConsent` so the React
//      consent UI and the GA4 loader can hydrate without re-parsing.
// ---------------------------------------------------------------------------

export const CONSENT_BOOT_SCRIPT = `(function(){try{
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
window.__pawzGtag=gtag;
window.gtag=window.gtag||gtag;
window.__pawzConsent=null;
gtag('consent','default',{
  ad_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied',
  analytics_storage:'denied',
  functionality_storage:'denied',
  personalization_storage:'denied',
  security_storage:'granted',
  wait_for_update:500
});
var PORTALS=['/admin','/admin-login','/groomer','/customer','/access-customer','/access-groomer','/access-frontdesk','/account','/auth','/learn','/api'];
var p=location.pathname.toLowerCase(),onPortal=false;
for(var i=0;i<PORTALS.length;i++){var pre=PORTALS[i];if(p===pre||p.indexOf(pre+'/')===0){onPortal=true;break;}}
if(onPortal)return;
var m=document.cookie.match(/(?:^|;\\s*)pawz_cookie_consent=([^;]*)/);
if(m){
  try{
    var c=JSON.parse(decodeURIComponent(m[1]));
    if(typeof c.functional==='boolean'&&typeof c.analytics==='boolean'){
      gtag('consent','update',{
        ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',
        analytics_storage:c.analytics?'granted':'denied',
        functionality_storage:c.functional?'granted':'denied',
        personalization_storage:c.functional?'granted':'denied',
        security_storage:'granted'
      });
      window.__pawzConsent=c;
      dataLayer.push({event:'pawz_consent_restored',consent:{
        essential:true,functional:c.functional,analytics:c.analytics
      }});
    }
  }catch(e){}
}
}catch(e){}})();`;
