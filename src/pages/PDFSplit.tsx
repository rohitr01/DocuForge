import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import { Upload, Download, SplitSquareHorizontal, Settings2, Trash2, Plus, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type SplitMode = 'range' | 'halve' | 'every_n' | 'individual' | 'multi_range';
interface RangeEntry { id: number; start: number; end: number; }

export default function PDFSplit() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [mode, setMode] = useState<SplitMode>('range');
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);
  const [everyN, setEveryN] = useState(2);
  const [multiRanges, setMultiRanges] = useState<RangeEntry[]>([{ id: 1, start: 1, end: 1 }]);
  const [outputUrls, setOutputUrls] = useState<{ name: string; url: string; pages: number }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setPdfPreview(URL.createObjectURL(acceptedFiles[0]));
      setOutputUrls([]);
      try {
        const ab = await acceptedFiles[0].arrayBuffer();
        const doc = await PDFDocument.load(ab);
        const len = doc.getPages().length;
        setTotal(len);
        setRangeEnd(len);
        setMultiRanges([{ id: 1, start: 1, end: Math.ceil(len / 2) }]);
      } catch {}
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1,
  });

  const makePdf = async (srcDoc: PDFDocument, indices: number[], name: string) => {
    const out = await PDFDocument.create();
    const pages = await out.copyPages(srcDoc, indices);
    pages.forEach(p => out.addPage(p));
    const bytes = await out.save();
    const url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }));
    return { name, url, pages: indices.length };
  };

  const handleSplit = async () => {
    if (!file) return;
    setIsProcessing(true);
    setOutputUrls([]);
    try {
      const ab = await file.arrayBuffer();
      const src = await PDFDocument.load(ab);
      const results: { name: string; url: string; pages: number }[] = [];
      const base = file.name.replace('.pdf', '');

      if (mode === 'range') {
        const s = Math.max(0, rangeStart - 1);
        const e = Math.min(total - 1, rangeEnd - 1);
        if (s > e) throw new Error('Invalid range');
        const r = await makePdf(src, Array.from({ length: e - s + 1 }, (_, i) => s + i), `${base}_pages_${rangeStart}-${rangeEnd}.pdf`);
        results.push(r);

      } else if (mode === 'halve') {
        const mid = Math.ceil(total / 2);
        results.push(await makePdf(src, Array.from({ length: mid }, (_, i) => i), `${base}_part1.pdf`));
        results.push(await makePdf(src, Array.from({ length: total - mid }, (_, i) => i + mid), `${base}_part2.pdf`));

      } else if (mode === 'every_n') {
        const n = Math.max(1, everyN);
        for (let i = 0; i < total; i += n) {
          const end = Math.min(i + n, total);
          const chunk = Array.from({ length: end - i }, (_, k) => i + k);
          results.push(await makePdf(src, chunk, `${base}_chunk_${i + 1}-${end}.pdf`));
        }

      } else if (mode === 'individual') {
        for (let i = 0; i < total; i++) {
          results.push(await makePdf(src, [i], `${base}_page_${i + 1}.pdf`));
        }

      } else if (mode === 'multi_range') {
        for (let idx = 0; idx < multiRanges.length; idx++) {
          const { start, end } = multiRanges[idx];
          const s = Math.max(0, start - 1);
          const e = Math.min(total - 1, end - 1);
          if (s > e) continue;
          results.push(await makePdf(src, Array.from({ length: e - s + 1 }, (_, i) => s + i), `${base}_range${idx + 1}_pg${start}-${end}.pdf`));
        }
      }

      setOutputUrls(results);
      setPreviewIdx(0);
    } catch (err) {
      console.error(err);
      alert('Split failed. Please check your range values.');
    } finally {
      setIsProcessing(false);
    }
  };

  const addRange = () => setMultiRanges(p => [...p, { id: Date.now(), start: 1, end: total }]);
  const removeRange = (id: number) => setMultiRanges(p => p.filter(r => r.id !== id));
  const updateRange = (id: number, field: 'start' | 'end', val: number) =>
    setMultiRanges(p => p.map(r => r.id === id ? { ...r, [field]: val } : r));

  const removeFile = () => { setFile(null); setPdfPreview(null); setOutputUrls([]); setTotal(0); };

  const modeDescriptions: Record<SplitMode, string> = {
    range: 'Extract a custom page range into one PDF',
    halve: 'Auto-split the document exactly in half',
    every_n: 'Split into chunks of N pages each',
    individual: 'Every page becomes its own PDF file',
    multi_range: 'Define multiple named ranges at once',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold text-white">PDF Split</h1>
        <p className="text-slate-400">Extract pages with precision using multiple split strategies.</p>
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
            {/* Sidebar */}
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/30 rounded-3xl p-6 h-fit space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5 text-red-400" /> Split Engine</h3>
                <button onClick={removeFile} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5" /></button>
              </div>

              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 text-xs text-slate-400">
                📄 <span className="text-white font-semibold">{file.name}</span> &nbsp;·&nbsp; {total} pages
              </div>

              {/* Mode selector as clickable cards */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Split Strategy</label>
                {(['range', 'halve', 'every_n', 'individual', 'multi_range'] as SplitMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setOutputUrls([]); }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all",
                      mode === m
                        ? "bg-red-600/20 border-red-500 text-white font-semibold"
                        : "bg-black/20 border-slate-700 text-slate-400 hover:border-slate-500"
                    )}
                  >
                    <div className="font-medium capitalize">{m.replace('_', ' ')}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{modeDescriptions[m]}</div>
                  </button>
                ))}
              </div>

              {/* Mode-specific controls */}
              {mode === 'range' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">From Page</label>
                    <input type="number" min="1" max={total} value={rangeStart}
                      onChange={e => { setRangeStart(parseInt(e.target.value) || 1); setOutputUrls([]); }}
                      className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">To Page (/{total})</label>
                    <input type="number" min="1" max={total} value={rangeEnd}
                      onChange={e => { setRangeEnd(parseInt(e.target.value) || total); setOutputUrls([]); }}
                      className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm" />
                  </div>
                </div>
              )}

              {mode === 'every_n' && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Pages per Chunk</label>
                  <input type="number" min="1" max={total} value={everyN}
                    onChange={e => { setEveryN(parseInt(e.target.value) || 2); setOutputUrls([]); }}
                    className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm" />
                  <p className="text-[10px] text-slate-500">Will produce {Math.ceil(total / Math.max(1, everyN))} files</p>
                </div>
              )}

              {mode === 'individual' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300">
                  ⚠️ Will create {total} separate PDF files, one per page.
                </div>
              )}

              {mode === 'multi_range' && (
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-medium">Custom Ranges</label>
                  {multiRanges.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-2">
                      <input type="number" min="1" max={total} value={r.start}
                        onChange={e => updateRange(r.id, 'start', parseInt(e.target.value) || 1)}
                        className="w-1/2 bg-black/40 border border-slate-700 rounded-lg p-1.5 text-white text-xs" />
                      <span className="text-slate-500 text-xs">–</span>
                      <input type="number" min="1" max={total} value={r.end}
                        onChange={e => updateRange(r.id, 'end', parseInt(e.target.value) || total)}
                        className="w-1/2 bg-black/40 border border-slate-700 rounded-lg p-1.5 text-white text-xs" />
                      {multiRanges.length > 1 && (
                        <button onClick={() => removeRange(r.id)} className="text-red-400 hover:text-red-300 flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addRange} className="w-full py-1.5 border border-dashed border-slate-600 rounded-lg text-xs text-slate-400 hover:border-slate-400 flex items-center justify-center gap-1">
                    <Plus className="w-3 h-3" /> Add Range
                  </button>
                </div>
              )}

              <button
                onClick={handleSplit} disabled={isProcessing}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <SplitSquareHorizontal className="w-4 h-4" />
                {isProcessing ? 'Processing...' : 'Split Now'}
              </button>

              {/* Output list */}
              {outputUrls.length > 0 && (
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <h4 className="text-sm font-semibold text-green-400">✓ {outputUrls.length} files ready</h4>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {outputUrls.map((out, idx) => (
                      <div key={idx}
                        className={cn("flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-xs",
                          previewIdx === idx ? "border-red-500/50 bg-red-500/10" : "border-white/10 bg-black/20 hover:border-white/20"
                        )}
                        onClick={() => setPreviewIdx(idx)}>
                        <span className="flex-1 truncate text-slate-300">{out.name}</span>
                        <span className="text-slate-500 shrink-0">{out.pages}pg</span>
                        <a href={out.url} download={out.name} onClick={e => e.stopPropagation()}
                          className="text-green-400 hover:text-green-300 shrink-0">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="lg:col-span-3">
              <div className="bg-black/40 border border-white/5 rounded-3xl p-6 h-[700px] flex gap-4">
                <div className="flex-[0.55] flex flex-col overflow-hidden border border-white/10 rounded-xl relative">
                  <span className="absolute top-2 left-2 bg-slate-900/80 px-3 py-1 rounded-full text-xs font-mono z-10">
                    Original · {total} pages
                  </span>
                  {pdfPreview && <iframe src={pdfPreview} className="w-full h-full bg-white border-0 flex-1" title="PDF Preview" />}
                </div>

                {outputUrls.length > 0 ? (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    className="flex-1 flex flex-col overflow-hidden border-2 border-red-500/40 rounded-xl relative shadow-2xl">
                    <span className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-mono z-10">
                      Preview: File {previewIdx + 1}/{outputUrls.length} · {outputUrls[previewIdx]?.pages}pg
                    </span>
                    <iframe src={outputUrls[previewIdx]?.url} className="w-full h-full bg-white border-0" title="Split Output" />
                  </motion.div>
                ) : (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-xl flex-col gap-4 text-slate-500">
                    <SplitSquareHorizontal className="w-16 h-16 opacity-20 text-red-400" />
                    <p className="text-sm">Choose a strategy and click Split Now</p>
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
