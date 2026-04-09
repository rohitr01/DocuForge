import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import { Upload, Download, Settings2, Trash2, ArrowLeftRight, Shuffle } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function PDFOrganize() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [processUrl, setProcessUrl] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Advanced options
  const [orderStr, setOrderStr] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setPdfPreview(URL.createObjectURL(acceptedFiles[0]));
      setProcessUrl(null);
      setOrderStr('');
      try {
        const arrayBuffer = await acceptedFiles[0].arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages().length;
        setTotal(pages);
        const def = Array.from({length: pages}, (_, i) => i + 1).join(', ');
        setOrderStr(def);
      } catch (e) {
         alert("Invalid PDF");
      }
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
      const desiredOrder = orderStr.split(',').map(s => parseInt(s.trim()) - 1).filter(n => !isNaN(n) && n >= 0 && n < total);
      if (desiredOrder.length === 0) throw new Error("Invalid page routing array.");

      const arrayBuffer = await file.arrayBuffer() as ArrayBuffer;
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdfDoc, desiredOrder);
      
      copiedPages.forEach(page => newPdf.addPage(page));
      
      const newPdfBytes = await newPdf.save();
      const blob = new Blob([newPdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      setProcessUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      alert("Failed to organize PDF: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPdfPreview(null);
    setProcessUrl(null);
    setOrderStr('');
  };

  const reverseOrder = () => {
     if(!orderStr) return;
     const reversed = orderStr.split(',').map(s=>s.trim()).filter(Boolean).reverse().join(', ');
     setOrderStr(reversed);
     setProcessUrl(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">PDF Organize</h1>
        <p className="text-slate-400">Preview, shuffle, reverse, and precisely reconstruct PDF streams.</p>
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
                <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5"/> Sorting Config</h3>
                <button onClick={removeFile} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5"/></button>
              </div>

              <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-300">Page Ordering Array</label>
                   <textarea 
                     rows={4}
                     value={orderStr} 
                     onChange={e => {setOrderStr(e.target.value); setProcessUrl(null);}}
                     className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white focus:border-red-500 font-mono text-sm leading-relaxed"
                   />
                   <p className="text-xs text-slate-500">Comma separated pages (e.g., 3, 1, 2) out of <strong>{total}</strong> pages total. You can also duplicate numbers!</p>
                 </div>

                 <div className="grid grid-cols-2 gap-2">
                    <button onClick={reverseOrder} className="py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1"><ArrowLeftRight className="w-3 h-3"/> Reverse</button>
                    <button onClick={() => { setOrderStr(Array.from({length: total}, (_, i) => i + 1).join(', ')); setProcessUrl(null); }} className="py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1"><Shuffle className="w-3 h-3"/> Reset Standard</button>
                 </div>
              </div>

              <button 
                onClick={handleApply} disabled={isProcessing || !orderStr}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isProcessing ? "Processing Nodes..." : "Generate New Order"}
              </button>

              {processUrl && (
                <div className="pt-4 border-t border-white/10 mt-4">
                  <a href={processUrl} download={`organized_${file.name}`} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors block text-center shadow-lg shadow-green-500/20">
                    <Download className="w-5 h-5 inline mr-2"/> Download Output
                  </a>
                </div>
              )}
            </div>

            <div className="lg:col-span-3">
               <div className="bg-black/40 border border-white/5 rounded-3xl p-6 h-[700px] flex gap-4">
                  <div className="flex-1 flex flex-col items-center overflow-hidden border border-white/10 rounded-xl relative">
                     <span className="absolute top-2 left-2 bg-slate-900/80 px-3 py-1 rounded-full text-xs font-mono z-10 shadow-lg">Original Upload ({file.name})</span>
                     {pdfPreview && <iframe src={pdfPreview} className="w-full h-full bg-white border-0" title="PDF Preview" />}
                  </div>
                  
                  {processUrl && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col items-center overflow-hidden border-2 border-green-500/50 rounded-xl relative shadow-2xl">
                       <span className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-mono z-10 shadow-lg">New Ordering Preview!</span>
                       <iframe src={processUrl} className="w-full h-full bg-white border-0" title="Organized PDF Preview" />
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
