declare module 'subset-font' {
  interface SubsetOptions {
    targetFormat?: 'woff2' | 'woff' | 'truetype' | 'sfnt';
  }
  export default function subsetFont(font: Uint8Array, text: string, options?: SubsetOptions): Promise<Uint8Array>;
}
