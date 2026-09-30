import type { NextApiRequest, NextApiResponse } from "next";

const ALLOW = `User-agent: *
Allow: /

Sitemap: https://pellwood.com/sitemap.xml
`;

const DISALLOW = `User-agent: *
Disallow: /
`;

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  // An API route rather than a page, so staging and production can differ without
  // a separate build artifact - and API routes are meant for raw non-HTML
  // responses, unlike a page whose getServerSideProps writes the body itself.
  const isStaging = process.env.STAGING === "1";

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.status(200).send(isStaging ? DISALLOW : ALLOW);
}