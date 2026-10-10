import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/i18n';
import { Sheet } from './ui';

type Detector = { detect(src: HTMLVideoElement): Promise<{ rawValue: string }[]> };
declare global {
  interface Window { BarcodeDetector?: new (opts?: { formats: string[] }) => Detector }
}

/**
 * Camera scanning with the browser's BarcodeDetector (Chrome, Edge, Android).
 * Handheld USB scanners need nothing: they type into the focused search box and press Enter.
 */
export function Scanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const { t } = useT();
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(window.BarcodeDetector ? null : t('scan.unsupported'));

  useEffect(() => {
    if (!window.BarcodeDetector) return;
    let stream: MediaStream | null = null;
    let stop = false;
    const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix'] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const tick = async () => {
          if (stop || !video.current) return;
          try {
            const found = await detector.detect(video.current);
            if (found[0]?.rawValue) {
              stop = true;
              onCode(found[0].rawValue);
              return;
            }
          } catch {
            /* frame not ready */
          }
          setTimeout(tick, 250);
        };
        tick();
      } catch {
        setError(t('scan.denied'));
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [onCode, t]);

  return (
    <Sheet title={t('scan.title')} onClose={onClose}>
      {error ? (
        <p className="note note--warn" style={{ margin: 0 }}>{error}</p>
      ) : (
        <>
          <div className="scanner">
            <video ref={video} muted playsInline />
            <div className="scanner__frame" aria-hidden />
          </div>
          <p className="muted" style={{ margin: 0 }}>{t('scan.hint')}</p>
        </>
      )}
    </Sheet>
  );
}
