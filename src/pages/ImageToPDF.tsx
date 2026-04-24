import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, PageSizes } from 'pdf-lib';
import { Upload, Download, FileImage, Trash2, ArrowUp, ArrowDown, Settings, Eye, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type PageSize = 'A4' | 'FIT' | 'LETTER';
type MarginSize = 'NONE' | 'SMALL' | 'MEDIUM' | 'LARGE';
type ImageScale = 'FIT' | 'FILL';

const MARGIN_MAP: Record<MarginSize, number> = {
  NONE: 0,
  SMALL: 20,
  MEDIUM: 40,
  LARGE: 60
};

type QueuedFile = {
  id: string;
  file: File;
  preview: string;
};

export default function ImageToPDF() {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Settings
  const [pageSize, setPageSize] = useState<PageSize>('A4');
  const [marginSize, setMarginSize] = useState<MarginSize>('SMALL');
  const [imageScale, setImageScale] = useState<ImageScale>('FIT');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file)
    }));
    setFiles(prev => [...prev, ...newFiles]);
    setPdfUrl(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: true,
    noClick: true
  });

  const handleConvert = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const margin = MARGIN_MAP[marginSize];
      
      for (const item of files) {
        const { file } = item;
        const arrayBuffer = await file.arrayBuffer() as ArrayBuffer;
        let image;
        
        try {
          if (file.type === 'image/png') {
            image = await pdfDoc.embedPng(arrayBuffer);
          } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
            image = await pdfDoc.embedJpg(arrayBuffer);
          } else {
            // WebP or other - convert to jpeg via canvas
            const img = new Image();
            img.src = item.preview;
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = () => reject(new Error("Failed to load image for canvas conversion"));
            });
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            const jpgUrl = canvas.toDataURL('image/jpeg', 0.9);
            const jpgBuffer = await fetch(jpgUrl).then(res => res.arrayBuffer());
            image = await pdfDoc.embedJpg(jpgBuffer);
          }
        } catch (err) {
          console.warn(`Skipping file ${file.name} due to embed error`, err);
          continue;
        }

        let pageWidth, pageHeight;
        if (pageSize === 'A4') {
          [pageWidth, pageHeight] = PageSizes.A4;
        } else if (pageSize === 'LETTER') {
          [pageWidth, pageHeight] = PageSizes.Letter;
        } else {
          // FIT to Image
          pageWidth = image.width + (margin * 2);
          pageHeight = image.height + (margin * 2);
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        const availableWidth = pageWidth - (margin * 2);
        const availableHeight = pageHeight - (margin * 2);
        
        let drawWidth = image.width;
        let drawHeight = image.height;

        if (imageScale === 'FIT') {
          const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
          drawWidth = image.width * scale;
          drawHeight = image.height * scale;
        } else if (imageScale === 'FILL') {
          const scale = Math.max(availableWidth / image.width, availableHeight / image.height);
          drawWidth = image.width * scale;
          drawHeight = image.height * scale;
        }

        // Center image
        const x = margin + (availableWidth - drawWidth) / 2;
        const y = margin + (availableHeight - drawHeight) / 2;

        page.drawImage(image, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (e: any) {
      console.error(e);
      alert("Failed to convert to PDF: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (index: number) => {
    const item = files[index];
    if (item.preview) URL.revokeObjectURL(item.preview);
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPdfUrl(null);
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFiles.length) return;
    [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
    setFiles(newFiles);
    setPdfUrl(null);
  };

  const resetAll = () => {
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setPdfUrl(null);
    setShowPreview(false);
  };

  useEffect(() => {
    return () => {
      files.forEach(f => URL.revokeObjectURL(f.preview));
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 py-8 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Image to PDF</h1>
        <p className="text-slate-400">Convert images into professional, print-ready PDF documents with custom layouts.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left: Settings & Upload */}
        <div className="lg:col-span-4 space-y-6">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 group min-h-[250px]",
              isDragActive ? "border-indigo-400 bg-indigo-400/10 scale-105 shadow-2xl shadow-indigo-500/20" : "border-slate-700 bg-slate-800/30 hover:border-indigo-500 hover:bg-slate-800/50"
            )}
            onClick={open}
          >
            <input {...getInputProps()} />
            <div className="bg-indigo-500/20 p-5 rounded-2xl group-hover:scale-110 transition-transform shadow-xl">
              <Upload className="w-10 h-10 text-indigo-400" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-bold text-slate-200">Upload Multiple Files</p>
              <button 
                onClick={(e) => { e.stopPropagation(); open(); }}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
              >
                Browse Images
              </button>
              <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">PNG, JPG, WEBP • Batch Mode</p>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl shadow-black/20">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-400" /> Export Configuration
            </h3>
            
            <div className="space-y-5">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">1. PDF Size</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['A4', 'LETTER', 'FIT'] as PageSize[]).map(s => (
                    <button 
                      key={s} onClick={() => setPageSize(s)}
                      className={cn("py-3 px-1 rounded-xl text-[10px] font-black border transition-all", 
                        pageSize === s ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20" : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10")}
                    >
                      {s === 'FIT' ? 'Fit to Image' : s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">2. Margin Size</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['NONE', 'SMALL', 'MEDIUM', 'LARGE'] as MarginSize[]).map(m => (
                    <button 
                      key={m} onClick={() => setMarginSize(m)}
                      className={cn("py-3 px-1 rounded-xl text-[10px] font-black border transition-all", 
                        marginSize === m ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20" : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10")}
                    >
                      {m.charAt(0) + m.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">3. Image Size</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['FIT', 'FILL'] as ImageScale[]).map(s => (
                    <button 
                      key={s} onClick={() => setImageScale(s)}
                      className={cn("py-3 px-1 rounded-xl text-[10px] font-black border transition-all", 
                        imageScale === s ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20" : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10")}
                    >
                      {s === 'FIT' ? 'Fit Inside' : 'Fill Page'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <button 
                onClick={handleConvert} disabled={isProcessing || files.length === 0}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/30 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
              >
                {isProcessing ? <RefreshCcw className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-6 h-6"/> Convert to PDF</>}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={resetAll}
                  className="py-3 bg-slate-700 hover:bg-red-500/20 hover:text-red-400 text-slate-300 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-white/5"
                >
                  <RefreshCcw className="w-4 h-4" /> Reset
                </button>
                <button 
                  onClick={() => pdfUrl && setShowPreview(true)}
                  disabled={!pdfUrl}
                  className="py-3 bg-white/10 hover:bg-indigo-500/20 hover:text-indigo-400 text-slate-300 rounded-xl font-bold text-sm transition-all disabled:opacity-30 flex items-center justify-center gap-2 border border-white/5"
                >
                  <Eye className="w-4 h-4" /> PDF Preview
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Queue & Preview */}
        <div className="lg:col-span-8">
          <div className="bg-black/40 border border-white/10 rounded-3xl p-6 min-h-[500px] flex flex-col gap-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Image Sequence</h4>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full uppercase tracking-tighter">{files.length} Files Queued</span>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-auto max-h-[600px] pr-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                {files.length === 0 ? (
                  <div className="h-[400px] flex flex-col items-center justify-center text-slate-600 gap-4 opacity-50">
                    <div className="p-8 bg-white/5 rounded-full"><FileImage className="w-16 h-16" /></div>
                    <p className="font-bold text-lg">No images selected yet.</p>
                    <p className="text-sm">Upload images to begin the conversion</p>
                  </div>
                ) : (
                  files.map((f, i) => (
                    <motion.div 
                      key={f.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded-2xl hover:border-indigo-500/50 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center gap-4 truncate">
                        <div className="w-16 h-16 bg-black/40 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 group-hover:scale-105 transition-transform">
                          <img src={f.preview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-bold text-slate-100 truncate">{f.file.name}</p>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{(f.file.size / 1024).toFixed(1)} KB • {f.file.type.split('/')[1]}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-2">
                        <div className="flex flex-col gap-1">
                          <button 
                            onClick={() => moveFile(i, 'up')} disabled={i === 0}
                            className="p-1.5 hover:bg-indigo-500/20 rounded-lg text-slate-500 hover:text-indigo-400 disabled:opacity-0 transition-all"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => moveFile(i, 'down')} disabled={i === files.length - 1}
                            className="p-1.5 hover:bg-indigo-500/20 rounded-lg text-slate-500 hover:text-indigo-400 disabled:opacity-0 transition-all"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                        <button 
                          onClick={() => removeFile(i)}
                          className="p-3 hover:bg-red-500/10 rounded-xl text-slate-600 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {pdfUrl && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-6 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between gap-4"
              >
                 <div className="flex items-center gap-3">
                   <div className="bg-indigo-500 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
                     <CheckCircle2 className="w-5 h-5 text-white" />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-white">Conversion Ready!</p>
                     <p className="text-xs text-indigo-300">Your professional PDF has been generated.</p>
                   </div>
                 </div>
                 <a 
                    href={pdfUrl} download="filedocs_images.pdf" 
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4"/> Download PDF
                  </a>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && pdfUrl && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 w-full max-w-5xl h-full rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500 rounded-lg"><FileImage className="w-5 h-5 text-white" /></div>
                  <h3 className="font-bold text-white">PDF Preview</h3>
                </div>
                <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white font-black px-4">Close</button>
              </div>
              <div className="flex-1 bg-slate-800 relative">
                <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full border-none" title="PDF Preview" />
              </div>
              <div className="p-4 bg-black/40 flex justify-center gap-4">
                <a 
                  href={pdfUrl} download="filedocs_images.pdf" 
                  className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black flex items-center gap-2 shadow-xl shadow-green-500/20 transition-all"
                >
                  <Download className="w-5 h-5"/> Download Document
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

