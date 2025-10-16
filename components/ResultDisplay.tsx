import React from 'react';
import { DownloadIcon, PingIcon, UploadIcon, JitterIcon } from '../constants';

interface ResultDisplayProps {
  ping: number | null;
  jitter: number | null;
  downloadSpeed: number | null;
  uploadSpeed: number | null;
}

const ResultCard: React.FC<{ icon: React.ReactNode; label: string; value: string | null; unit: string }> = ({ icon, label, value, unit }) => (
  <div className="flex items-center bg-light-bg p-4 rounded-lg shadow-lg w-full sm:w-48 justify-center">
    {icon}
    <div className="flex-grow">
      <div className="text-sm text-text-dark">{label}</div>
      <div className="text-2xl font-bold text-text-light">
        {value !== null ? (
          <>
            {value} <span className="text-base font-normal text-text-dark">{unit}</span>
          </>
        ) : '--'}
      </div>
    </div>
  </div>
);

const ResultDisplay: React.FC<ResultDisplayProps> = ({ ping, jitter, downloadSpeed, uploadSpeed }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 w-full max-w-4xl px-4">
        <ResultCard icon={<PingIcon />} label="Ping" value={ping?.toFixed(0) ?? null} unit="ms" />
        <ResultCard icon={<JitterIcon />} label="Jitter" value={jitter?.toFixed(0) ?? null} unit="ms" />
        <ResultCard icon={<DownloadIcon />} label="Download" value={downloadSpeed?.toFixed(2) ?? null} unit="Mbps" />
        <ResultCard icon={<UploadIcon />} label="Upload" value={uploadSpeed?.toFixed(2) ?? null} unit="Mbps" />
    </div>
  );
};

export default ResultDisplay;
