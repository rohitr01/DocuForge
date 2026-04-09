import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, Settings2, Trash2, Download, Package } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';

type ImgFormat = 'jpeg' | 'png' | 'webp';

export default function PDFToImage() {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [images, setImages] = useState<{ dataUrl: string; name: string; size: string }[]>([]);
  const [scale, setScale] = useState(2);
  const [format, setFormat] = useState<ImgFormat>('jpeg');
  const [quality, setQuality] = useState(0.92);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setImages([]);
      setSelectedPage(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1,
  });

  const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp';
  const ext = format === 'jpeg' ? 'jpg' : format;

  const handleConvert = async () => {
    if (!file) return;
    setIsProcessing(true);
    setImages([]);
    setSelectedPage(null);
    try {
      const ab = await file.arrayBuffer();
      const loadTask = pdfjsLib.getDocument({ data: new Uint8Array(ab) });
      const pdf = await loadTask.promise;
      const total = pdf.numPages;
      const baseName = file.name.replace(/\.pdf$/i, '');
      const result: { dataUrl: string; name: string; size: string }[] = [];

      for (let i = 1; i <= total; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;

        const q = format === 'png' ? undefined : quality;
        const dataUrl = canvas.toDataURL(mimeType, q);

        // estimate size from base64
        const base64Len = dataUrl.split(',')[1]?.length ?? 0;
        const sizeKb = Math.round(base64Len * 0.75 / 1024);

        result.push({
          dataUrl,
          name: `${baseName}_page${i}.${ext}`,
          size: sizeKb < 1024 ? `${sizeKb} KB` : `${(sizeKb / 1024).toFixed(1)} MB`,
        });
      }

      setImages(result);
      setSelectedPage(0);
    } catch (e) {
      console.error(e);
      alert('Extraction failed. File may be corrupted or encrypted.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAll = async () => {
    if (images.length === 0) return;

    // Dynamic import JSZip only when needed
    setIsZipping(true);
    try {
      // @ts-ignore
      const JSZip = (await import('https://cdn.skypack.dev/jszip')).default;
      const zip = new JSZip();

      for (const img of images) {
        const base64 = img.dataUrl.split(',')[1];
        zip.file(img.name, base64, { base64: true });
      }

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file?.name.replace('.pdf','')}_images.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: download individually  
      images.forEach(img => {
        const a = document.createElement('a');
        a.href = img.dataUrl;
        a.download = img.name;
        a.click();
      });
    } finally {
      setIsZipping(false);
    }
  };

  const removeFile = () => { setFile(null); setImages([]); setSelectedPage(null); };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold text-white">PDF to Image</h1>
        <p className="text-slate-400">Extract every page as a high-quality image — JPG, PNG, or WebP.</p>
      </div>

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div key="drop" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
            <div {...getRootProps()} className={cn(
              "border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center gap-6 cursor-pointer bg-slate-800/30 transition-all duration-300",
              isDragActive ? "border-red-400 bg-red-400/10 scale-105" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50"
            )}>
              <input {...getInputProps()} />
              <div className="bg-red-500/20 p-6 rounded-full"><Upload className="w-12 h-12 text-red-400" /></div>
              <p className="text-xl font-medium text-slate-200">Drag & drop your PDF here</p>
              <p className="text-sm text-slate-500">Supports any multi-page PDF document</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="edit" className="grid lg:grid-cols-4 gap-8">
            {/* ── Sidebar ── */}
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/30 rounded-3xl p-6 h-fit space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5 text-red-400" /> Export Settings</h3>
                <button onClick={removeFile} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5" /></button>
              </div>

              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 text-xs text-slate-400">
                📄 <span className="text-white font-semibold">{file.name}</span>
              </div>

              {/* Format */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Output Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['jpeg', 'png', 'webp'] as ImgFormat[]).map(f => (
                    <button key={f} onClick={() => { setFormat(f); setImages([]); }}
                      className={cn("py-2.5 rounded-xl font-bold uppercase text-sm border transition-all",
                        format === f
                          ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/30"
                          : "bg-black/30 border-slate-700 text-slate-400 hover:border-slate-500"
                      )}>
                      {f === 'jpeg' ? 'JPG' : f.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 text-center">
                  {format === 'jpeg' && 'Best for photos, smaller file size'}
                  {format === 'png' && 'Lossless, transparent backgrounds'}
                  {format === 'webp' && 'Modern format, great quality/size ratio'}
                </div>
              </div>

              {/* Resolution */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Resolution</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ v: 1, l: '1×' }, { v: 2, l: '2×' }, { v: 3, l: '3×' }].map(({ v, l }) => (
                    <button key={v} onClick={() => { setScale(v); setImages([]); }}
                      className={cn("py-2 rounded-xl font-bold text-sm border transition-all",
                        scale === v
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-black/30 border-slate-700 text-slate-400 hover:border-slate-500"
                      )}>
                      {l}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500">
                  {scale === 1 ? 'Standard (fastest)' : scale === 2 ? 'High quality (recommended)' : 'Ultra-HD (slow, large files)'}
                </p>
              </div>

              {/* Quality — JPG/WebP only */}
              {format !== 'png' && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-slate-300">Quality</label>
                    <span className="text-sm text-slate-400">{Math.round(quality * 100)}%</span>
                  </div>
                  <input type="range" min="0.5" max="1" step="0.01" value={quality}
                    onChange={e => { setQuality(parseFloat(e.target.value)); setImages([]); }}
                    className="w-full accent-red-500" />
                </div>
              )}

              <button onClick={handleConvert} disabled={isProcessing || images.length > 0}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                <FileImage className="w-4 h-4" />
                {isProcessing ? 'Extracting Pages...' : images.length > 0 ? `${images.length} pages extracted` : 'Extract Images'}
              </button>

              {images.length > 0 && (
                <>
                  <button onClick={downloadAll} disabled={isZipping}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                    <Package className="w-4 h-4" />
                    {isZipping ? 'Zipping...' : `Download All as ZIP (${images.length} files)`}
                  </button>
                  <button onClick={() => { setImages([]); setSelectedPage(null); }}
                    className="w-full py-2 border border-slate-700 text-slate-400 hover:text-white rounded-xl text-sm transition-colors">
                    Clear & Re-extract
                  </button>
                </>
              )}
            </div>

            {/* ── Main Panel ── */}
            <div className="lg:col-span-3 flex flex-col gap-4">

              {/* Compact scrollable page list */}
              {images.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/40 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <FileImage className="w-4 h-4 text-red-400" />
                      {images.length} Pages Extracted · {format.toUpperCase()}
                    </h4>
                    <span className="text-xs text-slate-500">Click a page to preview it</span>
                  </div>

                  {/* Compact scroll list */}
                  <div className="overflow-x-auto">
                    <div className="flex gap-3 pb-2" style={{ minWidth: 'max-content' }}>
                      {images.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedPage(idx)}
                          className={cn(
                            "flex-shrink-0 cursor-pointer rounded-xl overflow-hidden border-2 transition-all group relative",
                            selectedPage === idx
                              ? "border-red-500 shadow-lg shadow-red-500/30"
                              : "border-white/10 hover:border-white/30"
                          )}
                          style={{ width: 80 }}
                        >
                          {/* Tiny thumbnail */}
                          <img src={img.dataUrl} alt={`Page ${idx + 1}`}
                            className="w-full object-cover"
                            style={{ height: 100 }} />
                          {/* Name + size overlay */}
                          <div className="bg-slate-900/90 p-1.5 text-center">
                            <p className="text-[9px] text-slate-300 font-mono leading-tight">p.{idx + 1}</p>
                            <p className="text-[8px] text-slate-500">{img.size}</p>
                          </div>
                          {/* Download button on hover */}
                          <a href={img.dataUrl} download={img.name}
                            onClick={e => e.stopPropagation()}
                            className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all">
                            <Download className="w-2.5 h-2.5 text-white" />
                          </a>
                          {/* Selected badge */}
                          {selectedPage === idx && (
                            <div className="absolute top-1 left-1 bg-red-600 rounded-md px-1 py-0.5 text-[8px] text-white font-bold">
                              ▶
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Large preview of selected page */}
              <div className={cn(
                "bg-black/40 border border-white/5 rounded-3xl p-6 flex-1",
                images.length > 0 ? "min-h-[480px]" : "min-h-[600px]",
                "flex items-center justify-center"
              )}>
                {selectedPage !== null && images[selectedPage] ? (
                  <motion.div key={selectedPage} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                    className="relative w-full h-full flex flex-col items-center gap-4">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm text-slate-300 font-semibold">
                        Page {selectedPage + 1} of {images.length} · {images[selectedPage].size}
                      </span>
                      <a href={images[selectedPage].dataUrl} download={images[selectedPage].name}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-semibold transition-colors">
                        <Download className="w-4 h-4" /> Download {images[selectedPage].name.split('.').pop()?.toUpperCase()}
                      </a>
                    </div>
                    <div className="flex-1 flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 w-full">
                      <img
                        src={images[selectedPage].dataUrl}
                        alt={`Page ${selectedPage + 1}`}
                        className="max-w-full max-h-[400px] object-contain rounded-xl shadow-2xl"
                      />
                    </div>
                    {/* Quick nav */}
                    <div className="flex gap-3">
                      <button onClick={() => setSelectedPage(Math.max(0, selectedPage - 1))}
                        disabled={selectedPage === 0}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm text-white disabled:opacity-30 transition-colors">
                        ← Previous
                      </button>
                      <button onClick={() => setSelectedPage(Math.min(images.length - 1, selectedPage + 1))}
                        disabled={selectedPage === images.length - 1}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm text-white disabled:opacity-30 transition-colors">
                        Next →
                      </button>
                    </div>
                  </motion.div>
                ) : isProcessing ? (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto" />
                    <p className="text-slate-300 font-medium">Rendering pages...</p>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <FileImage className="w-20 h-20 text-red-400 opacity-30 mx-auto" />
                    <div>
                      <p className="text-xl font-semibold text-slate-300">{file.name}</p>
                      <p className="text-slate-500 mt-2">Configure settings and click Extract Images</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
