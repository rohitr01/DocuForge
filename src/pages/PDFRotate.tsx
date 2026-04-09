import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, degrees } from 'pdf-lib';
import { Upload, Download, RotateCw, Settings2, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function PDFRotate() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [processUrl, setProcessUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Advanced rotate logic
  const [rotation, setRotation] = useState(90);

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
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      const pages = pdfDoc.getPages();
      pages.forEach((page) => {
        // Increment rotation over existing rotation natively
        const currentRot = page.getRotation().angle;
        page.setRotation(degrees(currentRot + rotation));
      });

      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      setProcessUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
      alert("Failed to rotate page nodes natively.");
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPdfPreview(null);
    setProcessUrl(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">PDF Rotate</h1>
        <p className="text-slate-400">Permanently adjust the structural orientation nodes of every page visually.</p>
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
              <p className="text-xl font-medium text-slate-200">Drag & drop your PDF</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="edit" className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/30 rounded-3xl p-6 h-fit space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5"/> Degree Matrix</h3>
                <button onClick={removeFile} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5"/></button>
              </div>

              <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-300">Absolute Rotation Angle</label>
                   <select 
                     title="Angle"
                     value={rotation} onChange={e => {setRotation(parseInt(e.target.value)); setProcessUrl(null);}}
                     className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white focus:border-red-500 text-sm"
                   >
                     <option value={90}>Right 90°</option>
                     <option value={180}>Upside Down 180°</option>
                     <option value={270}>Left 270° (-90°)</option>
                   </select>
                 </div>
              </div>

              <button 
                onClick={handleApply} disabled={isProcessing}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-4"
              >
                {isProcessing ? "Patching Rotation Nodes..." : "Inject Rotation Matrix"}
              </button>

              {processUrl && (
                <div className="pt-4 border-t border-white/10 mt-4">
                  <a href={processUrl} download={`rotated_${file.name}`} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors block text-center shadow-lg shadow-green-500/20">
                    <Download className="w-5 h-5 inline mr-2"/> Download Adjusted Node
                  </a>
                </div>
              )}
            </div>

            <div className="lg:col-span-3">
               <div className="bg-black/40 border border-white/5 rounded-3xl p-6 h-[700px] flex gap-4">
                  <div className="flex-[0.7] flex flex-col items-center overflow-hidden border border-white/10 rounded-xl relative transition-transform duration-500">
                     <span className="absolute top-2 left-2 bg-slate-900/80 px-3 py-1 rounded-full text-xs font-mono z-10 shadow-lg">Original Upload Array</span>
                     {pdfPreview && <iframe src={pdfPreview} className="w-full h-full bg-white border-0" title="PDF Preview" />}
                  </div>
                  
                  {processUrl ? (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col items-center overflow-hidden border-2 border-green-500/50 rounded-xl relative shadow-2xl">
                       <span className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-mono z-10 shadow-lg">Rotated Output!</span>
                       <iframe src={processUrl} className="w-full h-full bg-white border-0" title="Rotated PDF Preview" />
                    </motion.div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-xl flex-col gap-4 text-slate-500 bg-white/5 relative overflow-hidden">
                      <motion.div animate={{ rotate: rotation }} transition={{ type: "spring", stiffness: 100 }}>
                         <RotateCw className="w-16 h-16 opacity-30 text-red-500"/>
                      </motion.div>
                      Pending Rotation Map
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
