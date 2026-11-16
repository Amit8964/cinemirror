// Public contact details and legal copy, shared by the footer and the Contact, DMCA and Disclaimer pages.
// The defaults are DEMO values — set CONTACT_EMAIL, DMCA_EMAIL and CONTACT_PHONE in .env.local before going live.

export const SITE = {
  name: "CineMirror",
  email: process.env.CONTACT_EMAIL?.trim() || "support@cinemirror.example",
  dmcaEmail: process.env.DMCA_EMAIL?.trim() || "dmca@cinemirror.example",
  phone: process.env.CONTACT_PHONE?.trim() || "+91 00000 00000",
  hours: "Mon–Sat, 10:00 – 18:00 IST",
  /** Shown on the legal pages. Update when you change them. */
  legalUpdated: "16 November 2026",
};

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** The site's hosting statement, as provided by the site owner. Keep it true for how you actually serve video. */
export const HOSTING_NOTICE =
  `${SITE.name} does not host or store any video content on its servers. All media accessible through this site is ` +
  "embedded from third-party external sources. We are an index and discovery platform only.";

export const TAKEDOWN_NOTICE =
  "For the fastest resolution of a copyright concern, we recommend contacting the actual content host directly. " +
  "However, we are happy to remove any links or embed references from our site upon receiving a valid DMCA notice.";

/** TMDB requires this attribution wherever its data is used. */
export const TMDB_NOTICE = "This product uses the TMDB API but is not endorsed or certified by TMDB.";

export const currentYear = () => new Date().getUTCFullYear();
