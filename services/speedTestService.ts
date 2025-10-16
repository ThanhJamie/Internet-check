import { PING_SAMPLES, TEST_FILE_URL, UPLOAD_TEST_URL, UPLOAD_BLOB_SIZE_BYTES } from '../constants';

const getTestUrlWithCacheBuster = (baseUrl: string) => `${baseUrl}?t=${new Date().getTime()}`;

export const measurePing = async (onProgress: (progress: { latency: number; sample: number }) => void): Promise<{ ping: number; jitter: number }> => {
    const latencies: number[] = [];
    for (let i = 0; i < PING_SAMPLES; i++) {
        const startTime = performance.now();
        try {
            await fetch(getTestUrlWithCacheBuster(TEST_FILE_URL), { method: 'HEAD', cache: 'no-store' });
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


export const measureDownloadSpeed = (onProgress: (progress: { speed: number }) => void): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const url = getTestUrlWithCacheBuster(TEST_FILE_URL);
        const startTime = performance.now();
        let bytesLoaded = 0;

        try {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.body) {
                reject(new Error("Response body is null"));
                return;
            }

            const reader = response.body.getReader();
            const contentLength = +(response.headers.get('Content-Length') || 0);

            const read = async () => {
                try {
                    const { done, value } = await reader.read();
                    if (done) {
                        const endTime = performance.now();
                        const durationInSeconds = (endTime - startTime) / 1000;
                        const totalBytes = contentLength > 0 ? contentLength : bytesLoaded;
                        const totalBits = totalBytes * 8;
                        const speedBps = totalBits / durationInSeconds;
                        const speedMbps = speedBps / 1_000_000;
                        onProgress({ speed: speedMbps });
                        resolve(speedMbps);
                        return;
                    }

                    bytesLoaded += value.length;
                    const elapsedTime = (performance.now() - startTime) / 1000;
                    if (elapsedTime > 0.2) { // Update frequently
                        const speedBps = (bytesLoaded * 8) / elapsedTime;
                        const speedMbps = speedBps / 1_000_000;
                        onProgress({ speed: speedMbps });
                    }

                    read();
                } catch (e) {
                    reject(e);
                }
            };

            read();

        } catch (e) {
            reject(e);
        }
    });
};

export const measureUploadSpeed = (onProgress: (progress: { speed: number }) => void): Promise<number> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = getTestUrlWithCacheBuster(UPLOAD_TEST_URL);
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
             // Even on error, we can resolve with the calculated speed up to that point
             // as we are measuring the client's upload capability.
            const endTime = performance.now();
            const durationInSeconds = (endTime - startTime) / 1000;
            const totalBits = data.size * 8;
            const speedBps = durationInSeconds > 0 ? totalBits / durationInSeconds : 0;
            const speedMbps = speedBps / 1_000_000;
            console.warn("Upload test finished with an error, but resolving with measured speed.");
            resolve(speedMbps);
        };
        
        xhr.onabort = () => {
            reject(new Error('Upload test aborted.'));
        };

        xhr.open('POST', url, true);
        xhr.send(data);
    });
};
