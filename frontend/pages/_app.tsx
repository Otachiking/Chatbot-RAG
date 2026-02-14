/**
 * pages/_app.tsx
 *
 * Custom App component — imports global CSS once for the whole app.
 */

import type { AppProps } from "next/app";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
