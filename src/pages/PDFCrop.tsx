import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import { Upload, Download, Settings2, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function PDFCrop() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [processUrl, setProcessUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Advanced independent padding logic
  const [padTop, setPadTop] = useState(50);
  const [padBottom, setPadBottom] = useState(50);
  const [padLeft, setPadLeft] = useState(50);
  const [padRight, setPadRight] = useState(50);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setPdfPreview(URL.createObjectURL(acceptedFiles[0]));
      setProcessUrl(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const handleApply = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer() as ArrayBuffer;
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      
      pages.forEach(page => {
        const { width, height } = page.getSize();
        // Set new crop box (x, y, width, height) where x,y is bottom-left
        // x = padLeft
        // y = padBottom
        // w = width - padLeft - padRight
        // h = height - padTop - padBottom
        page.setCropBox(padLeft, padBottom, width - padLeft - padRight, height - padTop - padBottom);
      });
      
      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      setProcessUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
      alert("Failed to crop PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPdfPreview(null);
    setProcessUrl(null);
  };

  const linkPadding = (val: number) => {
    setPadTop(val);
    setPadBottom(val);
    setPadLeft(val);
    setPadRight(val);
    setProcessUrl(null);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">PDF Crop</h1>
        <p className="text-slate-400">Preview document and modify internal bounding matrix vectors precisely.</p>
      </div>

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div key="drop" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center gap-6 cursor-pointer bg-slate-800/30 transition-all duration-300",
                isDragActive ? "border-red-400 bg-red-400/10 scale-105" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50"
              )}
            >
              <input {...getInputProps()} />
              <div className="bg-red-500/20 p-6 rounded-full"><Upload className="w-12 h-12 text-red-400" /></div>
              <p className="text-xl font-medium text-slate-200">Drag & drop your PDF here</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="edit" className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/30 rounded-3xl p-6 h-fit space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5"/> Crop Settings</h3>
                <button onClick={removeFile} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5"/></button>
              </div>

              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Top Crop (px)</label>
                      <input type="number" min="0" value={padTop} onChange={e => { setPadTop(parseInt(e.target.value)||0); setProcessUrl(null); }} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Bottom Crop (px)</label>
                      <input type="number" min="0" value={padBottom} onChange={e => { setPadBottom(parseInt(e.target.value)||0); setProcessUrl(null); }} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Left Crop (px)</label>
                      <input type="number" min="0" value={padLeft} onChange={e => { setPadLeft(parseInt(e.target.value)||0); setProcessUrl(null); }} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Right Crop (px)</label>
                      <input type="number" min="0" value={padRight} onChange={e => { setPadRight(parseInt(e.target.value)||0); setProcessUrl(null); }} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white" />
                    </div>
                 </div>

                 <button onClick={() => linkPadding(padTop)} className="w-full py-2 text-xs bg-indigo-500/20 text-indigo-400 rounded hover:bg-indigo-500/40 transition-colors">
                   Make all padding uniform (Match Top)
                 </button>
              </div>

              <button 
                onClick={handleApply} disabled={isProcessing}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isProcessing ? "Patching Box Arrays..." : "Apply Matrix Crop"}
              </button>

              {processUrl && (
                <div className="pt-4 border-t border-white/10 mt-4">
                  <a href={processUrl} download={`cropped_${file.name}`} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors block text-center shadow-lg shadow-green-500/20">
                    <Download className="w-5 h-5 inline mr-2"/> Download Cropped PDF
                  </a>
                </div>
              )}
            </div>

            <div className="lg:col-span-3">
               <div className="bg-black/40 border border-white/5 rounded-3xl p-6 h-[700px] flex gap-4">
                  <div className="flex-1 flex flex-col items-center overflow-hidden border border-white/10 rounded-xl relative">
                     <span className="absolute top-2 left-2 bg-slate-900/80 px-3 py-1 rounded-full text-xs font-mono z-10 shadow-lg">Original Upload ({file.name})</span>
                     <div className="absolute inset-0 pointer-events-none z-20 flex" style={{ padding: `${padTop}px ${padRight}px ${padBottom}px ${padLeft}px` }}>
                        <div className="w-full h-full border-4 border-dashed border-red-500/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-all"></div>
                     </div>
                     {pdfPreview && <iframe src={pdfPreview} className="w-full h-full bg-white border-0" title="PDF Preview" />}
                  </div>
                  
                  {processUrl && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col items-center overflow-hidden border-2 border-green-500/50 rounded-xl relative shadow-2xl">
                       <span className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-mono z-10 shadow-lg">Cropped Preview!</span>
                       <iframe src={processUrl} className="w-full h-full bg-white border-0" title="Cropped PDF Preview" />
                    </motion.div>
                  )}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
