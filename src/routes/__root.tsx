import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "เกมจับผีกระสือและผีกระหัง เล่นฟรี";
const APP_DESCRIPTION =
  "เล่นเกมจับผีกระสือและผีกระหังฟรีบนเบราว์เซอร์ แตะให้ทันก่อนผีหาย ห้ามแตะก้อนกับดัก มีคะแนนสูงสุดเก็บในเครื่อง";

const GAME_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "เกมจับผีกระสือและผีกระหัง",
  alternateName: ["เกมจับผีกระสือ", "เกมผีกระหัง", "เกมจับผีออนไลน์"],
  description: APP_DESCRIPTION,
  inLanguage: "th",
  genre: ["Casual", "Arcade"],
  playMode: "SinglePlayer",
  gamePlatform: ["Web browser"],
  applicationCategory: "Game",
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "THB",
  },
};

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: APP_DESCRIPTION },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#0c1016" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Charmonman:wght@700&family=Sarabun:wght@400;600;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(GAME_JSON_LD),
      },
    ],
  }),
  component: () => (
    <html lang="th" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
