import type { GetServerSideProps } from "next";

const ALLOW = `User-agent: *
Allow: /

Sitemap: https://pellwood.com/sitemap.xml
`;

const DISALLOW = `User-agent: *
Disallow: /
`;

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const isStaging = process.env.STAGING === "1";

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.write(isStaging ? DISALLOW : ALLOW);
  res.end();

  return { props: {} };
};

export default function Robots() {
  return null;
}