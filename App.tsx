import React, { useState, useCallback, useMemo, useRef } from 'react';
import { TestState } from './types';
import { measurePing, measureDownloadSpeed, measureUploadSpeed } from './services/speedTestService';
import SpeedGauge from './components/SpeedGauge';
import ResultDisplay from './components/ResultDisplay';
import HistoryChart from './components/HistoryChart';
import NetworkStatus from './components/NetworkStatus';
import { INITIAL_GAUGE_MAX_SPEED, TEST_FILE_URL, UPLOAD_TEST_URL, SettingsIcon } from './constants';
import ContinuousPingTool from './components/ContinuousPingTool';
import ViewSwitcher from './components/ViewSwitcher';

interface HistoryData {
  time: number;
  ping?: number;
  download?: number;
  upload?: number;
}

const App: React.FC = () => {
  const [view, setView] = useState<'speedtest' | 'ping'>('speedtest');
  const [testState, setTestState] = useState<TestState>(TestState.IDLE);
  const [ping, setPing] = useState<number | null>(null);
  const [jitter, setJitter] = useState<number | null>(null);
  const [downloadSpeed, setDownloadSpeed] = useState<number | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<number | null>(null);
  const [instantSpeed, setInstantSpeed] = useState<number>(0);
  const [gaugeMaxSpeed, setGaugeMaxSpeed] = useState<number>(INITIAL_GAUGE_MAX_SPEED);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData[]>([]);
  const testStartTimeRef = useRef<number>(0);

  const [showSettings, setShowSettings] = useState(false);
  const [customDownloadUrl, setCustomDownloadUrl] = useState(TEST_FILE_URL);
  const [customUploadUrl, setCustomUploadUrl] = useState(UPLOAD_TEST_URL);

  const isTesting = useMemo(() => 
    [TestState.TESTING_PING, TestState.TESTING_DOWNLOAD, TestState.TESTING_UPLOAD].includes(testState),
    [testState]
  );

  const isTestFinished = useMemo(() =>
    [TestState.FINISHED, TestState.ERROR].includes(testState),
    [testState]
  );

  const resetState = useCallback(() => {
    setTestState(TestState.IDLE);
    setPing(null);
    setJitter(null);
    setDownloadSpeed(null);
    setUploadSpeed(null);
    setInstantSpeed(0);
    setGaugeMaxSpeed(INITIAL_GAUGE_MAX_SPEED);
    setErrorMessage(null);
    setHistoryData([]);
    testStartTimeRef.current = 0;
  }, []);

  const handleStartTest = useCallback(async () => {
    resetState();
    testStartTimeRef.current = performance.now();

    const downloadTestUrl = customDownloadUrl || TEST_FILE_URL;
    const uploadTestUrl = customUploadUrl || UPLOAD_TEST_URL;

    try {
      // PING TEST
      setTestState(TestState.TESTING_PING);
      const onPingProgress = ({ latency }: { latency: number }) => {
        const elapsedTime = (performance.now() - testStartTimeRef.current) / 1000;
        setHistoryData(prev => [...prev, { time: elapsedTime, ping: latency }]);
      };
      const { ping: pingResult, jitter: jitterResult } = await measurePing(downloadTestUrl, onPingProgress);
      setPing(pingResult);
      setJitter(jitterResult);

      // DOWNLOAD TEST
      setTestState(TestState.TESTING_DOWNLOAD);
      const onDownloadProgress = ({ speed }: { speed: number }) => {
        setInstantSpeed(speed);
        if (speed > gaugeMaxSpeed) {
            if (speed > 500) setGaugeMaxSpeed(1000);
            else if (speed > 200) setGaugeMaxSpeed(500);
            else if (speed > 100) setGaugeMaxSpeed(200);
            else if (speed > 50) setGaugeMaxSpeed(100);
        }
        const elapsedTime = (performance.now() - testStartTimeRef.current) / 1000;
        setHistoryData(prev => [...prev, { time: elapsedTime, download: speed }]);
      };
      const downloadResult = await measureDownloadSpeed(downloadTestUrl, onDownloadProgress);
      setDownloadSpeed(downloadResult);
      
      // UPLOAD TEST
      setTestState(TestState.TESTING_UPLOAD);
      setInstantSpeed(0); // Reset gauge for upload
      const onUploadProgress = ({ speed }: { speed: number }) => {
        setInstantSpeed(speed);
        const elapsedTime = (performance.now() - testStartTimeRef.current) / 1000;
        setHistoryData(prev => [...prev, { time: elapsedTime, upload: speed }]);
      };
      const uploadResult = await measureUploadSpeed(uploadTestUrl, onUploadProgress);
      setUploadSpeed(uploadResult);
      
      setInstantSpeed(downloadResult);
      setTestState(TestState.FINISHED);

    } catch (error: any) {
      console.error("An error occurred during the test:", error);
      setErrorMessage(error.message || "The test failed. Please check your internet connection and try again.");
      setTestState(TestState.ERROR);
    }
  }, [resetState, gaugeMaxSpeed, customDownloadUrl, customUploadUrl]);

  const getStatusText = () => {
    switch(testState) {
        case TestState.TESTING_PING: return "Testing latency & jitter...";
        case TestState.TESTING_DOWNLOAD: return "Testing download speed...";
        case TestState.TESTING_UPLOAD: return "Testing upload speed...";
        default: return "";
    }
  };
  
  const StartButton = () => (
    <button
      onClick={handleStartTest}
      disabled={isTesting}
      className={`relative w-48 h-48 md:w-56 md:h-56 rounded-full font-bold text-3xl text-white transition-all duration-300 ease-in-out transform shadow-lg hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-primary/50
        ${isTesting 
          ? 'bg-gray-500 cursor-not-allowed' 
          : 'bg-gradient-to-br from-primary to-secondary hover:scale-105'
        }`}
    >
      <span className="z-10">{testState === TestState.IDLE || isTestFinished ? 'GO' : 'Testing...'}</span>
    </button>
  );

  return (
    <div className="bg-dark-bg min-h-screen text-text-light flex flex-col items-center p-4 font-sans">
      <NetworkStatus />
      <header className="w-full max-w-4xl text-center mb-6">
        <div className="flex justify-center items-center relative">
          <h1 className="text-4xl md:text-5xl font-bold">Internet Speed Test</h1>
          {view === 'speedtest' && (
            <button 
              onClick={() => setShowSettings(s => !s)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-text-dark hover:text-primary transition-colors"
              aria-label="Advanced Settings"
            >
              <SettingsIcon />
            </button>
          )}
        </div>
        <p className="text-text-dark mt-2">Measure your network performance.</p>
        <ViewSwitcher currentView={view} onViewChange={setView} />
      </header>

      <main className="flex flex-col items-center justify-center flex-grow w-full max-w-4xl">
        {view === 'speedtest' ? (
          <>
            {showSettings && (
              <div className="w-full bg-light-bg p-4 mb-6 rounded-lg shadow-inner animate-fade-in">
                <p className="text-sm text-text-dark mb-4">You can provide custom URLs for testing. Ensure they are CORS-enabled.</p>
                <div className="mb-4">
                    <label htmlFor="downloadUrl" className="block text-sm font-medium text-text-dark mb-1">Download & Ping Test URL</label>
                    <input
                        type="url"
                        id="downloadUrl"
                        value={customDownloadUrl}
                        onChange={(e) => setCustomDownloadUrl(e.target.value)}
                        placeholder="e.g., https://cachefly.cachefly.net/10mb.test"
                        className="w-full bg-dark-bg border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-primary focus:border-primary"
                    />
                </div>
                <div>
                    <label htmlFor="uploadUrl" className="block text-sm font-medium text-text-dark mb-1">Upload Test URL</label>
                    <input
                        type="url"
                        id="uploadUrl"
                        value={customUploadUrl}
                        onChange={(e) => setCustomUploadUrl(e.target.value)}
                        placeholder="e.g., https://httpbin.org/post"
                        className="w-full bg-dark-bg border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-primary focus:border-primary"
                    />
                </div>
              </div>
            )}
            
            <div className="flex flex-col items-center justify-center h-80">
              {isTesting && <SpeedGauge speed={instantSpeed} maxSpeed={gaugeMaxSpeed} />}
              {!isTesting && <StartButton />}
            </div>

            <p className="mt-4 text-lg text-text-dark h-6">{getStatusText()}</p>
            
            {isTestFinished && (
              <div className="w-full animate-fade-in mt-4">
                  {errorMessage && (
                      <p className="mt-4 text-red-400 bg-red-900/50 p-3 rounded-md w-full max-w-lg text-center mx-auto">{errorMessage}</p>
                  )}
                  <ResultDisplay ping={ping} jitter={jitter} downloadSpeed={downloadSpeed} uploadSpeed={uploadSpeed} />
                  
                  {jitter !== null && jitter > 20 && !errorMessage && (
                     <div className="mt-6 max-w-3xl mx-auto bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg text-center">
                        <p>
                            <span className="font-bold">💡 Lời khuyên:</span> Jitter của bạn ở mức cao ({jitter.toFixed(0)} ms), cho thấy kết nối có thể không ổn định. 
                            Hãy thử công cụ <button onClick={() => setView('ping')} className="font-bold underline hover:text-yellow-100">Live Ping</button> để phân tích sâu hơn.
                        </p>
                    </div>
                  )}

                  {historyData.length > 0 && <HistoryChart data={historyData} />}
              </div>
            )}
          </>
        ) : (
          <ContinuousPingTool />
        )}
      </main>

      <footer className="text-center text-text-dark mt-auto pt-8 text-sm">
        <p>&copy; {new Date().getFullYear()} Speed Test App. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;