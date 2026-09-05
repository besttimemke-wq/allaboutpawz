import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "All About Pawz | Luxury Dog Grooming & Spa",
  description:
    "Spa-level dog grooming where every detail is designed for your pup's comfort, style, and happiness. From Pawz to PAWfection.",
  icons: { icon: "/assets/paw.png" },
};

// Desktop-mode phones ("Request desktop site" in Chrome/Firefox on Android,
// "Request Desktop Website" in iOS Safari) force a 980–1024px layout viewport
// while the page is squeezed onto a ~414px screen: every lg: breakpoint fires
// and the pricing cards render three-squeezed-wide with unreadable type.
// This inline script (runs before first paint) tags those sessions on the
// <html> element so the dm-phone CSS in globals.css can serve the real mobile
// layout. Ordinary desktops never match (desktop UA), ordinary phones never
// match (narrow viewport) — the class appears only on a phone UA at desktop
// width.
const DESKTOP_MODE_PHONE_SCRIPT = `(function(){try{
var ua=navigator.userAgent;
var phone=/iPhone|iPod/.test(ua)||(/Android/.test(ua)&&/Mobile/.test(ua))||/Windows Phone|BlackBerry|Opera Mini|IEMobile/.test(ua);
if(!phone)return;
var root=document.documentElement;
var apply=function(){
var w=root.clientWidth||window.innerWidth;
if(w>=768){root.classList.add('dm-phone');root.style.setProperty('--dm-zoom',String(Math.min(2.6,w/430)));}
};
apply();
window.addEventListener('resize',apply);
window.addEventListener('orientationchange',function(){setTimeout(apply,250)});
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: DESKTOP_MODE_PHONE_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..800;1,400..600&family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,400&family=Great+Vibes&display=swap"
        />
      </head>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
