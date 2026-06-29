/**
 * Slides for the Session Recorder gallery. Images live in `public/gallery/`,
 * served at the site root in both editor and production builds.
 */
export interface GallerySlide {
  src: string;
  alt: string;
  title: string;
  caption: string;
}

export const GALLERY_SLIDES: GallerySlide[] = [
  {
    src: "/gallery/pcb.png",
    alt: "Custom PCB layout for the session recorder",
    title: "Custom PCB",
    caption:
      "A future-proof board I’m designing now — purpose-built to be manufactured and folded into the next revision of the system.",
  },
  {
    src: "/gallery/realpicture.jpg",
    alt: "The fully assembled session recorder device",
    title: "Conference-ready",
    caption:
      "The fully assembled device — built, cased, and field-tested on the conference floor.",
  },
  {
    src: "/gallery/code.png",
    alt: "Firmware and API source code",
    title: "10,000+ lines",
    caption:
      "Over ten thousand lines of firmware and API-ready backend — a clean contract any frontend can build on.",
  },
];
