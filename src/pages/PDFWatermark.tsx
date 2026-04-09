import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { Upload, Download, Droplet, Settings2, Trash2, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type WatermarkPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'tiled';

interface WatermarkConfig {
  text: string;
  opacity: number;
  fontSize: number;
  angle: number;
  r: number; g: number; b: number;
  position: WatermarkPosition;
  marksPerPage: number;
  pageScope: 'all' | 'odd' | 'even' | 'first' | 'last' | 'range';
  pageFrom: number;
  pageTo: number;
  bold: boolean;
}

export default function PDFWatermark() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [processUrl, setProcessUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  const [cfg, setCfg] = useState<WatermarkConfig>({
    text: 'CONFIDENTIAL',
    opacity: 0.3,
    fontSize: 60,
    angle: 45,
    r: 255, g: 0, b: 0,
    position: 'center',
    marksPerPage: 1,
    pageScope: 'all',
    pageFrom: 1,
    pageTo: 1,
    bold: false,
  });

  const update = (patch: Partial<WatermarkConfig>) => { setCfg(p => ({ ...p, ...patch })); setProcessUrl(null); };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setFile(f);
      setPdfPreview(URL.createObjectURL(f));
      setProcessUrl(null);
      try {
        const ab = await f.arrayBuffer();
        const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
        const n = doc.getPages().length;
        setPageCount(n);
        update({ pageTo: n });
      } catch {}
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1,
  });

  const getPageIndices = (total: number): number[] => {
    const all = Array.from({ length: total }, (_, i) => i);
    if (cfg.pageScope === 'all') return all;
    if (cfg.pageScope === 'odd') return all.filter(i => i % 2 === 0);
    if (cfg.pageScope === 'even') return all.filter(i => i % 2 === 1);
    if (cfg.pageScope === 'first') return [0];
    if (cfg.pageScope === 'last') return [total - 1];
    if (cfg.pageScope === 'range') {
      const s = Math.max(0, cfg.pageFrom - 1);
      const e = Math.min(total - 1, cfg.pageTo - 1);
      return Array.from({ length: e - s + 1 }, (_, i) => s + i);
    }
    return all;
  };

  const getPositions = (w: number, h: number, n: number): { x: number; y: number }[] => {
    if (cfg.position === 'tiled' || n > 1) {
      // tile n marks in a grid pattern
      const positions: { x: number; y: number }[] = [];
      const cols = Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (positions.length >= n) break;
          positions.push({ x: (c + 0.5) * (w / cols), y: (r + 0.5) * (h / rows) });
        }
      }
      return positions;
    }
    const textWidth = cfg.text.length * cfg.fontSize * 0.35;
    const posMap: Record<WatermarkPosition, { x: number; y: number }> = {
      center:       { x: w / 2 - textWidth / 2, y: h / 2 },
      'top-left':   { x: 30, y: h - 80 },
      'top-right':  { x: w - textWidth - 30, y: h - 80 },
      'bottom-left':{ x: 30, y: 60 },
      'bottom-right':{ x: w - textWidth - 30, y: 60 },
      tiled:        { x: w / 2 - textWidth / 2, y: h / 2 },
    };
    return [posMap[cfg.position]];
  };

  const handleApply = async () => {
    if (!file || !cfg.text.trim()) return;
    setIsProcessing(true);
    try {
      const ab = await file.arrayBuffer();
      const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
      const pages = doc.getPages();
      const indices = getPageIndices(pages.length);

      indices.forEach(idx => {
        const page = pages[idx];
        const { width, height } = page.getSize();
        const positions = getPositions(width, height, cfg.marksPerPage);
        positions.forEach(({ x, y }) => {
          page.drawText(cfg.text, {
            x, y,
            size: cfg.fontSize,
            color: rgb(cfg.r / 255, cfg.g / 255, cfg.b / 255),
            opacity: cfg.opacity,
            rotate: degrees(cfg.angle),
          });
        });
      });

      const bytes = await doc.save();
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
      setProcessUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
      alert('Failed to apply watermark.');
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = () => { setFile(null); setPdfPreview(null); setProcessUrl(null); };

  const hexColor = `#${[cfg.r, cfg.g, cfg.b].map(v => v.toString(16).padStart(2, '0')).join('')}`;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold text-white">PDF Watermark</h1>
        <p className="text-slate-400">Stamp text watermarks with full control — tiled, per-page, scoped.</p>
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
            </div>
          </motion.div>
        ) : (
          <motion.div key="edit" className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/30 rounded-3xl p-6 h-fit space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5 text-red-400" /> Watermark Config</h3>
                <button onClick={removeFile} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5" /></button>
              </div>

              {/* Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Watermark Text</label>
                <input type="text" value={cfg.text}
                  onChange={e => update({ text: e.target.value })}
                  className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white font-mono text-sm uppercase focus:border-red-500"
                  placeholder="CONFIDENTIAL" />
              </div>

              {/* Appearance */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase">Opacity</label>
                  <input type="range" min="0.05" max="1" step="0.05" value={cfg.opacity}
                    onChange={e => update({ opacity: parseFloat(e.target.value) })}
                    className="w-full accent-red-500" />
                  <span className="text-xs text-slate-400">{(cfg.opacity * 100).toFixed(0)}%</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase">Font Size</label>
                  <input type="number" min="8" max="200" value={cfg.fontSize}
                    onChange={e => update({ fontSize: parseInt(e.target.value) || 60 })}
                    className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase">Angle °</label>
                  <input type="number" min="-360" max="360" value={cfg.angle}
                    onChange={e => update({ angle: parseInt(e.target.value) || 0 })}
                    className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase">Color</label>
                  <input type="color" value={hexColor}
                    onChange={e => {
                      const hx = e.target.value;
                      update({ r: parseInt(hx.slice(1,3),16), g: parseInt(hx.slice(3,5),16), b: parseInt(hx.slice(5,7),16) });
                    }}
                    className="w-full h-9 bg-transparent border-0 rounded-lg cursor-pointer" />
                </div>
              </div>

              {/* Marks per page */}
              <div className="space-y-2 border-t border-white/10 pt-4">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" /> Marks Per Page
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 6, 9].map(n => (
                    <button key={n} onClick={() => update({ marksPerPage: n, position: n > 1 ? 'tiled' : cfg.position })}
                      className={cn("flex-1 py-2 rounded-lg text-sm font-bold border transition-all",
                        cfg.marksPerPage === n
                          ? "bg-red-600 border-red-500 text-white"
                          : "bg-black/30 border-slate-700 text-slate-400 hover:border-slate-500"
                      )}>
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500">Uses tiled grid layout for 2+ marks automatically</p>
              </div>

              {/* Position (only for 1 mark) */}
              {cfg.marksPerPage === 1 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Position</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['top-left', 'center', 'top-right', 'bottom-left', 'tiled', 'bottom-right'] as WatermarkPosition[]).map(pos => (
                      <button key={pos} onClick={() => update({ position: pos })}
                        className={cn("py-1.5 rounded-lg text-[10px] border capitalize transition-all",
                          cfg.position === pos
                            ? "bg-red-600/30 border-red-500 text-white"
                            : "bg-black/20 border-slate-700 text-slate-500 hover:border-slate-500"
                        )}>
                        {pos.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Page scope */}
              <div className="space-y-2 border-t border-white/10 pt-4">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Apply to Pages</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['all', 'odd', 'even', 'first', 'last', 'range'] as const).map(s => (
                    <button key={s} onClick={() => update({ pageScope: s })}
                      className={cn("py-1.5 rounded-lg text-[10px] capitalize border transition-all",
                        cfg.pageScope === s
                          ? "bg-indigo-600/30 border-indigo-500 text-white"
                          : "bg-black/20 border-slate-700 text-slate-500 hover:border-slate-500"
                      )}>
                      {s}
                    </button>
                  ))}
                </div>
                {cfg.pageScope === 'range' && (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400">From</label>
                      <input type="number" min="1" max={pageCount} value={cfg.pageFrom}
                        onChange={e => update({ pageFrom: parseInt(e.target.value) || 1 })}
                        className="w-full bg-black/40 border border-slate-700 rounded-lg p-1.5 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400">To (/{pageCount})</label>
                      <input type="number" min="1" max={pageCount} value={cfg.pageTo}
                        onChange={e => update({ pageTo: parseInt(e.target.value) || pageCount })}
                        className="w-full bg-black/40 border border-slate-700 rounded-lg p-1.5 text-white text-xs" />
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleApply} disabled={isProcessing || !cfg.text.trim()}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                <Droplet className="w-4 h-4" />
                {isProcessing ? 'Stamping...' : 'Inject Watermark'}
              </button>

              {processUrl && (
                <a href={processUrl} download={`watermarked_${file.name}`}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 block text-center shadow-lg shadow-green-500/20">
                  <Download className="w-4 h-4 inline mr-1" /> Download Stamped PDF
                </a>
              )}
            </div>

            {/* Preview */}
            <div className="lg:col-span-3">
              <div className="bg-black/40 border border-white/5 rounded-3xl p-6 h-[700px] flex gap-4">
                <div className="flex-1 flex flex-col overflow-hidden border border-white/10 rounded-xl relative">
                  <span className="absolute top-2 left-2 bg-slate-900/80 px-3 py-1 rounded-full text-xs font-mono z-10">Original</span>
                  {pdfPreview && <iframe src={pdfPreview} className="w-full h-full bg-white border-0" title="PDF Preview" />}
                </div>

                {processUrl ? (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    className="flex-1 flex flex-col overflow-hidden border-2 border-red-500/50 rounded-xl relative shadow-2xl shadow-red-500/10">
                    <span className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-mono z-10">
                      Watermarked! ({cfg.marksPerPage}×/page · {cfg.pageScope})
                    </span>
                    <iframe src={processUrl} className="w-full h-full bg-white border-0" title="Watermarked PDF" />
                  </motion.div>
                ) : (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-xl flex-col gap-3 text-slate-500 relative overflow-hidden">
                    <Droplet className="w-16 h-16 opacity-20 text-red-400" />
                    <p className="text-sm">Live preview after applying</p>
                    {cfg.text && (
                      <div className="absolute inset-0 flex flex-wrap items-center justify-center pointer-events-none gap-8 p-4">
                        {Array.from({ length: cfg.marksPerPage }).map((_, i) => (
                          <span key={i} className="font-bold text-red-500 opacity-20 uppercase select-none"
                            style={{ fontSize: Math.min(cfg.fontSize * 0.4, 36) + 'px', transform: `rotate(${cfg.angle}deg)` }}>
                            {cfg.text}
                          </span>
                        ))}
                      </div>
                    )}
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
