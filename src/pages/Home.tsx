import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Image as ImageIcon, ArrowRight, Minimize,
  SplitSquareHorizontal, Layers, FileImage, ShieldCheck, Crop,
  RotateCw, Expand, UserCircle, PenTool, Hash, Edit3,
  BringToFront, Scissors, Search, Layout, Type, Eraser, Camera
} from 'lucide-react';

const TOOLS = [
  {
    category: "PDF Tools",
    icon: <FileText className="w-5 h-5 text-red-400" />,
    items: [
      { id: "pdf-merge", name: "Merge PDF", desc: "Combine multiple PDFs into one unified document.", icon: Layers, path: "/pdf/merge", color: "text-red-400", bg: "bg-red-400/10" },
      { id: "pdf-split", name: "Split PDF", desc: "Extract pages from your PDF or save each page as a separate PDF.", icon: SplitSquareHorizontal, path: "/pdf/split", color: "text-red-400", bg: "bg-red-400/10" },
      { id: "pdf-compress", name: "Compress PDF", desc: "Reduce file size while optimizing for maximum PDF quality.", icon: Minimize, path: "/pdf/compress", color: "text-red-400", bg: "bg-red-400/10" },
      { id: "pdf-watermark", name: "Watermark PDF", desc: "Stamp an image or text over your PDF in seconds.", icon: ShieldCheck, path: "/pdf/watermark", color: "text-red-400", bg: "bg-red-400/10" },
      { id: "pdf-rotate", name: "Rotate PDF", desc: "Instantly rotate all pages in your PDF document.", icon: RotateCw, path: "/pdf/rotate", color: "text-red-400", bg: "bg-red-400/10" },
      { id: "pdf-to-image", name: "PDF to Image", desc: "Extract high-quality JPGs from your PDF.", icon: FileImage, path: "/pdf/to-image", color: "text-red-400", bg: "bg-red-400/10" },
      { id: "pdf-sign", name: "Sign PDF", desc: "Drag, drop, and place your generated signature on pages.", icon: PenTool, path: "/pdf/sign", color: "text-red-400", bg: "bg-red-400/10" },
      { id: "pdf-organize", name: "Organize PDF", desc: "Re-order pages visually via drag-and-drop.", icon: BringToFront, path: "/pdf/organize", color: "text-red-400", bg: "bg-red-400/10" },
      { id: "pdf-page-number", name: "Add Page Number", desc: "Batch inject page numbering vectors.", icon: Hash, path: "/pdf/page-number", color: "text-red-400", bg: "bg-red-400/10" },
      { id: "pdf-edit", name: "Edit PDF", desc: "Full object-tree modification and editing.", icon: Edit3, path: "/pdf/edit", color: "text-red-400", bg: "bg-red-400/10" },
      { id: "pdf-crop", name: "Crop PDF", desc: "Define visual bounding boxes.", icon: Crop, path: "/pdf/crop", color: "text-red-400", bg: "bg-red-400/10" },
    ]
  },
  {
    category: "Image Tools",
    icon: <ImageIcon className="w-5 h-5 text-blue-400" />,
    items: [
      { id: "img-remove-bg", name: "Remove Background", desc: "AI-powered background removal for any image.", icon: Scissors, path: "/image/remove-bg", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "img-compress", name: "Compress Image", desc: "Compress JPG, PNG, or WEBP with the best quality and file size.", icon: Minimize, path: "/image/compress", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "img-resize", name: "Resize Image", desc: "Resize your images with pixel-perfect accuracy.", icon: Expand, path: "/image/resize", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "img-convert", name: "Format Converter", desc: "Convert images seamlessly between JPG, PNG, and WEBP.", icon: FileImage, path: "/image/convert", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "img-crop", name: "Crop Image", desc: "Freehand cropping utility to slice exactly what you need.", icon: Crop, path: "/image/crop", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "img-to-pdf", name: "Image to PDF", desc: "Map any image into a standard PDF page.", icon: FileText, path: "/image/to-pdf", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "img-upscale", name: "Upscale Image", desc: "AI-powered high-resolution upscaling.", icon: Expand, path: "/image/upscale", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "img-passport", name: "Passport Photo Maker", desc: "Generate a print-ready 4x6 grid from one photo.", icon: UserCircle, path: "/image/passport", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "img-blur", name: "Blur Face", desc: "Auto-detect and blur faces instantly for privacy.", icon: UserCircle, path: "/image/blur", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "img-rotate", name: "Rotate Image", desc: "Flip and rotate images instantly.", icon: RotateCw, path: "/image/rotate", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "sig-gen", name: "Generate Signature", desc: "Create handwritten signatures with transparent backgrounds.", icon: PenTool, path: "/generate-signature", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "sig-resize", name: "Signature Resizer", desc: "Auto-crop & scale signs for forms.", icon: Expand, path: "/image/resize-signature", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "photo-sign-merge", name: "Photo and Sign Merger", desc: "Combine your Portrait Photo and Signature into a single file for form uploads.", icon: Layout, path: "/image/photo-sign-merge", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "photo-text-overlay", name: "Identity Labeler", desc: "Add Name and Date of Birth stickers directly onto your photos for exam forms.", icon: Type, path: "/image/photo-text-labeler", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "ocr-extract", name: "OCR Extractor", desc: "Extract editable text from images and docs instantly.", icon: FileText, path: "/image/ocr", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "metadata-stripper", name: "Privacy Stripper", desc: "Wipe GPS and camera EXIF data from your photos.", icon: ShieldCheck, path: "/image/metadata-stripper", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "smart-redaction", name: "Smart Redaction", desc: "Draw to permanently blackout sensitive data in images.", icon: Eraser, path: "/image/redaction", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "doc-scanner", name: "Document Scanner", desc: "Capture high-contrast scans using your camera.", icon: Camera, path: "/image/scanner", color: "text-blue-400", bg: "bg-blue-400/10" },
      { id: "form-helper", name: "Form Helper System", desc: "Auto-resize and compress photos/signatures to exact Government Form standards (SSC, DSSSB, etc).", icon: FileImage, path: "/form-helper", color: "text-indigo-400", bg: "bg-indigo-400/10" },
    ]
  },
];

const POPULAR_TOOLS = [
  { id: "pdf-merge", name: "Merge PDF", path: "/pdf/merge", icon: Layers, color: "text-red-400", bg: "bg-red-400/10" },
  { id: "img-remove-bg", name: "Remove BG", path: "/image/remove-bg", icon: Scissors, color: "text-blue-400", bg: "bg-blue-400/10" },
  { id: "photo-sign-merge", name: "Photo and Sign Merger", path: "/image/photo-sign-merge", icon: Layout, color: "text-blue-400", bg: "bg-blue-400/10" },
  { id: "img-compress", name: "Compress", path: "/image/compress", icon: Minimize, color: "text-blue-400", bg: "bg-blue-400/10" },
  { id: "img-to-pdf", name: "Image to PDF", path: "/image/to-pdf", icon: FileText, color: "text-blue-400", bg: "bg-blue-400/10" },
  { id: "form-helper", name: "Form Helper", path: "/form-helper", icon: FileImage, color: "text-indigo-400", bg: "bg-indigo-400/10" },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return TOOLS;

    const query = searchQuery.toLowerCase();
    return TOOLS.map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.desc.toLowerCase().includes(query)
      )
    })).filter(section => section.items.length > 0);
  }, [searchQuery]);

  return (
    <div className="space-y-12 py-8 animate-in fade-in duration-500">
      <section className="text-center max-w-3xl mx-auto space-y-6">
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
          Everything you need to <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            Process Files Faster
          </span>
        </h1>
        <p className="text-lg text-slate-300 leading-relaxed">
          FileDocs runs directly in your browser. No limits, zero uploads, instant processing, and absolute privacy. Tools powered by WebAssembly.
        </p>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto pt-4 relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search for a tool (e.g. merge, compress, background removal)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-xl group-hover:bg-white/10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {!searchQuery && (
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <BringToFront className="w-5 h-5 text-indigo-400" />
            <h2 className="text-2xl font-bold text-white">Popular Tools</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {POPULAR_TOOLS.map((tool) => (
              <Link
                key={tool.id}
                to={tool.path}
                className="group bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all hover:scale-[1.02] flex flex-col items-center text-center gap-3"
              >
                <div className={`p-3 rounded-xl ${tool.bg} ${tool.color} group-hover:scale-110 transition-transform`}>
                  <tool.icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors line-clamp-1">{tool.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-12">
        {filteredTools.length > 0 ? (
          filteredTools.map((section, idx) => (
            <div key={idx} className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                {section.icon}
                <h2 className="text-2xl font-bold text-white">{section.category}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {section.items.map((tool) => (
                  <Link
                    key={tool.id}
                    to={tool.path}
                    className="group relative bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col items-start gap-4"
                  >
                    <div className={`p-3 rounded-xl ${tool.bg} ${tool.color} group-hover:scale-110 transition-transform`}>
                      <tool.icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg text-slate-100 group-hover:text-indigo-300 transition-colors">{tool.name}</h3>
                      <p className="text-sm text-slate-400 line-clamp-2">{tool.desc}</p>
                    </div>
                    <div className="mt-auto pt-4 flex items-center text-xs font-medium text-indigo-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                      Open Tool <ArrowRight className="ml-1 w-3 h-3" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20">
            <div className="bg-slate-800/30 inline-block p-4 rounded-3xl mb-4">
              <Search className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-white">No tools match your search</h3>
            <p className="text-slate-400 mt-2">Try searching for something else, like "PDF" or "Resize".</p>
          </div>
        )}
      </div>
    </div>
  );
}
