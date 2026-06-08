import { isTauri } from '@/platform/tauri';

// Collects the GPU / webview facts we need to diagnose a render failure on a machine we can't
// reach. The RenderErrorPanel shows + lets the user copy this — it's how a friend's black
// screen turns into an actionable report (which webview, which GPU/driver, what WebGL exists).

export interface RenderDiagnostics {
  userAgent: string;
  tauri: boolean;
  devicePixelRatio: number;
  webgl2: boolean;
  webgl1: boolean;
  webgpu: boolean;
  glVendor: string;
  glRenderer: string;
  maxTextureSize: number | null;
}

function probe(type: 'webgl2' | 'webgl'): WebGLRenderingContext | WebGL2RenderingContext | null {
  try {
    // A FRESH canvas per type: once a context type is created on a canvas, requesting a
    // different type from the same canvas returns null.
    const ctx = document.createElement('canvas').getContext(type);
    return ctx as WebGLRenderingContext | WebGL2RenderingContext | null;
  } catch {
    return null;
  }
}

export function collectRenderDiagnostics(): RenderDiagnostics {
  const d: RenderDiagnostics = {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '?',
    tauri: isTauri(),
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    webgl2: false,
    webgl1: false,
    webgpu: typeof navigator !== 'undefined' && 'gpu' in navigator,
    glVendor: '?',
    glRenderer: '?',
    maxTextureSize: null,
  };
  const gl2 = probe('webgl2');
  const gl1 = probe('webgl');
  d.webgl2 = gl2 !== null;
  d.webgl1 = gl1 !== null;
  const gl = gl2 ?? gl1;
  if (gl !== null) {
    try {
      d.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext !== null) {
        d.glVendor = String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL));
        d.glRenderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
      }
    } catch {
      /* a context that exists but errors on getParameter is itself a useful signal */
    }
  }
  return d;
}

export function formatDiagnostics(d: RenderDiagnostics, error: unknown): string {
  const errText = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return [
    `error: ${errText}`,
    `tauri: ${d.tauri}`,
    `webgl2: ${d.webgl2}  webgl1: ${d.webgl1}  webgpu: ${d.webgpu}`,
    `gpu: ${d.glVendor} / ${d.glRenderer}`,
    `maxTextureSize: ${d.maxTextureSize ?? 'n/a'}  dpr: ${d.devicePixelRatio}`,
    `ua: ${d.userAgent}`,
  ].join('\n');
}
