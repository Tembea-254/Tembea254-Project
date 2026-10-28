/** Business details shown across the site. Update social handles here once the accounts exist. */
export const SITE = {
  name: "Tembea254",
  phones: [
    { display: "0792 293 454", e164: "+254792293454" },
    { display: "0706 748 425", e164: "+254706748425" },
  ],
  /** WhatsApp chats go to the first number */
  whatsapp: "254792293454",
  whatsappGreeting: "Hello Tembea254! I'd like help planning a trip in Kenya.",
  email: "hello@tembea254.com",
  city: "Nairobi, Kenya",
  socials: {
    tiktok: "https://www.tiktok.com/@tembea254",
    instagram: "https://www.instagram.com/tembea254",
    twitter: "https://x.com/tembea254",
    facebook: "https://www.facebook.com/tembea254",
  },
} as const;

export const waLink = (text: string = SITE.whatsappGreeting, to: string = SITE.whatsapp) =>
  `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
