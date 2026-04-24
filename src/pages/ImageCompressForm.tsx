import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { Upload, Download, Image as ImageIcon, Settings2, Trash2, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CompressedItem {
  id: string;
  original: File;
  compressed: File | null;
  previewOriginal: string;
  previewCompressed: string | null;
  status: 'idle' | 'compressing' | 'done' | 'error';
  saved?: number;
}

export default function ImageCompressForm() {
  const [items, setItems] = useState<CompressedItem[]>([]);
  const [mode, setMode] = useState<'low' | 'basic' | 'high' | 'target'>('basic');
  const [targetKb, setTargetKb] = useState<number>(500);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems: CompressedItem[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      original: file,
      compressed: null,
      previewOriginal: URL.createObjectURL(file),
      previewCompressed: null,
      status: 'idle'
    }));
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true
  });

  const compressItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item || item.status === 'compressing') return;

    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'compressing' } : i));

    try {
      let options: any = {
        useWebWorker: true,
        maxWidthOrHeight: 1920,
      };

      if (mode === 'low') options.initialQuality = 0.85;
      else if (mode === 'basic') options.initialQuality = 0.65;
      else if (mode === 'high') options.initialQuality = 0.35;
      else if (mode === 'target') options.maxSizeMB = targetKb / 1024;

      const result = await imageCompression(item.original, options);
      const saved = Math.round((1 - result.size / item.original.size) * 100);

      setItems(prev => prev.map(i => i.id === id ? { 
        ...i, 
        compressed: result, 
        previewCompressed: URL.createObjectURL(result), 
        status: 'done',
        saved: saved > 0 ? saved : 0
      } : i));
    } catch (error) {
      console.error(error);
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
    }
  };

  const handleBatchCompress = async () => {
    const idleItems = items.filter(i => i.status === 'idle' || i.status === 'error');
    for (const item of idleItems) {
      await compressItem(item.id);
    }
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewOriginal);
        if (item.previewCompressed) URL.revokeObjectURL(item.previewCompressed);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadAll = () => {
    items.forEach(item => {
      if (item.previewCompressed) {
        const link = document.createElement('a');
        link.href = item.previewCompressed;
        link.download = `compressed_${item.original.name}`;
        link.click();
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Batch Image Compressor</h1>
        <p className="text-slate-400">Compress dozens of images simultaneously with ultra-fast browser-side processing.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800/30 border border-white/5 rounded-3xl p-6 space-y-8 sticky top-24">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5 text-indigo-400"/> Settings</h3>
              {items.length > 0 && (
                <button onClick={() => setItems([])} className="text-xs text-red-400 hover:underline">Clear List</button>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Compression Mode</label>
                <select 
                  value={mode} onChange={(e) => setMode(e.target.value as any)}
                  className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 text-sm outline-none"
                >
                  <option value="low">Low Compress (Best Quality)</option>
                  <option value="basic">Basic Compress (Balanced)</option>
                  <option value="high">High Compress (Smallest Size)</option>
                  <option value="target">Exact Target KB Size</option>
                </select>
              </div>

              {mode === 'target' && (
                <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="space-y-2">
                  <label className="text-xs text-slate-400 uppercase font-semibold">Target Size (KB)</label>
                  <input 
                    type="number" min="10" value={targetKb} 
                    onChange={(e) => setTargetKb(Number(e.target.value) || 10)}
                    className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white text-sm"
                  />
                </motion.div>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <button 
                onClick={handleBatchCompress}
                disabled={items.length === 0 || items.every(i => i.status === 'done' || i.status === 'compressing')}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                Compress All Images
              </button>
              
              {items.some(i => i.status === 'done') && (
                <button 
                  onClick={downloadAll}
                  className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-green-500/20"
                >
                  <Download className="w-5 h-5"/> Download All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* List Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300",
              isDragActive ? "border-indigo-400 bg-indigo-400/10 scale-105" : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 text-indigo-400" />
            <p className="text-slate-300 font-medium">Drag & drop more images to batch process</p>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-3xl p-6 min-h-[500px]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Processing Queue</h4>
              <span className="text-xs font-mono text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full">{items.length} Files</span>
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {items.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-600 gap-4 opacity-30">
                    <ImageIcon className="w-16 h-16" />
                    <p>Queue is empty.</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-indigo-500/30 transition-all"
                    >
                      <div className="flex items-center gap-4 truncate flex-1">
                        <div className="w-14 h-14 bg-black/40 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 relative">
                          <img src={item.previewOriginal} alt="Thumb" className="w-full h-full object-cover" />
                          {item.status === 'compressing' && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="truncate space-y-1">
                          <p className="text-sm font-semibold text-slate-200 truncate" title={item.original.name}>{item.original.name}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-slate-500 uppercase">{formatSize(item.original.size)}</span>
                            {item.status === 'done' && item.compressed && (
                              <div className="flex items-center gap-2">
                                <ArrowRight className="w-3 h-3 text-slate-600" />
                                <span className="text-[10px] font-mono text-green-400 font-bold">{formatSize(item.compressed.size)}</span>
                                <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded ml-1">-{item.saved}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {item.status === 'done' && (
                          <a 
                            href={item.previewCompressed!} download={`compressed_${item.original.name}`}
                            className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-lg"
                          >
                            <Download className="w-5 h-5" />
                          </a>
                        )}
                        {item.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                        {item.status === 'done' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                        >
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

