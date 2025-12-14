import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Wifi, Activity, ArrowDown, ArrowUp, Globe, History, Trash2, Home, Share2, Copy, Check, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// SpeedGauge Component
const SpeedGauge = ({ value, max, label, active }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const rotation = (percentage * 1.8) - 90; // -90 to 90 degrees

  return (
    <div className="relative w-64 h-32 flex items-end justify-center overflow-hidden">
      {/* Gauge Background */}
      <div className="absolute w-60 h-60 rounded-full border-[20px] border-slate-800 top-0"></div>

      {/* Gauge Arc (Simplified visual representation) */}
      <div className="absolute bottom-0 w-full text-center">
        <div className="text-4xl font-bold text-white mb-1 font-mono">
          {value.toFixed(1)}
        </div>
        <div className="text-sm text-slate-400 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
};

export default function App() {
  const [status, setStatus] = useState('idle'); // idle, downloading, uploading, complete
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({
    ping: 0,
    download: 0,
    upload: 0,
    ip: 'Loading...',
    isp: 'Loading...'
  });
  const [chartData, setChartData] = useState([]);
  const [history, setHistory] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const itemsPerPage = 10;

  const resultsRef = useRef({
    ping: 0,
    download: 0,
    upload: 0,
    ip: 'Loading...',
    isp: 'Loading...'
  });

  // Sync ref with state for UI updates
  const updateResults = (updates) => {
    resultsRef.current = { ...resultsRef.current, ...updates };
    setResults(resultsRef.current);
  };

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('speedtest_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
    // Mock IP info fetch
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        updateResults({ ip: data.ip, isp: data.org });
      })
      .catch(() => {
        updateResults({ ip: '127.0.0.1', isp: 'Localhost' });
      });
  }, []);

  const startTest = () => {
    setStatus('downloading');
    setProgress(0);
    setChartData([]);
    updateResults({ ping: Math.floor(Math.random() * 20) + 10, download: 0, upload: 0 });

    // Simulate Download
    let downloadProgress = 0;
    const downloadInterval = setInterval(() => {
      downloadProgress += 2;
      const currentSpeed = Math.random() * 50 + 50 + (downloadProgress * 0.5); // Random speed 50-150

      updateResults({ download: currentSpeed });
      setChartData(prev => [...prev, { time: downloadProgress, speed: currentSpeed }]);
      setProgress(downloadProgress / 2); // 0-50%

      if (downloadProgress >= 100) {
        clearInterval(downloadInterval);
        setStatus('uploading');
        startUpload();
      }
    }, 100);
  };

  const startUpload = () => {
    let uploadProgress = 0;
    const uploadInterval = setInterval(() => {
      uploadProgress += 2;
      const currentSpeed = Math.random() * 30 + 20 + (uploadProgress * 0.2); // Random speed 20-50

      updateResults({ upload: currentSpeed });
      // We could add upload to chart too, but keeping it simple for now
      setProgress(50 + (uploadProgress / 2)); // 50-100%

      if (uploadProgress >= 100) {
        clearInterval(uploadInterval);
        completeTest();
      }
    }, 100);
  };

  const completeTest = () => {
    setStatus('complete');
    const newResult = {
      id: Date.now(),
      date: new Date().toISOString(),
      ...resultsRef.current
    };
    // Remove the limit of 10 items to allow pagination
    const newHistory = [newResult, ...history];
    setHistory(newHistory);
    localStorage.setItem('speedtest_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    setCurrentPage(1);
    localStorage.removeItem('speedtest_history');
  };

  const formatSpeed = (speed) => speed.toFixed(1);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();

  const copyToClipboard = async (text, id = 'share') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareResult = () => {
    const text = `🚀 SpeedTest.Pro Result (${formatDate(new Date())}):\n⬇️ Download: ${formatSpeed(results.download)} Mbps\n⬆️ Upload: ${formatSpeed(results.upload)} Mbps\n📶 Ping: ${results.ping} ms\n🌐 ISP: ${results.isp}`;
    copyToClipboard(text, 'share');
  };

  const copyHistoryItem = (item) => {
    const text = `🚀 SpeedTest.Pro Result (${formatDate(item.date)}):\n⬇️ Download: ${formatSpeed(item.download)} Mbps\n⬆️ Upload: ${formatSpeed(item.upload)} Mbps\n📶 Ping: ${item.ping} ms\n🌐 ISP: ${item.isp}`;
    copyToClipboard(text, item.id);
  };

  // Sorting Logic
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedHistory = [...history].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Pagination Logic (using sortedHistory)
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedHistory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(history.length / itemsPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-4 h-4 text-slate-600" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 text-cyan-400" /> : <ArrowDown className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <main className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Activity className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">SpeedTest<span className="text-cyan-400">.Pro</span></h1>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Supervan Network</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://supervan.uk"
              className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </a>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-400 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800">
              <div className={`w-2 h-2 rounded-full ${status === 'idle' || status === 'complete' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
              {status === 'idle' ? 'Ready' : status === 'complete' ? 'Completed' : 'Testing...'}
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Primary Card: Gauge & Controls */}
          <div className="md:col-span-7 lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-sm">
            {/* Background Grid Effect */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

            <div className="relative z-10 flex flex-col items-center">
              {status === 'idle' || status === 'complete' ? (
                <div className="text-center">
                  <button
                    onClick={startTest}
                    className="group relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-slate-900 border-4 border-slate-800 flex items-center justify-center transition-all hover:scale-105 hover:border-cyan-500/50 hover:shadow-[0_0_40px_rgba(6,182,212,0.3)] active:scale-95"
                  >
                    <span className="absolute inset-0 rounded-full border border-white/5"></span>
                    {status === 'complete' ? <RotateCcw className="w-12 h-12 text-cyan-400" /> : <Play className="w-12 h-12 text-cyan-400 ml-1" />}
                  </button>
                  <p className="mt-6 text-lg font-medium text-white">
                    {status === 'complete' ? 'Test Again' : 'Start Test'}
                  </p>
                </div>
              ) : (
                <SpeedGauge
                  value={status === 'downloading' ? results.download : results.upload}
                  max={150}
                  label={status === 'downloading' ? 'Download' : status === 'uploading' ? 'Upload' : 'Initializing...'}
                  active={true}
                />
              )}
            </div>

            {/* Status Bar */}
            <div className="w-full mt-8 bg-slate-800 rounded-full h-1.5 overflow-hidden relative z-10">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ease-linear"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-center mt-2 text-slate-500 font-mono uppercase tracking-widest relative z-10">
              {status === 'idle' ? 'Ready' : status}
            </p>
          </div>

          {/* Secondary Card: Metrics Grid */}
          <div className="md:col-span-5 lg:col-span-4 space-y-6">

            {/* Live Stats */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Wifi className="w-4 h-4" /> Live Metrics
                </h2>
                <button
                  onClick={shareResult}
                  disabled={status !== 'complete'}
                  className={`text-xs flex items-center gap-1 px-2 py-1 rounded-md transition-all ${status === 'complete'
                    ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed'
                    }`}
                  title="Copy result to clipboard"
                >
                  {copiedId === 'share' ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                  {copiedId === 'share' ? 'Copied!' : 'Share'}
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-700 rounded-md"><Activity className="w-4 h-4 text-emerald-400" /></div>
                    <span className="text-slate-300 text-sm">Ping</span>
                  </div>
                  <span className="font-mono font-bold text-white">{results.ping} <span className="text-xs text-slate-500">ms</span></span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-700 rounded-md"><ArrowDown className="w-4 h-4 text-cyan-400" /></div>
                    <span className="text-slate-300 text-sm">Download</span>
                  </div>
                  <span className="font-mono font-bold text-white">{formatSpeed(results.download)} <span className="text-xs text-slate-500">Mbps</span></span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-700 rounded-md"><ArrowUp className="w-4 h-4 text-blue-400" /></div>
                    <span className="text-slate-300 text-sm">Upload</span>
                  </div>
                  <span className="font-mono font-bold text-white">{formatSpeed(results.upload)} <span className="text-xs text-slate-500">Mbps</span></span>
                </div>
              </div>
            </div>

            {/* Connection Info */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Globe className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Public IP</p>
                  <p className="text-lg text-white font-mono mt-1">{results.ip}</p>
                  <p className="text-sm text-slate-400 mt-1">{results.isp}</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM SECTION: HISTORY */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-slate-400" /> Test History
            </h2>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Clear Log
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-800/50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th
                    className="px-6 py-4 cursor-pointer hover:text-white transition-colors group"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-2">
                      Date <SortIcon columnKey="date" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 cursor-pointer hover:text-white transition-colors group"
                    onClick={() => handleSort('isp')}
                  >
                    <div className="flex items-center gap-2">
                      ISP Provider <SortIcon columnKey="isp" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors group"
                    onClick={() => handleSort('download')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Download <SortIcon columnKey="download" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors group"
                    onClick={() => handleSort('upload')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Upload <SortIcon columnKey="upload" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors group"
                    onClick={() => handleSort('ping')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Ping <SortIcon columnKey="ping" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-600">
                      No tests run yet. Start a test to see results here.
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4 font-mono text-slate-300">{formatDate(item.date)}</td>
                      <td className="px-6 py-4 text-white font-medium">{item.isp}</td>
                      <td className="px-6 py-4 text-right text-cyan-400 font-bold">{formatSpeed(item.download)}</td>
                      <td className="px-6 py-4 text-right text-blue-400 font-bold">{formatSpeed(item.upload)}</td>
                      <td className="px-6 py-4 text-right text-slate-300">{item.ping} ms</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => copyHistoryItem(item)}
                          className="p-2 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-white transition-colors"
                          title="Copy details"
                        >
                          {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {history.length > itemsPerPage && (
            <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-900/80">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === 1
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              <span className="text-sm text-slate-500">
                Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{totalPages}</span>
              </span>

              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === totalPages
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </main>

      {/* Footer for AdSense Compliance */}
      <footer className="max-w-6xl mx-auto mt-12 py-8 border-t border-slate-800 text-center text-sm text-slate-500">
        <div className="flex justify-center space-x-6 mb-4">
          <a href="https://supervan.uk/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="https://supervan.uk/terms" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="https://supervan.uk/contact" className="hover:text-white transition-colors">Contact</a>
        </div>
        <p>&copy; {new Date().getFullYear()} SuperVan Digital. All rights reserved.</p>
      </footer>
    </div>
  );
}
