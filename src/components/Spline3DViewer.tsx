import React, { useEffect, useState, useRef } from 'react';
import { Sparkles } from 'lucide-react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          url?: string;
          'loading-anim-type'?: string;
        },
        HTMLElement
      >;
    }
  }
}

interface Spline3DViewerProps {
  sceneUrl?: string;
}

export const Spline3DViewer: React.FC<Spline3DViewerProps> = ({
  sceneUrl = 'https://prod.spline.design/GI9x-53r-bo8IqkF/scene.splinecode',
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // 1. Inject global CSS rules targeting Spline watermark elements
    const styleId = 'global-hide-spline-watermark';
    if (!document.getElementById(styleId)) {
      const globalStyle = document.createElement('style');
      globalStyle.id = styleId;
      globalStyle.textContent = `
        spline-viewer::shadow #logo,
        spline-viewer::shadow #spline-logo,
        spline-viewer::shadow a,
        .spline-watermark,
        #spline-logo,
        a[href*="spline.design"] {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(globalStyle);
    }

    // 2. Ensure Spline Viewer Web Component script is loaded
    const scriptId = 'spline-viewer-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'module';
      script.src = 'https://unpkg.com/@splinetool/viewer@1.9.72/build/spline-viewer.js';
      document.head.appendChild(script);
    }

    let observer: MutationObserver | null = null;

    // 3. Selective Shadow DOM Watermark Removal: Hides ONLY branding links/logos without affecting container/canvas
    const purgeShadowDOMWatermark = () => {
      const viewer = (viewerRef.current || containerRef.current?.querySelector('spline-viewer')) as any;
      if (viewer && viewer.shadowRoot) {
        // Inject custom watermark hiding style inside Shadow DOM
        if (!viewer.shadowRoot.querySelector('#hide-watermark-style')) {
          const style = document.createElement('style');
          style.id = 'hide-watermark-style';
          style.textContent = `
            #logo,
            #spline-logo,
            a[href*="spline"],
            a[href*="spline.design"],
            .watermark,
            #watermark,
            #brand,
            svg[class*="logo"],
            a[target="_blank"],
            a,
            [id*="logo"],
            [class*="logo"],
            [id*="watermark"],
            [class*="watermark"] {
              display: none !important;
              opacity: 0 !important;
              visibility: hidden !important;
              pointer-events: none !important;
              width: 0 !important;
              height: 0 !important;
              max-width: 0 !important;
              max-height: 0 !important;
              overflow: hidden !important;
              position: absolute !important;
              top: -9999px !important;
              left: -9999px !important;
            }
          `;
          viewer.shadowRoot.appendChild(style);
        }

        // Target ONLY watermark elements (logos, links), preserving wrapper containers & canvas intact
        const watermarkEls = viewer.shadowRoot.querySelectorAll('#logo, #spline-logo, a[href*="spline"], .watermark, #watermark, #brand, a[target="_blank"], a, [id*="logo"], [class*="watermark"]');
        watermarkEls.forEach((el: Element) => {
          (el as HTMLElement).style.display = 'none';
          (el as HTMLElement).style.opacity = '0';
          (el as HTMLElement).style.visibility = 'hidden';
          (el as HTMLElement).style.pointerEvents = 'none';
          try {
            el.remove();
          } catch (e) {}
        });

        if (!observer) {
          observer = new MutationObserver(() => {
            const addedWatermarks = viewer.shadowRoot?.querySelectorAll('#logo, #spline-logo, a[href*="spline"], .watermark, #watermark, #brand, a[target="_blank"], a, [id*="logo"], [class*="watermark"]');
            addedWatermarks?.forEach((el: Element) => {
              (el as HTMLElement).style.display = 'none';
              (el as HTMLElement).style.opacity = '0';
              (el as HTMLElement).style.visibility = 'hidden';
              (el as HTMLElement).style.pointerEvents = 'none';
              try {
                el.remove();
              } catch (e) {}
            });
          });
          observer.observe(viewer.shadowRoot, { childList: true, subtree: true });
        }
      }
    };

    // Listen for viewer load events to smoothly reveal the canvas
    const viewerEl = (viewerRef.current || containerRef.current?.querySelector('spline-viewer')) as HTMLElement | null;
    const handleViewerLoad = () => {
      setIsLoading(false);
    };

    if (viewerEl) {
      viewerEl.addEventListener('load', handleViewerLoad);
      viewerEl.addEventListener('load-complete', handleViewerLoad);
    }

    const intervalId = setInterval(purgeShadowDOMWatermark, 100);

    const fallbackTimer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => {
      if (viewerEl) {
        viewerEl.removeEventListener('load', handleViewerLoad);
        viewerEl.removeEventListener('load-complete', handleViewerLoad);
      }
      clearInterval(intervalId);
      clearTimeout(fallbackTimer);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [sceneUrl]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[300px] sm:min-h-[400px] flex items-center justify-center relative overflow-hidden rounded-3xl select-none bg-slate-900/10 dark:bg-slate-950/20"
    >
      {/* Dark Glassmorphism Skeleton / Loading Placeholder */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl z-30 transition-opacity duration-500 rounded-3xl p-6 select-none">
          {/* Animated Loader Badge */}
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
            </div>
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm font-black text-slate-100 tracking-tight">
              Loading 3D Experience
            </p>
            <p className="text-xs text-slate-400 font-semibold animate-pulse">
              Compiling interactive 3D WebGL scene...
            </p>
          </div>
        </div>
      )}

      {/* Spline Web Component Canvas Container */}
      <div
        className={`w-full h-full relative overflow-hidden flex items-center justify-center transition-opacity duration-500 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <spline-viewer
          ref={viewerRef as any}
          url={sceneUrl}
          loading-anim-type="spinner"
          style={{
            width: '100%',
            height: '100%',
            minHeight: '100%',
            display: 'block',
            border: 'none',
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
};

