import React, { useState, useEffect } from 'react';
import { Key, Play, Download, CheckCircle2, Circle, Loader2, AlertTriangle } from 'lucide-react';
import { TranslationManager } from '../lib/translation-manager';

export function TranslationView({ book, onReset }) {
    const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_key') || '');
    const [status, setStatus] = useState('idle'); // idle, translating, completed, error
    const [progress, setProgress] = useState(0); // 0-100 overall
    const [chapterStatus, setChapterStatus] = useState({}); // { href: 'pending' | 'translating' | 'done' }
    const [manager, setManager] = useState(null);

    // Initialize chapter statuses
    useEffect(() => {
        const initial = {};
        book.spine.forEach(ch => initial[ch.href] = 'pending');
        setChapterStatus(initial);
    }, [book]);

    const handleStart = async () => {
        if (!apiKey) return alert("Please enter a Gemini API Key");
        localStorage.setItem('gemini_key', apiKey);

        setStatus('translating');
        const mgr = new TranslationManager(apiKey, book.files);
        setManager(mgr);

        let completedChapters = 0;
        const totalChapters = book.spine.length;

        try {
            for (const chapter of book.spine) {
                setChapterStatus(prev => ({ ...prev, [chapter.href]: 'translating' }));

                // Translate content
                const translatedHtml = await mgr.processChapter(chapter.href, (pct) => {
                    // Optional: Update granular progress for this chapter if UI supports it
                });

                // Save translated content back to zip (in memory)
                // Note: For now we just overwrite the file in the JSZip object in memory
                book.files[chapter.href].file(chapter.href, translatedHtml); // Updating the file content? JSZip is tricky.
                // Actually: zip.file(path, content) updates it.
                // We need to ensure path is relative to zip root. chapter.href is fully resolved now.
                book.files.file(chapter.href, translatedHtml);

                setChapterStatus(prev => ({ ...prev, [chapter.href]: 'done' }));
                completedChapters++;
                setProgress(Math.round((completedChapters / totalChapters) * 100));
            }
            setStatus('completed');
        } catch (e) {
            console.error(e);
            setStatus('error');
            alert("Translation failed: " + e.message);
        }
    };

    const handleDownload = async () => {
        // Generate blob
        const blob = await book.files.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Translated-${book.metadata.title}.epub`;
        a.click();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">

            {/* Header Card */}
            <div className="card-shuimo p-6 flex items-center justify-between bg-white">
                <div>
                    <h2 className="text-2xl font-bold text-ink-900">{book.metadata.title}</h2>
                    <p className="text-ink-500 font-serif italic">Target: Simplified Chinese</p>
                </div>
                <div className="flex items-center gap-2">
                    {status === 'completed' ? (
                        <button onClick={handleDownload} className="btn-primary bg-emerald-600 hover:bg-emerald-700">
                            <Download size={18} /> Download EPUB
                        </button>
                    ) : (
                        <button onClick={onReset} className="btn-secondary text-sm">
                            Change Book
                        </button>
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Left Col: Controls */}
                <div className="md:col-span-1 space-y-6">
                    <div className="card-shuimo p-5 space-y-4">
                        <h3 className="font-bold text-ink-800 flex items-center gap-2">
                            <Key size={16} /> API Configuration
                        </h3>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-ink-400 uppercase tracking-wider">Gemini API Key</label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="in-input text-sm font-sans"
                                placeholder="AIzaSy..."
                                disabled={status === 'translating' || status === 'completed'}
                            />
                            <p className="text-xs text-ink-400">
                                Your key is stored locally in your browser.
                            </p>
                        </div>

                        {status === 'idle' || status === 'error' ? (
                            <button
                                onClick={handleStart}
                                className="w-full btn-primary mt-4"
                                disabled={!apiKey}
                            >
                                <Play size={16} /> Start Translation
                            </button>
                        ) : (
                            <div className="w-full py-2 bg-ink-50 text-ink-500 text-center text-sm rounded flex items-center justify-center gap-2">
                                {status === 'completed' ? <CheckCircle2 size={16} /> : <Loader2 className="animate-spin" size={16} />}
                                {status === 'completed' ? 'Translation Complete' : 'Processing...'}
                            </div>
                        )}
                    </div>

                    <div className="card-shuimo p-5 text-center">
                        <h3 className="font-bold text-ink-800 mb-2">Overall Progress</h3>
                        <div className="text-4xl font-light text-ink-900 mb-2">{progress}%</div>
                        <div className="w-full bg-ink-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-cinnabar h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Right Col: Chapter List */}
                <div className="md:col-span-2">
                    <div className="bg-white/60 backdrop-blur rounded-xl border border-ink-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-ink-100 bg-white/50 flex justify-between items-center">
                            <span className="font-bold text-ink-800">Current Queue</span>
                            <span className="text-xs text-ink-400 font-sans">{book.spine.length} Chapters</span>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto">
                            {book.spine.map((ch, idx) => {
                                const s = chapterStatus[ch.href] || 'pending';
                                return (
                                    <div key={idx} className="px-6 py-3 border-b border-ink-50 last:border-0 flex items-center justify-between hover:bg-white/80 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-mono text-ink-300 w-6">{(idx + 1).toString().padStart(2, '0')}</span>
                                            <span className="text-sm font-medium text-ink-700 truncate max-w-[200px]">{ch.href.split('/').pop()}</span>
                                        </div>
                                        <div className="text-xs font-sans font-medium flex items-center gap-2">
                                            {s === 'pending' && <span className="text-ink-300 flex items-center gap-1"><Circle size={10} /> Pending</span>}
                                            {s === 'translating' && <span className="text-yellow-600 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Translating</span>}
                                            {s === 'done' && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={10} /> Done</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
