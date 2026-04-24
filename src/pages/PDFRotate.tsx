import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, degrees } from 'pdf-lib';
import { Upload, Download, Settings2, Trash2, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface RotateItem {
  id: string;
  original: File;
  processed: string | null;
  status: 'idle' | 'processing' | 'done' | 'error';
}

export default function PDFRotate() {
  const [items, setItems] = useState<RotateItem[]>([]);
  const [rotation, setRotation] = useState(90);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems: RotateItem[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      original: file,
      processed: null,
      status: 'idle'
    }));
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true
  });

  const rotateItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item || item.status === 'processing') return;

    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'processing' } : i));

    try {
      const arrayBuffer = await item.original.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      const pages = pdfDoc.getPages();
      pages.forEach((page) => {
        const currentRot = page.getRotation().angle;
        page.setRotation(degrees(currentRot + rotation));
      });

      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setItems(prev => prev.map(i => i.id === id ? { ...i, processed: url, status: 'done' } : i));
    } catch (e) {
      console.error(e);
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
    }
  };

  const handleBatchRotate = async () => {
    setIsProcessingAll(true);
    const pending = items.filter(i => i.status !== 'done');
    for (const item of pending) {
      await rotateItem(item.id);
    }
    setIsProcessingAll(false);
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item && item.processed) {
        URL.revokeObjectURL(item.processed);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const downloadAll = () => {
    items.forEach(item => {
      if (item.processed) {
        const link = document.createElement('a');
        link.href = item.processed;
        link.download = `rotated_${item.original.name}`;
        link.click();
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 py-8 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Batch PDF Rotate</h1>
        <p className="text-slate-400">Rotate hundreds of PDF documents simultaneously with native page node adjustment.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800/30 border border-white/5 rounded-3xl p-6 space-y-8 sticky top-24">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-red-400"/> Degree Matrix
              </h3>
              {items.length > 0 && (
                <button onClick={() => setItems([])} className="text-xs text-red-400 hover:underline">Clear Queue</button>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Absolute Rotation Angle</label>
                <select 
                  value={rotation} 
                  onChange={e => {
                    setRotation(parseInt(e.target.value));
                    // Reset processed items if rotation changes? 
                    // Actually, better to just let them rotate again or clear.
                  }}
                  className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white focus:border-red-500 text-sm outline-none"
                >
                  <option value={90}>Right 90°</option>
                  <option value={180}>Upside Down 180°</option>
                  <option value={270}>Left 270° (-90°)</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <button 
                onClick={handleBatchRotate}
                disabled={items.length === 0 || isProcessingAll}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-red-500/20"
              >
                {isProcessingAll ? "Processing..." : "Rotate All PDFs"}
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
              "border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300",
              isDragActive ? "border-red-400 bg-red-400/10 scale-105" : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
            )}
          >
            <input {...getInputProps()} />
            <div className="bg-red-500/20 p-4 rounded-full">
              <Upload className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-slate-300 font-medium text-lg">Batch Upload for PDF Rotation</p>
            <p className="text-xs text-slate-500">Perfect for correcting scanned document orientation</p>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-3xl p-6 min-h-[500px]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Processing Queue</h4>
              <span className="text-xs font-mono text-red-400 bg-red-400/10 px-3 py-1 rounded-full">{items.length} Files</span>
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {items.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-600 gap-4 opacity-30">
                    <FileText className="w-16 h-16" />
                    <p>No PDFs selected.</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-red-500/30 transition-all"
                    >
                      <div className="flex items-center gap-4 truncate flex-1">
                        <div className="w-14 h-14 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-red-500/20 relative">
                          <FileText className="w-6 h-6 text-red-400" />
                          {item.status === 'processing' && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                              <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="truncate space-y-1">
                          <p className="text-sm font-semibold text-slate-200 truncate" title={item.original.name}>{item.original.name}</p>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-slate-500 uppercase font-mono">{(item.original.size / 1024).toFixed(1)} KB</span>
                             {item.status === 'done' && (
                               <span className="text-[10px] text-green-400 font-bold uppercase">Rotated {rotation}°</span>
                             )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {item.status === 'done' && item.processed && (
                          <a 
                            href={item.processed} download={`rotated_${item.original.name}`}
                            className="p-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg"
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
