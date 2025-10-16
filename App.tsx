import React, { useState, useCallback, useMemo, useRef } from 'react';
import { TestState } from './types';
import { measurePing, measureDownloadSpeed, measureUploadSpeed } from './services/speedTestService';
import SpeedGauge from './components/SpeedGauge';
import ResultDisplay from './components/ResultDisplay';
import HistoryChart from './components/HistoryChart';
import { INITIAL_GAUGE_MAX_SPEED } from './constants';

interface HistoryData {
  time: number;
  ping?: number;
  download?: number;
  upload?: number;
}

const App: React.FC = () => {
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

    try {
      // PING TEST
      setTestState(TestState.TESTING_PING);
      const onPingProgress = ({ latency }: { latency: number }) => {
        const elapsedTime = (performance.now() - testStartTimeRef.current) / 1000;
        setHistoryData(prev => [...prev, { time: elapsedTime, ping: latency }]);
      };
      const { ping: pingResult, jitter: jitterResult } = await measurePing(onPingProgress);
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
      const downloadResult = await measureDownloadSpeed(onDownloadProgress);
      setDownloadSpeed(downloadResult);
      
      // UPLOAD TEST
      setTestState(TestState.TESTING_UPLOAD);
      setInstantSpeed(0); // Reset gauge for upload
      const onUploadProgress = ({ speed }: { speed: number }) => {
        setInstantSpeed(speed);
        const elapsedTime = (performance.now() - testStartTimeRef.current) / 1000;
        setHistoryData(prev => [...prev, { time: elapsedTime, upload: speed }]);
      };
      const uploadResult = await measureUploadSpeed(onUploadProgress);
      setUploadSpeed(uploadResult);
      
      setInstantSpeed(downloadResult); // Show final download speed on gauge
      setTestState(TestState.FINISHED);

    } catch (error) {
      console.error("An error occurred during the test:", error);
      setErrorMessage("The test failed. Please check your internet connection and try again.");
      setTestState(TestState.ERROR);
    }
  }, [resetState, gaugeMaxSpeed]);

  const isTesting = useMemo(() => 
    [TestState.TESTING_PING, TestState.TESTING_DOWNLOAD, TestState.TESTING_UPLOAD].includes(testState),
    [testState]
  );
  
  const getStatusText = () => {
    switch(testState) {
        case TestState.TESTING_PING:
            return "Testing latency & jitter...";
        case TestState.TESTING_DOWNLOAD:
            return "Testing download speed...";
        case TestState.TESTING_UPLOAD:
            return "Testing upload speed...";
        case TestState.FINISHED:
            return "Test complete!";
        case TestState.ERROR:
            return "An error occurred.";
        default:
            return "Click Start to begin the test";
    }
  };

  return (
    <div className="bg-dark-bg min-h-screen text-text-light flex flex-col items-center justify-center p-4 font-sans">
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold">Internet Speed Test</h1>
        <p className="text-text-dark mt-2">Measure your network performance.</p>
      </header>

      <main className="flex flex-col items-center justify-center flex-grow w-full">
        <SpeedGauge speed={instantSpeed} maxSpeed={gaugeMaxSpeed} />
        <p className="mt-4 text-lg text-text-dark h-6">{getStatusText()}</p>
        
        {errorMessage && (
            <p className="mt-4 text-red-400 bg-red-900/50 p-3 rounded-md">{errorMessage}</p>
        )}

        <ResultDisplay ping={ping} jitter={jitter} downloadSpeed={downloadSpeed} uploadSpeed={uploadSpeed} />

        {testState === TestState.FINISHED && historyData.length > 0 && (
          <HistoryChart data={historyData} />
        )}

        <button
          onClick={!isTesting ? handleStartTest : undefined}
          disabled={isTesting}
          className={`mt-12 px-8 py-4 text-xl font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg
            ${isTesting 
              ? 'bg-gray-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-2xl'
            }`}
        >
          {isTesting ? 'Testing...' : (testState === TestState.IDLE ? 'Start' : 'Test Again')}
        </button>
      </main>

      <footer className="text-center text-text-dark mt-8 text-sm">
        <p>&copy; {new Date().getFullYear()} Speed Test App. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
