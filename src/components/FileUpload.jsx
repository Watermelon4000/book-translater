import React, { useCallback, useState } from 'react';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';

export function FileUpload({ onFileSelect, isProcessing }) {
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState(null);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const validateAndUpload = (file) => {
        if (!file) return;
        if (file.type !== "application/epub+zip" && !file.name.endsWith(".epub")) {
            setError("Please upload a valid .epub file");
            return;
        }
        setError(null);
        onFileSelect(file);
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndUpload(e.dataTransfer.files[0]);
        }
    }, []);

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            validateAndUpload(e.target.files[0]);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div
                className={`
          relative group cursor-pointer
          border-2 border-dashed rounded-xl p-12
          transition-all duration-300 ease-out
          flex flex-col items-center justify-center gap-4
          ${dragActive ? 'border-ink-900 bg-ink-50 scale-[1.02]' : 'border-ink-200 hover:border-ink-400 bg-white/50'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload').click()}
            >
                <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".epub"
                    onChange={handleChange}
                />

                <div className={`
          p-4 rounded-full bg-paper shadow-sm border border-ink-100
          group-hover:scale-110 transition-transform duration-300
        `}>
                    {isProcessing ? (
                        <Loader2 className="w-8 h-8 text-ink-600 animate-spin" />
                    ) : (
                        <Upload className="w-8 h-8 text-ink-900" />
                    )}
                </div>

                <div className="text-center space-y-2">
                    <h3 className="text-xl font-serif font-medium text-ink-900">
                        {isProcessing ? "Analyzing Book..." : "Upload EPUB"}
                    </h3>
                    <p className="text-ink-500 text-sm">
                        Drag & drop or click to select a book
                    </p>
                </div>
            </div>

            {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 text-cinnabar flex items-center gap-2 text-sm justify-center animate-fade-in">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}
        </div>
    );
}
