import React from 'react';

// Using a CORS-friendly URL. Adding a timestamp to bust cache for accurate tests.
export const TEST_FILE_URL = 'https://cachefly.cachefly.net/10mb.test';
export const UPLOAD_TEST_URL = 'https://httpbin.org/post'; // Dummy endpoint for upload test
export const UPLOAD_BLOB_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const PING_SAMPLES = 5;
export const INITIAL_GAUGE_MAX_SPEED = 100; // Mbps

export const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mr-2 text-primary">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

export const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mr-2 text-primary">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 5 17 10" />
        <line x1="12" y1="19" x2="12" y2="5" />
    </svg>
);


export const PingIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mr-2 text-secondary">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);

export const JitterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mr-2 text-secondary">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);
