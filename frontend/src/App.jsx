import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Database, Brain, Heart, AlertCircle, TrendingUp, Loader2, Upload, 
  FileText, ImageIcon, ShieldCheck, Zap, Printer, Microscope, Fingerprint, 
  Radio, CheckCircle2, ActivitySquare, Layers 
} from 'lucide-react';
import { ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import healthSocket from './socket';

const initialChartData = [
  { time: '10:00', val: 72 },
  { time: '10:05', val: 75 },
  { time: '10:10', val: 80 },
];

export default function App() {
  const [vitals, setVitals] = useState({ heart_rate: 0, bp: "0/0", accuracy: 84.0 });
  const [chartData, setChartData] = useState(initialChartData);
  const [aiReport, setAiReport] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [scanResult, setScanResult] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [wsStatus, setWsStatus] = useState("Connecting...");
  const [surgicalPlan, setSurgicalPlan] = useState(null);
  const [simProgress, setSimProgress] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simLog, setSimLog] = useState("Standby for neural initialization...");
  const [authLogs, setAuthLogs] = useState([]);
  const [stabilityScore, setStabilityScore] = useState(88);

  // --- NEWLY ADDED REF FOR HEATMAP ---
  const canvasRef = useRef(null);

  useEffect(() => {
    healthSocket.connect();
    const unsubscribe = healthSocket.subscribe((data) => {
      setWsStatus("Connected"); 
      setVitals(data);
      setChartData(prev => [...prev.slice(-15), { 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
        val: data.heart_rate 
      }]);
      syncStability(data);
    });
    return () => unsubscribe();
  }, []);

  // --- NEWLY ADDED ANIMATION LOGIC FOR NEURAL HEATMAP ---
  useEffect(() => {
    if (activeTab === "Neural Heatmap" && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      let animationFrame;
      const particles = Array.from({ length: 40 }, () => ({
        x: Math.random() * 800,
        y: Math.random() * 450,
        r: Math.random() * 25 + 5,
        o: Math.random(),
        s: Math.random() * 0.02 + 0.01
      }));

      const render = () => {
        ctx.clearRect(0, 0, 800, 450);
        particles.forEach(p => {
          p.o += p.s;
          if (p.o > 1 || p.o < 0) p.s *= -1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(45, 212, 191, ${Math.abs(p.o) * 0.4})`;
          ctx.fill();
        });
        animationFrame = requestAnimationFrame(render);
      };
      render();
      return () => cancelAnimationFrame(animationFrame);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "Bio-Auth") {
      fetchLogs();
    }
  }, [activeTab]);

  const fetchLogs = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/auth-logs');
      const data = await response.json();
      setAuthLogs(data.logs);
    } catch (e) {
      console.error("Auth sync failed");
      setAuthLogs([{user: "System Admin", role: "MD", status: "Verified", time: "Auto-Generated"}]);
    }
  };

  const syncStability = async (currentVitals) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/neural-sync/stability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vitals: currentVitals })
      });
      const data = await response.json();
      setStabilityScore(data.score);
    } catch (e) {
      const calculated = currentVitals.heart_rate > 100 ? 65 : 88;
      setStabilityScore(calculated); 
    }
  };

  const analyzeWithAI = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vitals: vitals })
      });
      const data = await response.json();
      setAiReport(data.report);
    } catch (error) {
      setAiReport("Consultation Error: Check if FastAPI and Gemini API are connected.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setScanResult(""); 
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("http://127.0.0.1:8000/analyze-scan", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setScanResult(data.analysis);
    } catch (error) {
      setScanResult("Failed to process scan. Check backend connection.");
    } finally {
      setIsUploading(false);
    }
  };

  const generateSurgicalPlan = () => {
    setIsLoading(true);
    setTimeout(() => {
      setSurgicalPlan({
        procedure: "Internal Fixation of Fracture",
        priority: "High",
        robotics: "DaVinci XI Enabled",
        risk: "Minimal",
        id: "NX-2026-084"
      });
      setIsLoading(false);
      startSimulation(); 
    }, 1500);
  };

  const startSimulation = () => {
    setIsSimulating(true);
    setSimProgress(0);
    setSimLog("Initializing Digital Twin...");
    const messages = [
      "Mapping vascular pathways...",
      "Simulating robotic arm trajectory...",
      "Calibrating neural latency...",
      "Finalizing predictive recovery model..."
    ];
    const interval = setInterval(() => {
      setSimProgress(prev => {
        const next = prev + 4;
        if (next % 24 === 0) setSimLog(messages[Math.floor(next/25)]);
        if (next >= 100) {
          clearInterval(interval);
          setIsSimulating(false);
          setSimLog("Simulation Complete. Ready for transmission.");
          return 100;
        }
        return next;
      });
    }, 150);
  };

  return (
    <div className="flex h-screen bg-[#0B0E14] text-white font-sans overflow-hidden">
      {/* 1. SIDEBAR */}
      <nav className="w-64 border-r border-gray-800 p-6 flex flex-col gap-8 print:hidden">
        <div className="flex items-center gap-3 text-teal-400">
          <Activity size={32} strokeWidth={3} />
          <h1 className="text-2xl font-black tracking-tighter">HealthOS</h1>
        </div>
        <div className="space-y-2">
          <NavItem icon={<Database size={18}/>} label="Dashboard" active={activeTab === "Dashboard"} onClick={() => setActiveTab("Dashboard")} />
          <NavItem icon={<Brain size={18}/>} label="Multimodal Engine" active={activeTab === "Multimodal Engine"} onClick={() => setActiveTab("Multimodal Engine")} />
          <NavItem icon={<Layers size={18}/>} label="Neural Heatmap" active={activeTab === "Neural Heatmap"} onClick={() => setActiveTab("Neural Heatmap")} />
          <NavItem icon={<Heart size={18}/>} label="ICU Digital Twin" active={activeTab === "ICU Digital Twin"} onClick={() => setActiveTab("ICU Digital Twin")} />
          <NavItem icon={<TrendingUp size={18}/>} label="Surgical Orchestrator" active={activeTab === "Surgical Orchestrator"} onClick={() => setActiveTab("Surgical Orchestrator")} />
          <div className="pt-4 mt-4 border-t border-gray-800/50">
             <NavItem icon={<Fingerprint size={18}/>} label="Bio-Auth Logs" active={activeTab === "Bio-Auth"} onClick={() => setActiveTab("Bio-Auth")} />
          </div>
        </div>
        <div className="mt-auto p-4 bg-gray-900/40 rounded-xl border border-gray-800">
          <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">System Status</p>
          <div className={`flex items-center gap-2 text-xs ${wsStatus === "Connected" ? 'text-green-400' : 'text-yellow-500'}`}>
            <span className={`w-2 h-2 rounded-full ${wsStatus === "Connected" ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
            {wsStatus}
          </div>
        </div>
      </nav>
      <main className="flex-1 p-8 overflow-y-auto print:bg-white print:text-black print:overflow-visible">
        <div className="hidden print:block mb-10 border-b-2 border-slate-900 pb-6 text-black">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Clinical Health Report</h1>
              <p className="text-sm text-slate-600 font-mono mt-1">Generated by HealthOS AI Orchestrator • 2026</p>
            </div>
            <div className="text-right text-sm font-medium">
              <p>Patient ID: <span className="font-bold">{surgicalPlan?.id || '#PX-TEMP-2026'}</span></p>
              <p>Date: {new Date().toLocaleDateString()}</p>
              <p>Time: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-8 mt-8 bg-slate-50 p-4 rounded-lg border border-slate-200 text-black">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Primary Vital</p>
              <p className="text-lg font-bold">HR: {vitals.heart_rate} BPM</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Blood Pressure</p>
              <p className="text-lg font-bold">{vitals.bp}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">System Risk</p>
              <p className={`text-lg font-bold ${vitals.heart_rate > 90 ? 'text-red-600' : 'text-teal-600'}`}>
                {vitals.heart_rate > 90 ? 'ELEVATED' : 'STABLE'}
              </p>
            </div>
          </div>
          {aiReport && (
            <div className="mt-6 border-l-4 border-teal-500 pl-4">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">AI Diagnostic Summary</p>
              <p className="text-sm leading-relaxed text-slate-800 italic">"{aiReport}"</p>
            </div>
          )}
        </div>
        {activeTab === "Dashboard" && (
          <>
            <header className="flex justify-between items-end mb-10 print:hidden">
              <div>
                <h2 className="text-4xl font-bold tracking-tight">System Overview</h2>
                <p className="text-gray-400 mt-1">Real-time health monitoring & predictive analytics</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-all border border-gray-700 shadow-lg"
                >
                  <Printer size={16} /> Export PDF
                </button>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase">Global Model Accuracy</p>
                  <p className="text-2xl font-mono text-teal-400 font-bold">{vitals.accuracy}%</p>
                </div>
              </div>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 print:grid-cols-2">
              <MetricCard title="Heart Rate" value={`${vitals.heart_rate} BPM`} detail="Real-time Stream" color="text-teal-400" />
              <MetricCard title="Blood Pressure" value={vitals.bp} detail="Stable Range" color="text-blue-400" />
              <MetricCard title="Neural Stability" value={`${stabilityScore}%`} detail="Bio-feedback Loop" color="text-purple-400" />
              <MetricCard title="Processing Load" value="42%" detail="AI Agents Active" color="text-orange-400" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#161B22] p-6 rounded-2xl border border-gray-800 print:bg-white print:border-slate-200">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 print:text-black">
                  <TrendingUp size={18} className="text-teal-400" /> Vitals History (Live)
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#2dd4bf' }}
                      />
                      <Area type="monotone" dataKey="val" stroke="#2dd4bf" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-[#161B22] p-6 rounded-2xl border border-red-900/20 flex flex-col print:hidden">
                <h3 className="text-lg font-semibold mb-4 text-red-400 flex items-center gap-2">
                  <AlertCircle size={18} /> Critical Alerts
                </h3>
                <button 
                  onClick={analyzeWithAI}
                  disabled={isLoading}
                  className="w-full mb-6 py-3 bg-teal-500 hover:bg-teal-400 disabled:bg-gray-700 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Brain size={18} />}
                  {isLoading ? "Consulting Agents..." : "Analyze with AI"}
                </button>
                {aiReport && (
                  <div className="mb-6 p-4 bg-teal-500/5 border border-teal-500/20 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] uppercase text-teal-500 font-bold tracking-widest">Agent Insights</p>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${vitals.heart_rate > 90 ? 'bg-red-500 text-white' : 'bg-green-500 text-black'}`}>
                            {vitals.heart_rate > 90 ? 'ELEVATED RISK' : 'NORMAL'}
                        </span>
                    </div>
                    <p className="text-sm text-gray-200 leading-relaxed italic">"{aiReport}"</p>
                  </div>
                )}
                <div className="space-y-4">
                  {vitals.heart_rate > 90 && (
                    <AlertBox title="Tachycardia Warning" desc={`Patient heart rate elevated at ${vitals.heart_rate} BPM`} />
                  )}
                  <AlertBox title="Node Sync Complete" desc="Federated weights merged successfully" type="info" />
                </div>
              </div>
            </div>
          </>
        )}
        {activeTab === "Neural Heatmap" && (
          <div className="max-w-6xl mx-auto py-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold italic tracking-tight text-teal-400">Neural Heatmap</h2>
                <p className="text-gray-400">High-density cortical mapping & synaptic firing load</p>
              </div>
              <div className="flex gap-4">
                <div className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs font-mono">
                  LATENCY: <span className="text-teal-400">2.4ms</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* --- UPDATED CENTRAL VIEW WITH LIVE CANVAS --- */}
              <div className="lg:col-span-2 bg-[#161B22] aspect-video rounded-3xl border border-gray-800 flex items-center justify-center relative overflow-hidden group">
                <canvas 
                  ref={canvasRef} 
                  width={800} 
                  height={450} 
                  className="absolute inset-0 w-full h-full opacity-60 z-0" 
                />
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-teal-500 via-transparent to-transparent group-hover:opacity-30 transition-opacity z-10"></div>
                <Brain size={120} className="text-teal-400 opacity-40 animate-pulse relative z-20" />
                <p className="absolute bottom-6 text-xs font-mono text-gray-400 uppercase tracking-widest z-20">Live Cortical Stream Active</p>
              </div>
              <div className="space-y-6">
                <div className="bg-[#161B22] p-6 rounded-2xl border border-gray-800">
                  <h3 className="text-sm font-bold uppercase text-teal-400 mb-6 flex items-center gap-2">
                    <ActivitySquare size={16} /> Regional Load
                  </h3>
                  <div className="space-y-6">
                    {['Frontal', 'Parietal', 'Temporal', 'Occipital'].map(lobe => (
                      <div key={lobe}>
                        <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                          <span className="text-gray-400">{lobe} Lobe</span>
                          <span className="text-white">{Math.floor(Math.random() * 40) + 30}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-teal-500 transition-all duration-1000" 
                            style={{ width: `${Math.floor(Math.random() * 60) + 20}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-6 bg-teal-500/5 border border-teal-500/20 rounded-2xl">
                    <p className="text-xs text-teal-500 font-bold uppercase mb-2 tracking-widest">Synaptic Activity</p>
                    <p className="text-sm text-gray-400 leading-relaxed italic">"Primary motor cortex showing stable firing patterns. No seizure-threshold anomalies detected."</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "Multimodal Engine" && (
          <div className="max-w-6xl mx-auto py-12">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-2">Multimodal Vision Engine</h2>
              <p className="text-gray-400 text-lg">Neural feature extraction from medical imaging</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#161B22] border-2 border-dashed border-gray-700 p-8 rounded-3xl flex flex-col items-center justify-center text-center hover:border-teal-500/50 transition-colors group h-[450px] relative overflow-hidden">
                {previewUrl ? (
                  <div className="w-full h-full p-2">
                    <img src={previewUrl} alt="Medical Preview" className="w-full h-full object-contain rounded-2xl shadow-2xl" />
                    <button onClick={() => setPreviewUrl(null)} className="absolute top-4 right-4 bg-red-500 p-2 rounded-full hover:bg-red-600 transition-colors">
                      <AlertCircle size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="text-gray-600 group-hover:text-teal-400 mb-4 transition-colors" size={48} />
                    <h3 className="text-xl font-bold mb-2">Medical Scan Upload</h3>
                    <p className="text-gray-500 text-sm mb-6 max-w-xs">Select X-Ray, MRI, or CT scan for autonomous analysis</p>
                  </>
                )}
                <input type="file" id="scan-upload" className="hidden" onChange={handleFileUpload} />
                <label htmlFor="scan-upload" className="bg-white text-black px-8 py-3 rounded-xl font-bold cursor-pointer hover:bg-teal-400 transition-all">
                  {isUploading ? "Neural Scanning..." : previewUrl ? "Replace Scan" : "Choose File"}
                </label>
              </div>
              <div className="bg-[#161B22] p-8 rounded-3xl border border-gray-800 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-teal-400 mb-6">
                  <FileText size={24} />
                  <h3 className="font-bold uppercase tracking-widest text-sm">Diagnostic Vision Report</h3>
                </div>
                {scanResult ? (
                  <div className="animate-in fade-in slide-in-from-right-4">
                    <div className="p-6 bg-teal-500/5 border border-teal-500/20 rounded-2xl mb-6">
                      <p className="text-xl text-gray-200 leading-relaxed italic">"{scanResult}"</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="px-4 py-2 bg-gray-900 rounded-xl border border-gray-800">
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Confidence</p>
                        <p className="text-teal-400 font-mono font-bold">98.2%</p>
                      </div>
                      <div className="px-4 py-2 bg-gray-900 rounded-xl border border-gray-800">
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Status</p>
                        <p className="text-blue-400 font-mono font-bold">Verified</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-600 py-20">
                    <ImageIcon size={64} className="mb-4 opacity-20" />
                    <p className="text-sm italic">{isUploading ? "AI Agents analyzing pixels..." : "Awaiting input scan for analysis"}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === "Surgical Orchestrator" && (
          <div className="max-w-5xl mx-auto py-12">
            <div className="bg-[#161B22] p-10 rounded-3xl border border-gray-800 shadow-2xl">
              <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-orange-500/10 rounded-2xl">
                    <TrendingUp className="text-orange-500" size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold italic tracking-tight text-orange-500">Surgical Orchestrator</h2>
                    <p className="text-gray-400 text-sm">Autonomous planning & robotics coordination</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Neural Progress</p>
                  <p className="text-lg font-mono text-teal-400">{isSimulating ? `${simProgress}%` : "READY"}</p>
                </div>
              </div>
              {!surgicalPlan ? (
                <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/20">
                  <Zap className="mx-auto mb-4 text-gray-700" size={48} />
                  <p className="text-gray-500 mb-6 font-medium">No active surgical requirements detected from vitals.</p>
                  <button onClick={generateSurgicalPlan} className="px-10 py-4 bg-orange-500 text-black font-black rounded-xl hover:bg-orange-400 transition-all flex items-center gap-3 mx-auto shadow-lg shadow-orange-500/20">
                    {isLoading ? <Loader2 className="animate-spin" /> : <Zap size={20} />}
                    GENERATE PROCEDURE PLAN
                  </button>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                  {isSimulating && (
                    <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                       <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                         <span>Neural Simulation Active</span>
                         <span>{simProgress}%</span>
                       </div>
                       <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${simProgress}%` }}></div>
                       </div>
                       <p className="text-[10px] text-gray-500 mt-2 font-mono">LOG: {simLog}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-gray-900/60 rounded-2xl border border-gray-800">
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Procedure</p>
                      <p className="text-xl font-bold text-white">{surgicalPlan.procedure}</p>
                    </div>
                    <div className="p-6 bg-gray-900/60 rounded-2xl border border-gray-800">
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Robotics Link</p>
                      <p className="text-xl font-bold text-teal-400">{surgicalPlan.robotics}</p>
                    </div>
                    <div className="p-6 bg-gray-900/60 rounded-2xl border border-gray-800">
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Vitals Sync</p>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <p className="text-xl font-bold text-white">{vitals.heart_rate} BPM</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-orange-500 mb-4 flex items-center gap-2">
                        <ShieldCheck size={18} /> Pre-Op Briefing Checklist
                      </h3>
                      <CheckItem label="Patient Identity Verified via Bio-Sync" status="completed" />
                      <CheckItem label="Site Marking Confirmed by Multimodal Vision" status="completed" />
                      <CheckItem label="Robotic Arm Calibration (DaVinci XI)" status="completed" />
                      <CheckItem label="Anesthesia Depth Prediction Modeled" status={simProgress === 100 ? "completed" : "pending"} />
                      <CheckItem label="Blood Units Reserved (O-Negative)" status="completed" />
                    </div>
                    <div className="flex flex-col gap-6">
                      <div className="p-6 bg-teal-500/5 border border-teal-500/20 rounded-2xl flex-1">
                        <h3 className="text-sm font-bold uppercase text-teal-500 mb-3">Orchestration Insight</h3>
                        <p className="text-sm text-gray-300 leading-relaxed italic">
                          "Entry path optimized for minimally invasive fixation. Robotics will maintain autonomous stabilization while heart rate is {vitals.heart_rate} BPM."
                        </p>
                      </div>
                      <button className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-3">
                        <FileText size={20} />
                        TRANSMIT TO THEATRE 4
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === "ICU Digital Twin" && (
          <div className="max-w-6xl mx-auto py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-[#161B22] p-8 rounded-3xl border border-gray-800 flex flex-col shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3">
                      <Heart className="text-teal-500 animate-pulse" size={28} /> 
                      Physiological Simulation
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Predictive recovery modeling based on current BPM: {vitals.heart_rate}</p>
                  </div>
                  <div className="px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-xl">
                    <p className="text-[10px] text-teal-500 font-bold uppercase tracking-widest">Model Sync</p>
                    <p className="text-sm font-mono text-white">ACTIVE (99.2%)</p>
                  </div>
                </div>
                <div className="h-80 w-full mt-4">
                  <p className="text-xs text-gray-500 mb-6 uppercase font-bold tracking-widest text-center">Stability Forecast (Next 6 Hours)</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { time: 'T+1h', stability: 88 },
                      { time: 'T+2h', stability: 85 },
                      { time: 'T+3h', stability: 92 },
                      { time: 'T+4h', stability: 94 },
                      { time: 'T+5h', stability: 90 },
                      { time: 'T+6h', stability: 95 },
                    ]}>
                      <defs>
                        <linearGradient id="colorStability" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                      <Area type="monotone" dataKey="stability" stroke="#2dd4bf" fillOpacity={1} fill="url(#colorStability)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-[#161B22] p-6 rounded-3xl border border-gray-800">
                  <h3 className="text-sm font-bold uppercase text-gray-500 mb-6 flex items-center gap-2">
                    <AlertCircle size={16} /> Neural Risk Analysis
                  </h3>
                  <div className="space-y-6">
                    <RiskBar label="Recovery Probability" value={94} color="bg-teal-500" />
                    <RiskBar label="Complication Risk" value={12} color="bg-orange-500" />
                    <RiskBar label="Neural Sync Stability" value={stabilityScore} color="bg-purple-500" />
                  </div>
                </div>
                <div className="bg-teal-500/5 border border-teal-500/20 p-6 rounded-3xl">
                  <h3 className="text-[10px] font-black uppercase text-teal-500 mb-3 tracking-widest">Digital Twin Insight</h3>
                  <p className="text-sm text-gray-300 leading-relaxed italic">
                    "Simulation suggests current heart rate of {vitals.heart_rate} BPM is optimal for procedure. Predicted post-op stability is high with no respiratory stressors detected."
                  </p>
                </div>
                <button 
                  onClick={startSimulation}
                  disabled={isSimulating}
                  className="w-full py-4 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl"
                >
                  {isSimulating ? <Loader2 className="animate-spin" size={18} /> : <ActivitySquare size={18} />}
                  {isSimulating ? `Running Sim... ${simProgress}%` : "Run Fresh Simulation"}
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === "Bio-Auth" && (
           <div className="max-w-4xl mx-auto py-12">
              <div className="bg-[#161B22] border border-gray-800 rounded-3xl p-8">
                 <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <Fingerprint className="text-purple-500" /> Security Access Logs
                    </h2>
                    <button onClick={fetchLogs} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                       <Radio size={20} className="text-gray-500" />
                    </button>
                 </div>
                 <div className="space-y-4">
                    {authLogs.length > 0 ? authLogs.map((log, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-gray-900/50 rounded-xl border border-gray-800 animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                        <div className="flex gap-4 items-center">
                           <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-500">
                             {log.status === "Verified" ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
                           </div>
                           <div>
                              <p className="text-sm font-bold">{log.user}</p>
                              <p className="text-[10px] text-gray-500 uppercase">{log.role} • {log.status}</p>
                           </div>
                        </div>
                        <p className="text-xs font-mono text-gray-500">{log.time}</p>
                      </div>
                    )) : (
                      <div className="text-center py-10">
                        <Loader2 className="animate-spin mx-auto mb-2 text-gray-700" />
                        <p className="text-gray-600 italic">Synchronizing access ledger...</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        )}
        <div className="hidden print:flex justify-between items-center mt-20 border-t border-slate-200 pt-8 text-black">
          <p className="text-[10px] text-slate-400 font-mono">Blockchain Verification Hash: 0x82f...a2026</p>
          <div className="text-right">
            <div className="w-48 h-px bg-slate-900 mb-2 ml-auto"></div>
            <p className="text-[10px] font-bold uppercase tracking-widest">Authorizing Physician Signature</p>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group ${active ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-200'}`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </div>
  );
}

function MetricCard({ title, value, detail, color }) {
  return (
    <div className="bg-[#161B22] p-5 rounded-2xl border border-gray-800 hover:border-gray-700 transition-colors print:bg-white print:border-slate-200 print:text-black">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</p>
      <p className={`text-2xl font-bold my-1 ${color} print:text-black`}>{value}</p>
      <p className="text-[10px] text-gray-600 font-medium">{detail}</p>
    </div>
  );
}

function AlertBox({ title, desc, type = "danger" }) {
  const isDanger = type === "danger";
  return (
    <div className={`p-4 rounded-xl border-l-4 ${isDanger ? 'bg-red-500/5 border-red-500' : 'bg-blue-500/5 border-blue-500'}`}>
      <p className={`text-xs font-bold uppercase ${isDanger ? 'text-red-400' : 'text-blue-400'}`}>{title}</p>
      <p className="text-[11px] text-gray-400 mt-1">{desc}</p>
    </div>
  );
}

function CheckItem({ label, status }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-900/40 rounded-lg border border-gray-800/50">
      <span className="text-xs text-gray-300">{label}</span>
      {status === "completed" ? (
        <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded">
          <ShieldCheck size={12} /> READY
        </div>
      ) : (
        <div className="flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
          <Loader2 size={12} className="animate-spin" /> SYNCING
        </div>
      )}
    </div>
  );
}

function RiskBar({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
        <span className="text-gray-400">{label}</span>
        <span className="text-white">{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  );
}