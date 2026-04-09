import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Upload, Download, Settings2, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function PDFPageNumberGen() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [processUrl, setProcessUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Advanced typography options
  const [format, setFormat] = useState('Page {x} of {y}');
  const [fontSize, setFontSize] = useState(12);
  const [r, setR] = useState(0);
  const [g, setG] = useState(0);
  const [b, setB] = useState(0);
  const [position, setPosition] = useState<'bottom-center' | 'top-right' | 'bottom-right'>('bottom-center');
  
  const [startOffset, setStartOffset] = useState(1);
  const [fontStyle, setFontStyle] = useState<'Helvetica' | 'TimesRoman' | 'Courier'>('Helvetica');

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
      const total = pages.length;
      
      const customFont = await pdfDoc.embedFont(StandardFonts[fontStyle]);

      pages.forEach((page, i) => {
        if (i + 1 < startOffset) return; // Skip pages before offset
        
        const { width, height } = page.getSize();
        // Since we may use an offset, current page number changes
        const currentNum = i + 1; 
        const text = format.replace('{x}', currentNum.toString()).replace('{y}', total.toString());
        
        const textWidth = customFont.widthOfTextAtSize(text, fontSize);
        
        let x = width / 2 - (textWidth / 2);
        let y = 30;

        if (position === 'bottom-right') { x = width - textWidth - 30; }
        if (position === 'top-right') { x = width - textWidth - 30; y = height - 40; }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font: customFont,
          color: rgb(r / 255, g / 255, b / 255),
        });
      });
      
      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      setProcessUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
      alert("Failed to inject page numbers.");
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
        <h1 className="text-4xl font-extrabold text-white">Add Page Numbers</h1>
        <p className="text-slate-400">Inject dynamic sequential syntax into every document node instantly.</p>
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
                <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5"/> Pagination Config</h3>
                <button onClick={removeFile} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5"/></button>
              </div>

              <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-300">Syntax Format Preset</label>
                   <select 
                     title="Format"
                     value={format} 
                     onChange={e => {setFormat(e.target.value); setProcessUrl(null);}}
                     className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white focus:border-red-500 font-mono text-sm"
                   >
                     <option value="{x}">1, 2, 3...</option>
                     <option value="- {x} -">- 1 -, - 2 -</option>
                     <option value="Page {x}">Page 1, Page 2</option>
                     <option value="Page {x} of {y}">Page 1 of 10</option>
                     <option value="Doc | p.{x}">Doc | p.1</option>
                   </select>
                 </div>

                 <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-300">Position Placement</label>
                   <select 
                     title="Position"
                     value={position} onChange={(e: any) => {setPosition(e.target.value); setProcessUrl(null);}}
                     className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white focus:border-red-500 text-sm"
                   >
                     <option value="bottom-center">Bottom Center (Classic)</option>
                     <option value="bottom-right">Bottom Right Corner</option>
                     <option value="top-right">Top Right Corner</option>
                   </select>
                 </div>
                 
                 <div className="space-y-2 border-t border-white/10 pt-4 mt-2">
                   <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Start Page Index (Skip Covers)</label>
                   <input type="number" min="1" value={startOffset} onChange={e => {setStartOffset(parseInt(e.target.value)||1); setProcessUrl(null);}} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm" />
                   <p className="text-[10px] text-slate-500">Numbering injects starting precisely at this physical page node.</p>
                 </div>

                 <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4 mt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block truncate">Style</label>
                      <select value={fontStyle} onChange={e => {setFontStyle(e.target.value as any); setProcessUrl(null);}} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-xs">
                        <option value="Helvetica">Sans</option>
                        <option value="TimesRoman">Serif</option>
                        <option value="Courier">Mono</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block truncate">Size</label>
                      <input type="number" min="8" max="48" value={fontSize} onChange={e => {setFontSize(parseInt(e.target.value)||12); setProcessUrl(null);}} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">RGB Tint</label>
                      <input type="color" 
                             onChange={e => {
                               // convert hex to rgb
                               const hex = e.target.value;
                               setR(parseInt(hex.slice(1,3), 16));
                               setG(parseInt(hex.slice(3,5), 16));
                               setB(parseInt(hex.slice(5,7), 16));
                               setProcessUrl(null);
                             }} 
                             className="w-full h-10 border-0 bg-transparent rounded-lg cursor-pointer" 
                      />
                    </div>
                 </div>
              </div>

              <button 
                onClick={handleApply} disabled={isProcessing || !format}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isProcessing ? "Patching Nodes..." : "Inject Typography"}
              </button>

              {processUrl && (
                <div className="pt-4 border-t border-white/10 mt-4">
                  <a href={processUrl} download={`numbered_${file.name}`} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors block text-center shadow-lg shadow-green-500/20">
                    <Download className="w-5 h-5 inline mr-2"/> Download Numbered PDF
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
                       <span className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-mono z-10 shadow-lg">Numbered Preview!</span>
                       <iframe src={processUrl} className="w-full h-full bg-white border-0" title="Numbered PDF Preview" />
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
