import React from 'react';

type View = 'speedtest' | 'ping';

interface ViewSwitcherProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ currentView, onViewChange }) => {
  const buttonBaseClasses = "px-6 py-2 rounded-md text-sm font-bold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg focus:ring-primary";
  const activeClasses = "bg-primary text-white";
  const inactiveClasses = "bg-light-bg text-text-dark hover:bg-gray-600";

  return (
    <div className="mt-6 flex justify-center bg-dark-bg p-1 rounded-lg space-x-2">
      <button
        onClick={() => onViewChange('speedtest')}
        className={`${buttonBaseClasses} ${currentView === 'speedtest' ? activeClasses : inactiveClasses}`}
        aria-pressed={currentView === 'speedtest'}
      >
        Speed Test
      </button>
      <button
        onClick={() => onViewChange('ping')}
        className={`${buttonBaseClasses} ${currentView === 'ping' ? activeClasses : inactiveClasses}`}
        aria-pressed={currentView === 'ping'}
      >
        Live Ping
      </button>
    </div>
  );
};

export default ViewSwitcher;