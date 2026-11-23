import { getSiteUrl } from "~/lib/env";

export function GET(): Response {
  const siteUrl = getSiteUrl();
  const body = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
