import type { MetadataRoute } from "next";

/** Lets people add ReviewLens to a phone's home screen with the square ReviewLens logo. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ReviewLens",
    short_name: "ReviewLens",
    description: "See how customers feel and what they talk about in a CSV of reviews.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    // Plain icons only: a maskable icon would let Android crop the square logo.
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
