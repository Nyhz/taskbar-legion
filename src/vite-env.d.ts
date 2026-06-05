/// <reference types="vite/client" />

// vite/client declares the common audio extensions (.mp3/.ogg/.wav/…) but not .mpeg.
declare module '*.mpeg' {
  const src: string;
  export default src;
}
