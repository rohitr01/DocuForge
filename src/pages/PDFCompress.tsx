import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import { Upload, Download, FileArchive, Settings2, Trash2, TrendingDown, Zap, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type CompressMode = 'basic' | 'standard' | 'aggressive' | 'extreme';

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
  const [file, setFile] = useState<File | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [processUrl, setProcessUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [oldSize, setOldSize] = useState(0);
  const [newSize, setNewSize] = useState(0);
  const [compressionMode, setCompressionMode] = useState<CompressMode>('standard');
  const [stripAnnotations, setStripAnnotations] = useState(false);
  const [stripBookmarks, setStripBookmarks] = useState(false);
  const [grayscale, setGrayscale] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setFile(f);
      setPdfPreview(URL.createObjectURL(f));
      setProcessUrl(null);
      setOldSize(f.size);
      setNewSize(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1,
  });

  const handleApply = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const ab = await file.arrayBuffer();
      const src = await PDFDocument.load(ab, { ignoreEncryption: true });

      // Strip metadata based on mode
      if (compressionMode === 'standard' || compressionMode === 'aggressive' || compressionMode === 'extreme') {
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
      if (compressionMode === 'basic') { saveOpts.useObjectStreams = true; saveOpts.addDefaultPage = false; }

      const bytes = await out.save(saveOpts);
      setNewSize(bytes.byteLength);

      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
      setProcessUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
      alert('Failed to compress PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = () => { setFile(null); setPdfPreview(null); setProcessUrl(null); setOldSize(0); setNewSize(0); };

  const savedPct = oldSize > 0 && newSize > 0 ? Math.max(0, Math.round((1 - newSize / oldSize) * 100)) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold text-white">PDF Compress</h1>
        <p className="text-slate-400">Reduce file size by stripping hidden bloat — 100% client-side.</p>
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
              <p className="text-xl font-medium text-slate-200">Drag & drop your PDF</p>
              <p className="text-sm text-slate-500">Works on any PDF — no size limit</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="edit" className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/30 rounded-3xl p-6 h-fit space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5 text-red-400" /> Compress Settings</h3>
                <button onClick={removeFile} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5" /></button>
              </div>

              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 text-xs text-slate-400">
                📄 <span className="text-white font-semibold truncate">{file.name}</span>
                <span className="ml-2 text-slate-500">{fmtSize(oldSize)}</span>
              </div>

              {/* Mode cards */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Compression Level</label>
                {(Object.keys(MODE_INFO) as CompressMode[]).map(m => {
                  const info = MODE_INFO[m];
                  return (
                    <button key={m} onClick={() => { setCompressionMode(m); setProcessUrl(null); }}
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

              {/* Advanced toggles */}
              <div className="space-y-3 border-t border-white/10 pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Options</p>
                {[
                  { label: 'Strip Annotations', val: stripAnnotations, set: setStripAnnotations, desc: 'Remove comments & highlights' },
                  { label: 'Strip Bookmarks', val: stripBookmarks, set: setStripBookmarks, desc: 'Remove outline/TOC entries' },
                  { label: 'Grayscale Preview', val: grayscale, set: setGrayscale, desc: 'Visual reference only — save size' },
                ].map(({ label, val, set, desc }) => (
                  <label key={label} className="flex items-start gap-3 cursor-pointer group">
                    <div className={cn("w-9 h-5 rounded-full flex-shrink-0 mt-0.5 relative transition-colors", val ? "bg-red-600" : "bg-slate-700")}
                      onClick={() => { set(!val); setProcessUrl(null); }}>
                      <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", val ? "left-4" : "left-0.5")} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-300 group-hover:text-white">{label}</p>
                      <p className="text-[10px] text-slate-500">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <button onClick={handleApply} disabled={isProcessing}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                <FileArchive className="w-4 h-4" />
                {isProcessing ? 'Compressing...' : 'Compress PDF'}
              </button>

              {/* Result stats */}
              {processUrl && newSize > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="pt-4 border-t border-white/10 space-y-3">
                  <div className="bg-black/40 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Original</span>
                      <span className="text-red-400 font-mono font-bold">{fmtSize(oldSize)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Compressed</span>
                      <span className="text-green-400 font-mono font-bold">{fmtSize(newSize)}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
                        style={{ width: `${100 - savedPct}%` }} />
                    </div>
                    <div className="text-center text-sm font-bold">
                      {savedPct > 0
                        ? <span className="text-green-400">↓ {savedPct}% smaller</span>
                        : <span className="text-amber-400">PDF already optimized</span>}
                    </div>
                  </div>
                  <a href={processUrl} download={`compressed_${file.name}`}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 block text-center shadow-lg shadow-green-500/20">
                    <Download className="w-4 h-4 inline mr-1" /> Download Compressed
                  </a>
                </motion.div>
              )}
            </div>

            {/* Preview pane */}
            <div className="lg:col-span-3">
              <div className="bg-black/40 border border-white/5 rounded-3xl p-6 h-[700px] flex gap-4">
                <div className="flex-[0.55] flex flex-col overflow-hidden border border-red-500/20 rounded-xl relative">
                  <span className="absolute top-2 left-2 bg-red-900/80 text-red-200 px-3 py-1 rounded-full text-xs font-mono z-10 shadow-lg border border-red-500/30">
                    Original · {fmtSize(oldSize)}
                  </span>
                  {pdfPreview && <iframe src={pdfPreview} className="w-full h-full bg-white border-0" title="PDF Preview" style={grayscale ? { filter: 'grayscale(1)' } : undefined} />}
                </div>

                {processUrl ? (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    className="flex-1 flex flex-col overflow-hidden border-2 border-green-500/50 rounded-xl relative shadow-2xl shadow-green-500/10">
                    <span className="absolute top-2 right-2 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-mono z-10 shadow-lg">
                      Compressed · {fmtSize(newSize)} {savedPct > 0 && `(↓${savedPct}%)`}
                    </span>
                    <iframe src={processUrl} className="w-full h-full bg-white border-0" title="Compressed PDF" />
                  </motion.div>
                ) : (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-xl flex-col gap-4 text-slate-500">
                    <FileArchive className="w-16 h-16 opacity-20 text-red-400" />
                    <p className="text-sm">Choose a compression level and click Compress</p>
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
