// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";
import { getSiteUrl } from "~/lib/env";

export default createHandler(() => {
  const siteUrl = getSiteUrl();
  const schemaOrg = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "EditNovel Studio",
    alternateName: [
      "EditNovel",
      "EPUB Editor",
      "EPUB Studio",
      "PDF to EPUB",
      "PDF to EPUB Converter",
      "Light Novel Editor",
      "Light Novel Studio",
      "Light Novel Formatter",
      "Maquetador de Novelas Ligeras",
      "Editor de Novelas Ligeras",
      "Convertidor PDF a EPUB",
      "WebAssembly EPUB Maker",
      "Online EPUB 3 Studio",
      "Editorial Light Novel Creator",
      "EPUB Typesetting Studio"
    ],
    url: siteUrl,
    description: "Estudio editorial web y conversor de PDF a EPUB para novelas ligeras con tipografía avanzada, notas al pie interactivas y motor WebAssembly local 100% privado.",
    applicationCategory: "DesignApplication",
    operatingSystem: "All (Modern Web Browser)",
    browserRequirements: "Requires WebAssembly support",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD"
    }
  });

  return (
    <StartServer
      document={({ assets, children, scripts }) => (
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="theme-color" content="#18181b" />
            <link rel="manifest" href="/site.webmanifest" />
            <link rel="icon" type="image/x-icon" href="/favicon.ico" />
            <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
            <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
            <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
            <link
              rel="stylesheet"
              href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@300;400;500;600;700&family=Literata:ital,opsz,wght@0,7..72,400..700;1,7..72,400..700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&display=swap"
              crossorigin="anonymous"
            />
            <link rel="preload" href="/fonts/libron/Libron-Regular.ttf" as="font" type="font/ttf" crossorigin="anonymous" />
            <script type="application/ld+json" innerHTML={schemaOrg} />
            <script
              innerHTML={`(function(){try{var t=localStorage.getItem("app_theme");var d=t==="dark"||((!t||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d){document.documentElement.classList.add("dark");document.documentElement.classList.remove("light");document.documentElement.style.colorScheme="dark";}else{document.documentElement.classList.remove("dark");document.documentElement.classList.add("light");document.documentElement.style.colorScheme="light";}}catch(e){}})()`}
            />
            {assets}
          </head>
          <body>
            <div id="app">{children}</div>
            {scripts}
          </body>
        </html>
      )}
    />
  );
});
