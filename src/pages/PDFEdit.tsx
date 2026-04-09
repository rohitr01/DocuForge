import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, rgb } from 'pdf-lib';
import { Upload, Download, Settings2, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function PDFEdit() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [processUrl, setProcessUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Advanced PDF Edit Configurations
  const [textMode, setTextMode] = useState('');
  const [xPos, setXPos] = useState(100);
  const [yPos, setYPos] = useState(500);
  const [fontSize, setFontSize] = useState(16);
  const [r, setR] = useState(230);
  const [g, setG] = useState(25);
  const [b, setB] = useState(25);
  const [pageNode, setPageNode] = useState(1);

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
    if (!file || !textMode) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer() as ArrayBuffer;
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      const pages = pdfDoc.getPages();
      // Ensure we don't crash if page node is out of bounds
      const safeIndex = Math.min(Math.max(pageNode - 1, 0), pages.length - 1);
      const targetPage = pages[safeIndex];
      
      // We parse new lines automatically based on `line-height` representation
      const lines = textMode.split('\n');
      const lineHeight = fontSize * 1.2;

      lines.forEach((line, idx) => {
        targetPage.drawText(line, {
          x: xPos,
          y: yPos - (idx * lineHeight), // Y is from bottom in PDF coordinates
          size: fontSize,
          color: rgb(r / 255, g / 255, b / 255),
        });
      });

      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      setProcessUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
      alert("Failed to Edit PDF nodes.");
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
        <h1 className="text-4xl font-extrabold text-white">PDF Edit</h1>
        <p className="text-slate-400">Target exact node matrices and permanently embed multi-line strings into documents visually.</p>
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
                <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5"/> Annotation Node</h3>
                <button onClick={removeFile} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5"/></button>
              </div>

              <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-300">Multi-Line Injection</label>
                   <textarea rows={3}
                     value={textMode} 
                     onChange={e => {setTextMode(e.target.value); setProcessUrl(null);}}
                     className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white focus:border-red-500 text-sm"
                     placeholder="Signature Approved By...\nDate: 04/08/2026"
                   />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-xs font-medium text-slate-400">X Position (px)</label>
                       <input 
                         type="number" 
                         value={xPos} 
                         onChange={e => {setXPos(Number(e.target.value)); setProcessUrl(null);}}
                         className="w-full bg-black/40 border border-slate-700 rounded-xl p-2 text-white text-sm"
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-medium text-slate-400">Y Position (px)</label>
                       <input 
                         type="number" 
                         value={yPos} 
                         onChange={e => {setYPos(Number(e.target.value)); setProcessUrl(null);}}
                         className="w-full bg-black/40 border border-slate-700 rounded-xl p-2 text-white text-sm"
                       />
                       <p className="text-[10px] text-slate-500 absolute">(from bottom)</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4 mt-2">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Page Array</label>
                      <input type="number" min="1" value={pageNode} onChange={e => {setPageNode(parseInt(e.target.value)||1); setProcessUrl(null);}} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Font</label>
                      <input type="number" min="8" value={fontSize} onChange={e => {setFontSize(parseInt(e.target.value)||16); setProcessUrl(null);}} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Color</label>
                      <input type="color" 
                             defaultValue="#e61919"
                             onChange={e => {
                               const hex = e.target.value;
                               setR(parseInt(hex.slice(1,3), 16));
                               setG(parseInt(hex.slice(3,5), 16));
                               setB(parseInt(hex.slice(5,7), 16));
                               setProcessUrl(null);
                             }} 
                             className="w-full h-9 border-0 bg-transparent rounded-lg cursor-pointer" 
                      />
                    </div>
                 </div>
              </div>

              <button 
                onClick={handleApply} disabled={isProcessing || !textMode}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-4"
              >
                {isProcessing ? "Patching Nodes..." : "Inject Matrix"}
              </button>

              {processUrl && (
                <div className="pt-4 border-t border-white/10 mt-4">
                  <a href={processUrl} download={`edited_${file.name}`} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors block text-center shadow-lg shadow-green-500/20">
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
                       <span className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-mono z-10 shadow-lg">Edited Preview!</span>
                       <iframe src={processUrl} className="w-full h-full bg-white border-0" title="Edited PDF Preview" />
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
