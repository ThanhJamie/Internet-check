
import { PING_SAMPLES, UPLOAD_BLOB_SIZE_BYTES } from '../constants';

export const getTestUrlWithCacheBuster = (baseUrl: string) => `${baseUrl}?t=${new Date().getTime()}`;

export const measurePing = async (url: string, onProgress: (progress: { latency: number; sample: number }) => void): Promise<{ ping: number; jitter: number }> => {
    const latencies: number[] = [];
    for (let i = 0; i < PING_SAMPLES; i++) {
        const startTime = performance.now();
        try {
            await fetch(getTestUrlWithCacheBuster(url), { method: 'HEAD', cache: 'no-store', mode: 'no-cors' });
            const endTime = performance.now();
            const latency = endTime - startTime;
            latencies.push(latency);
            onProgress({ latency, sample: i + 1 });
        } catch (e) {
            console.error('Ping test failed:', e);
            latencies.push(999);
            onProgress({ latency: 999, sample: i + 1 });
        }
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between pings
    }

    if (latencies.length === 0) return { ping: 0, jitter: 0 };

    const average = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const variance = latencies.reduce((a, b) => a + Math.pow(b - average, 2), 0) / latencies.length;
    const jitter = Math.sqrt(variance);
    return { ping: average, jitter };
};


export const measureDownloadSpeed = (url: string, onProgress: (progress: { speed: number }) => void): Promise<number> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const testUrl = getTestUrlWithCacheBuster(url);
        const startTime = performance.now();

        xhr.open('GET', testUrl, true);
        xhr.timeout = 15000; // 15s timeout for the entire request

        xhr.onprogress = (event) => {
            if (event.lengthComputable) {
                const elapsedTime = (performance.now() - startTime) / 1000;
                if (elapsedTime > 0.2) { // Update frequently
                    const speedBps = (event.loaded * 8) / elapsedTime;
                    const speedMbps = speedBps / 1_000_000;
                    onProgress({ speed: speedMbps });
                }
            }
        };

        // FIX: Add the 'event' parameter to the onload callback to correctly access its properties.
        xhr.onload = (event) => {
            const endTime = performance.now();
            const durationInSeconds = (endTime - startTime) / 1000;
            const totalBytes = event.total || event.loaded;
            const totalBits = totalBytes * 8;
            const speedBps = durationInSeconds > 0 ? totalBits / durationInSeconds : 0;
            const speedMbps = speedBps / 1_000_000;
            onProgress({ speed: speedMbps });
            resolve(speedMbps);
        };

        xhr.onerror = () => reject(new Error('Download test failed due to a network error.'));
        xhr.ontimeout = () => reject(new Error('Download test timed out. The server might be slow or the connection is poor.'));
        xhr.onabort = () => reject(new Error('Download test was aborted.'));

        xhr.send();
    });
};

export const measureUploadSpeed = (url: string, onProgress: (progress: { speed: number }) => void): Promise<number> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const testUrl = getTestUrlWithCacheBuster(url);
        const data = new Blob([new Uint8Array(UPLOAD_BLOB_SIZE_BYTES)], { type: 'application/octet-stream' });
        const startTime = performance.now();
        
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const elapsedTime = (performance.now() - startTime) / 1000;
                if (elapsedTime > 0) {
                    const speedBps = (event.loaded * 8) / elapsedTime;
                    const speedMbps = speedBps / 1_000_000;
                    onProgress({ speed: speedMbps });
                }
            }
        };

        xhr.onload = () => {
            const endTime = performance.now();
            const durationInSeconds = (endTime - startTime) / 1000;
            const totalBits = data.size * 8;
            const speedBps = durationInSeconds > 0 ? totalBits / durationInSeconds : 0;
            const speedMbps = speedBps / 1_000_000;
            onProgress({ speed: speedMbps }); // Final update
            resolve(speedMbps);
        };
        
        xhr.onerror = () => {
            reject(new Error('Upload test failed. Check CORS policy on the server or your network connection.'));
        };

        xhr.ontimeout = () => {
            reject(new Error('Upload test timed out. The server might be slow or the connection is poor.'));
        };
        
        xhr.onabort = () => {
            reject(new Error('Upload test was aborted.'));
        };

        xhr.open('POST', testUrl, true);
        xhr.timeout = 15000; // 15 seconds
        xhr.send(data);
    });
};

export interface PingUpdate {
  type: 'reply' | 'timeout' | 'error';
  sequence: number;
  latency?: number;
  message?: string;
}

export class ContinuousPing {
  private url: string;
  private onUpdate: (update: PingUpdate) => void;
  private intervalId: number | null = null;
  private sequence = 0;
  private running = false;
  private timeout = 2000; // 2 seconds per ping request

  constructor(url: string, onUpdate: (update: PingUpdate) => void) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        this.url = `https://${url}`;
    } else {
        this.url = url;
    }
    this.onUpdate = onUpdate;
  }

  public start() {
    if (this.running) return;
    this.running = true;
    this.sequence = 0;
    this.ping();
    this.intervalId = window.setInterval(() => this.ping(), 1000);
  }

  public stop() {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async ping() {
    if (!this.running) return;

    const startTime = performance.now();
    this.sequence++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      await fetch(getTestUrlWithCacheBuster(this.url), {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
        mode: 'no-cors',
      });
      clearTimeout(timeoutId);
      const endTime = performance.now();
      const latency = endTime - startTime;
      if (this.running) {
        this.onUpdate({ type: 'reply', sequence: this.sequence, latency });
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (!this.running) return;

      if (e.name === 'AbortError') {
        this.onUpdate({ type: 'timeout', sequence: this.sequence });
      } else {
        this.onUpdate({ type: 'error', sequence: this.sequence, message: e.message });
      }
    }
  }
}