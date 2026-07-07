import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  db, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  doc,
  query,
  orderBy,
  limit
} from '../lib/firebase';
import { 
  Database, 
  Terminal, 
  Play, 
  RefreshCw, 
  Cpu, 
  Code, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Server, 
  Globe, 
  Info, 
  Copy, 
  ExternalLink 
} from 'lucide-react';

interface ReceivedDataPayload {
  id: string;
  source: string;
  eventType: string;
  payload: string;
  status: 'Success' | 'Processing' | 'Blocked';
  receivedAt: any;
  ipAddress?: string;
}

export default function ExternalDataHub() {
  const [dataList, setDataList] = useState<ReceivedDataPayload[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sandbox inputs
  const [sandboxSource, setSandboxSource] = useState('KITS Student Mobile App');
  const [sandboxEvent, setSandboxEvent] = useState('student_check_in');
  const [sandboxPayload, setSandboxPayload] = useState(
    JSON.stringify({
      studentId: "KITS-2026-CSE029",
      name: "Sowmya Reddy",
      timestamp: new Date().toISOString(),
      location: "Main Gate RFID Scanner",
      batteryStatus: "89%",
      validated: true
    }, null, 2)
  );
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isCopied, setIsCopied] = useState<string | null>(null);

  // Fetch received data collection in real-time
  useEffect(() => {
    const q = query(
      collection(db, 'received_data'), 
      orderBy('receivedAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: ReceivedDataPayload[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as ReceivedDataPayload);
      });
      setDataList(items);
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading external data:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setSimResult(null);

    try {
      // Validate JSON
      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(sandboxPayload);
      } catch (jsonErr) {
        throw new Error("Invalid payload body. Please ensure it is standard JSON formatting.");
      }

      const randomIps = ['192.168.1.104', '10.0.4.15', '49.206.12.88', '172.56.29.11'];
      const mockIp = randomIps[Math.floor(Math.random() * randomIps.length)];

      const newRecord = {
        source: sandboxSource,
        eventType: sandboxEvent,
        payload: JSON.stringify(parsedPayload, null, 2),
        status: 'Success' as const,
        receivedAt: new Date().toISOString(),
        ipAddress: mockIp
      };

      // Add to Firestore database
      await addDoc(collection(db, 'received_data'), newRecord);

      setSimResult({
        success: true,
        message: `HTTP 201 Created: Payload successfully authorized, saved to Firestore, and broadcasted to active receivers.`
      });

      // Clear/refresh payload timestamp
      const updatedPayload = JSON.parse(sandboxPayload);
      if (updatedPayload.timestamp) {
        updatedPayload.timestamp = new Date().toISOString();
        setSandboxPayload(JSON.stringify(updatedPayload, null, 2));
      }
    } catch (err: any) {
      setSimResult({
        success: false,
        message: err.message || 'Failed to simulate incoming data payload.'
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleClearRecord = async (id: string) => {
    if (!window.confirm('Wipe this received payload from institutional logs?')) return;
    try {
      await deleteDoc(doc(db, 'received_data', id));
    } catch (err) {
      console.error("Failed to delete received record:", err);
    }
  };

  const handleClearAllRecords = async () => {
    if (!window.confirm('⚠️ CRITICAL: Wipe all received payloads from the database? This cannot be undone.')) return;
    try {
      for (const record of dataList) {
        await deleteDoc(doc(db, 'received_data', record.id));
      }
    } catch (err) {
      console.error("Failed to clear all received records:", err);
    }
  };

  const copyCodeToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(id);
    setTimeout(() => setIsCopied(null), 2000);
  };

  const getCurlSnippet = () => {
    const cleanPayload = sandboxPayload.replace(/\n/g, '').replace(/\s+/g, ' ');
    return `curl -X POST \\
  https://kits-guntur-autonom.web.app/api/receiver \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "${sandboxSource}",
    "eventType": "${sandboxEvent}",
    "payload": ${cleanPayload}
  }'`;
  };

  const getFetchSnippet = () => {
    return `fetch('https://kits-guntur-autonom.web.app/api/receiver', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: "${sandboxSource}",
    eventType: "${sandboxEvent}",
    payload: ${sandboxPayload.trim()}
  })
})
.then(res => res.json())
.then(data => console.log("Database Sync completed:", data));`;
  };

  return (
    <div className="space-y-6">
      {/* Overview Intro Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-3xl p-6 border border-indigo-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-500/30">
              <Globe size={11} className="animate-spin" />
              Live API Sync Channel Active
            </div>
            <h2 className="text-xl font-extrabold tracking-tight md:text-2xl font-sans">
              External Data Receiver Hub
            </h2>
            <p className="text-xs text-indigo-200 max-w-xl">
              This system acts as an institutional webhook & data sync endpoint. It exposes write paths enabling any external applications, RFID scanners, or cloud services to write data payloads securely into the KITS database.
            </p>
          </div>
          <div className="p-3.5 bg-indigo-950/60 text-indigo-400 rounded-2xl border border-indigo-800/50 flex flex-col items-center shrink-0">
            <span className="text-2xl font-black font-mono text-emerald-400">
              {dataList.length}
            </span>
            <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-300 mt-1">Payloads Received</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Real-time Payload Viewer */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Institution Database Intake Registry</h3>
              </div>
              {dataList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllRecords}
                  className="px-2.5 py-1 text-[10px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold rounded-lg transition border border-rose-200/50 dark:border-rose-900/30 cursor-pointer"
                >
                  Wipe All
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                <RefreshCw className="animate-spin text-indigo-500" size={24} />
                <span className="text-xs font-medium">Listening for database streams...</span>
              </div>
            ) : dataList.length === 0 ? (
              <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl py-12 px-4 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-600 rounded-full flex items-center justify-center mx-auto border border-slate-100 dark:border-slate-850">
                  <Server size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">No external payloads received yet</h4>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto mt-1">
                    Use the Sandbox on the right or hit the webhook with Curl to generate incoming logs.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {dataList.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-850 space-y-2.5"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                          {item.source}
                        </span>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Event: <code className="font-mono text-xs text-rose-500 font-semibold">{item.eventType}</code>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                          <CheckCircle size={10} />
                          <span>{item.status}</span>
                        </div>
                        <button
                          onClick={() => handleClearRecord(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition cursor-pointer"
                          title="Delete Payload log"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Collapsible/Formatted JSON display */}
                    <div className="bg-slate-900 dark:bg-black rounded-lg p-3 font-mono text-[10px] text-emerald-400 overflow-x-auto relative">
                      <div className="absolute top-2 right-2 text-[8px] text-slate-500 uppercase font-mono">
                        JSON Payload
                      </div>
                      <pre className="whitespace-pre">{item.payload}</pre>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                      <span>IP Source: <b className="text-slate-500">{item.ipAddress || '127.0.0.1'}</b></span>
                      <span>{new Date(item.receivedAt).toLocaleString()}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Interactive Sandbox & Docs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Webhook Sandbox */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Terminal size={18} className="text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Live Integration Sandbox</h3>
                <p className="text-[10px] text-slate-400">Simulate incoming Webhook/POST data from another website or app.</p>
              </div>
            </div>

            <form onSubmit={handleSimulateWebhook} className="space-y-3.5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Source Application / System Name</label>
                <select
                  value={sandboxSource}
                  onChange={(e) => setSandboxSource(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs border border-slate-150 dark:border-slate-850 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="KITS Student Mobile App">KITS Student Mobile App</option>
                  <option value="Placement Portal v2">Placement Portal v2</option>
                  <option value="Central Library RFID Gateway">Central Library RFID Gateway</option>
                  <option value="KITS Attendance Fingerprint Scanners">KITS Attendance Fingerprint Scanners</option>
                  <option value="SBI Tuition Payment API">SBI Tuition Payment API</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Event Action Type</label>
                <input
                  type="text"
                  value={sandboxEvent}
                  onChange={(e) => setSandboxEvent(e.target.value)}
                  placeholder="e.g. student_check_in"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs border border-slate-150 dark:border-slate-850 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Payload Content (JSON Body)</label>
                <textarea
                  value={sandboxPayload}
                  onChange={(e) => setSandboxPayload(e.target.value)}
                  rows={6}
                  className="w-full p-3 bg-slate-900 text-emerald-400 rounded-xl text-[10.5px] border border-slate-800 focus:outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSimulating}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} />
                    <span>Processing Ingestion Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play size={13} fill="currentColor" />
                    <span>Trigger Integration Intake</span>
                  </>
                )}
              </button>
            </form>

            {simResult && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`p-3 rounded-xl border flex gap-2 items-start text-[10px] ${
                  simResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400'
                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-400'
                }`}
              >
                {simResult.success ? <CheckCircle size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
                <span>{simResult.message}</span>
              </motion.div>
            )}
          </div>

          {/* Code Developer Guide Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Code size={18} className="text-slate-700 dark:text-slate-300" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 font-sans">API Integration Guide</h3>
                <p className="text-[10px] text-slate-400 font-mono">Developer Webhook Code Snippets</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Option 1: Bash Curl Post Command</span>
                  <button
                    onClick={() => copyCodeToClipboard(getCurlSnippet(), 'curl')}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Copy size={10} />
                    <span>{isCopied === 'curl' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <div className="bg-slate-900 rounded-lg p-2.5 font-mono text-[9.5px] text-slate-300 overflow-x-auto max-h-[140px]">
                  <pre className="whitespace-pre">{getCurlSnippet()}</pre>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Option 2: NodeJs Fetch Promise</span>
                  <button
                    onClick={() => copyCodeToClipboard(getFetchSnippet(), 'fetch')}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Copy size={10} />
                    <span>{isCopied === 'fetch' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <div className="bg-slate-900 rounded-lg p-2.5 font-mono text-[9.5px] text-slate-300 overflow-x-auto max-h-[140px]">
                  <pre className="whitespace-pre">{getFetchSnippet()}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
