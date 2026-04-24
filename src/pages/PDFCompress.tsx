import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import { Upload, Download, FileArchive, Settings2, Trash2, TrendingDown, Zap, Shield, CheckCircle2, AlertCircle, Loader2, FileText, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type CompressMode = 'basic' | 'standard' | 'aggressive' | 'extreme';

interface CompressItem {
  id: string;
  file: File;
  previewUrl: string | null;
  resultUrl: string | null;
  status: 'idle' | 'compressing' | 'done' | 'error';
  oldSize: number;
  newSize: number;
  savedPct: number;
}

const MODE_INFO: Record<CompressMode, { label: string; desc: string; icon: React.ReactNode; color: string }> = {
  basic:      { label: 'Basic Rebuild',   desc: 'Safe rewrite — removes revision bloat only', icon: <Shield className="w-4 h-4" />,      color: 'blue' },
  standard:   { label: 'Standard',        desc: 'Strips metadata & flattens object streams',  icon: <TrendingDown className="w-4 h-4" />, color: 'green' },
  aggressive: { label: 'Aggressive',      desc: 'Removes all metadata, thumbnails & info',    icon: <Zap className="w-4 h-4" />,          color: 'amber' },
  extreme:    { label: 'Extreme',         desc: 'Maximum strip — strips revision tree too',    icon: <FileArchive className="w-4 h-4" />,  color: 'red' },
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

export default function PDFCompress() {
  const [items, setItems] = useState<CompressItem[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [compressionMode, setCompressionMode] = useState<CompressMode>('standard');


  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems: CompressItem[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
      resultUrl: null,
      status: 'idle',
      oldSize: file.size,
      newSize: 0,
      savedPct: 0
    }));
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, 
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true
  });

  const compressItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item || item.status === 'compressing') return;

    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'compressing' } : i));

    try {
      const ab = await item.file.arrayBuffer();
      const src = await PDFDocument.load(ab, { ignoreEncryption: true });

      // Strip metadata based on mode
      if (compressionMode !== 'basic') {
        src.setTitle(''); src.setAuthor(''); src.setSubject('');
        src.setKeywords([]); src.setProducer(''); src.setCreationDate(new Date(0));
      }
      if (compressionMode === 'aggressive' || compressionMode === 'extreme') {
        src.setCreator(''); src.setModificationDate(new Date(0));
      }

      // Copy pages into fresh document (removes orphaned objects)
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach(p => out.addPage(p));

      if (compressionMode === 'extreme') {
        out.setTitle(''); out.setAuthor(''); out.setSubject(''); out.setCreator('');
      }

      // Save options mapped to mode
      const saveOpts: any = { useObjectStreams: true };
      if (compressionMode === 'extreme') saveOpts.useObjectStreams = false;
      if (compressionMode === 'basic') { saveOpts.useObjectStreams = true; }

      const bytes = await out.save(saveOpts);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const newSize = bytes.byteLength;
      const savedPct = Math.max(0, Math.round((1 - newSize / item.oldSize) * 100));

      setItems(prev => prev.map(i => i.id === id ? { 
        ...i, 
        resultUrl: url, 
        status: 'done',
        newSize,
        savedPct
      } : i));
    } catch (e) {
      console.error(e);
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
    }
  };

  const handleBatchCompress = async () => {
    setIsProcessingAll(true);
    const idleItems = items.filter(i => i.status !== 'done');
    for (const item of idleItems) {
      await compressItem(item.id);
    }
    setIsProcessingAll(false);
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const downloadAll = () => {
    items.forEach(item => {
      if (item.resultUrl) {
        const link = document.createElement('a');
        link.href = item.resultUrl;
        link.download = `compressed_${item.file.name}`;
        link.click();
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 py-8 px-4">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Batch PDF Compress</h1>
        <p className="text-slate-400">Reduce file size for multiple PDFs by stripping hidden bloat — 100% client-side.</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar / Settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800/30 border border-white/5 rounded-3xl p-6 space-y-8 sticky top-24">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5 text-red-400" /> Settings</h3>
              {items.length > 0 && (
                <button onClick={() => setItems([])} className="text-xs text-red-400 hover:underline">Clear All</button>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-300">Compression Level</label>
              <div className="space-y-2">
                {(Object.keys(MODE_INFO) as CompressMode[]).map(m => {
                  const info = MODE_INFO[m];
                  return (
                    <button key={m} onClick={() => setCompressionMode(m)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-start gap-3",
                        compressionMode === m
                          ? `bg-${info.color}-600/20 border-${info.color}-500 text-white`
                          : "bg-black/20 border-slate-700 text-slate-400 hover:border-slate-500"
                      )}>
                      <span className="mt-0.5 shrink-0 text-slate-400">{info.icon}</span>
                      <div>
                        <div className="font-semibold text-sm">{info.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{info.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <button onClick={handleBatchCompress} disabled={items.length === 0 || isProcessingAll}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-red-500/20">
                {isProcessingAll ? "Compressing..." : items.some(i => i.status === 'done') ? "Compress Remaining" : "Compress All"}
              </button>
              
              {items.some(i => i.status === 'done') && (
                <button onClick={downloadAll}
                  className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-green-500/20">
                  <Download className="w-5 h-5"/> Download All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Queue / List */}
        <div className="lg:col-span-3 space-y-6">
          <div {...getRootProps()} className={cn(
            "border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300",
            isDragActive ? "border-red-400 bg-red-400/10 scale-105" : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
          )}>
            <input {...getInputProps()} />
            <div className="bg-red-500/20 p-6 rounded-full"><Upload className="w-10 h-10 text-red-400" /></div>
            <p className="text-xl font-medium text-slate-200">Add PDFs for batch compression</p>
            <p className="text-sm text-slate-500">100% private, browser-only processing</p>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-3xl p-6 min-h-[400px]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Processing Queue</h4>
              <span className="text-xs font-mono text-red-400 bg-red-400/10 px-3 py-1 rounded-full">{items.length} Files</span>
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {items.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-slate-600 gap-4 opacity-30">
                    <FileText className="w-16 h-16" />
                    <p>Queue is empty.</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-red-500/30 transition-all">
                      <div className="flex items-center gap-4 truncate flex-1">
                        <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-red-500/20 relative">
                          <FileText className="w-6 h-6 text-red-400" />
                          {item.status === 'compressing' && (
                            <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="truncate space-y-1">
                          <p className="text-sm font-semibold text-slate-200 truncate" title={item.file.name}>{item.file.name}</p>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-slate-500 font-mono">{fmtSize(item.oldSize)}</span>
                             {item.status === 'done' && (
                               <>
                                 <ArrowRight className="w-3 h-3 text-slate-700" />
                                 <span className="text-[10px] text-green-400 font-bold font-mono">{fmtSize(item.newSize)}</span>
                                 <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded ml-1">↓{item.savedPct}%</span>
                               </>
                             )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {item.status === 'done' && item.resultUrl && (
                          <a href={item.resultUrl} download={`compressed_${item.file.name}`}
                            className="p-2 bg-green-500/10 text-green-400 rounded-xl hover:bg-green-500 hover:text-white transition-all shadow-lg">
                            <Download className="w-5 h-5" />
                          </a>
                        )}
                        {item.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                        {item.status === 'done' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        
                        <button onClick={() => removeItem(item.id)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
