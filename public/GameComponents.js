// Wait for React to be available
if (typeof React === 'undefined') {
    console.error('❌ CRITICAL: React not available when GameComponents.js loaded!');
    throw new Error('React is required for GameComponents.js');
}

if (typeof useState === 'undefined' && !React.useState) {
    console.error('❌ CRITICAL: React Hooks not available when GameComponents.js loaded!');
    throw new Error('React Hooks are required for GameComponents.js');
}

console.log('🚀 GameComponents.js loading... React version:', React.version);
const { useState, useEffect, useMemo } = React;

const sanitizeData = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'object') {
        const keys = Object.keys(data);
        for (const key of keys) { if (Array.isArray(data[key])) return data[key]; }
    }
    return [];
};

// --- 1. TRẮC NGHIỆM (MCQ) ---
const MCQGame = ({ data, isPremium }) => {
    const safeData = sanitizeData(data);
    const [answers, setAnswers] = useState({});

    const shuffledData = useMemo(() => {
        return safeData.map(q => {
            if (!q.options) return q;
                // Tìm index đúng dựa trên nội dung hoặc index cũ.
                // Hỗ trợ: số (index), chữ (A/B/C/D) hoặc nội dung đáp án.
                let correctContent = null;
                if (typeof q.correct_answer === 'number' && q.options[q.correct_answer] !== undefined) {
                    correctContent = q.options[q.correct_answer];
                } else if (typeof q.correct_answer === 'string' && q.correct_answer.trim()) {
                    const c = q.correct_answer.trim();
                    const map = {'a':0,'b':1,'c':2,'d':3,'A':0,'B':1,'C':2,'D':3};
                    if (map[c] !== undefined && q.options[map[c]] !== undefined) {
                        correctContent = q.options[map[c]];
                    } else {
                        // Thử khớp chính xác không phân biệt hoa thường
                        const foundExact = q.options.find(o => o && o.trim().toLowerCase() === c.toLowerCase());
                        if (foundExact) correctContent = foundExact;
                        else {
                            // Nếu không có, thử khớp chứa (substring) cả hai chiều
                            const found = q.options.find(o => o && (o.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(o.toLowerCase())));
                            if (found) correctContent = found;
                        }
                    }
                }
            const opts = [...q.options];
            for (let i = opts.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [opts[i], opts[j]] = [opts[j], opts[i]];
            }
                // Tìm lại index đúng mới. Nếu không tìm thấy, chọn ngẫu nhiên để tránh luôn mặc định về A.
                const newIndex = correctContent ? opts.indexOf(correctContent) : -1;
                const finalIndex = newIndex !== -1 ? newIndex : Math.floor(Math.random() * opts.length);
                return { ...q, options: opts, correct_answer: finalIndex };
        });
    }, [safeData]);

    const handleSelect = (i, j) => { if (answers[i] === undefined) setAnswers(p => ({ ...p, [i]: j })); };

    if (safeData.length === 0) return <div className="text-red-400 p-4">Lỗi dữ liệu.</div>;

    return (
        <div className="space-y-6 pb-20 w-full max-w-3xl">
            {shuffledData.map((q, i) => {
                const ua = answers[i];
                const isA = ua !== undefined;
                return (
                    <div key={i} className="glass-panel p-6 rounded-2xl border border-slate-700/50">
                        <h3 className="text-lg font-bold mb-4 text-white"><span className="text-indigo-400 mr-2">Câu {i+1}:</span>{q.question}</h3>
                        <div className="grid gap-3">
                            {q.options.map((opt, j) => {
                                let cls = "w-full p-4 text-left rounded-xl border transition-all flex items-center justify-between ";
                                let icon = null;
                                if(!isA) cls += "border-slate-700 bg-slate-800/40 hover:bg-slate-700 hover:border-indigo-500 text-slate-300";
                                else {
                                    if(j===q.correct_answer) { cls += "border-green-500 bg-green-500/10 text-green-400 font-bold"; icon=<i className="fa-solid fa-check"></i>; }
                                    else if(j===ua) { cls += "border-red-500 bg-red-500/10 text-red-400"; icon=<i className="fa-solid fa-xmark"></i>; }
                                    else cls += "border-slate-800 bg-slate-900/20 text-slate-600 opacity-40";
                                }
                                return <button key={j} disabled={isA} onClick={()=>handleSelect(i,j)} className={cls}><span>{opt}</span>{icon}</button>
                            })}
                        </div>
                        {isA && <div className={`mt-4 p-3 rounded-lg text-sm border ${ua===q.correct_answer?'bg-green-900/20 border-green-500/30':'bg-indigo-900/20 border-indigo-500/30'}`}><strong className={ua===q.correct_answer?'text-green-400':'text-yellow-400'}>{ua===q.correct_answer?'Chính xác!':'Giải thích:'}</strong> <span className="text-slate-300">{isPremium?q.explanation:"(Nâng cấp Pro để xem)"}</span></div>}
                    </div>
                );
            })}
        </div>
    );
};

// --- 2. ĐÚNG / SAI (True/False) - UI Đẹp hơn ---
const TrueFalseGame = ({ data, isPremium }) => {
    const safeData = sanitizeData(data);
    const [answers, setAnswers] = useState({});

    const handleSelect = (i, val) => { if (answers[i] === undefined) setAnswers(p => ({ ...p, [i]: val })); };
    const normalizeBool = (v) => {
        if (v === null || v === undefined) return false;
        if (typeof v === 'boolean') return v;
        if (typeof v === 'string') {
            const str = v.trim().toLowerCase();
            return str === 'true' || str === '1' || str === 'yes';
        }
        if (typeof v === 'number') return v === 1;
        return !!v;
    };

    if (safeData.length === 0) return <div className="text-red-400">Lỗi dữ liệu.</div>;

    return (
        <div className="grid gap-6 w-full max-w-2xl pb-20">
            {safeData.map((item, i) => {
                const ua = answers[i];
                const isA = ua !== undefined;
                // Try to find the correct answer value - support multiple field names
                let correctValue = item.is_correct;
                if (correctValue === undefined) correctValue = item.correct_answer;
                if (correctValue === undefined) correctValue = item.answer;
                
                const correct = normalizeBool(correctValue);
                const isCorrect = ua === correct;

                return (
                    <div key={i} className="glass-panel p-6 rounded-2xl border border-slate-700/50">
                        <h3 className="text-lg font-bold mb-6 text-white"><span className="text-indigo-400 mr-2">Câu {i+1}:</span>{item.statement || item.question || 'Câu hỏi không rõ'}</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                disabled={isA} 
                                onClick={() => handleSelect(i, true)} 
                                className={`p-4 rounded-xl border transition-all font-bold text-center flex items-center justify-center gap-2 ${
                                    !isA 
                                        ? 'border-slate-700 bg-slate-800/40 hover:bg-slate-700 hover:border-green-500 text-slate-300' 
                                        : (correct === true
                                            ? 'border-green-500 bg-green-500/10 text-green-400' 
                                            : (ua === true ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-slate-800 bg-slate-900/20 text-slate-600 opacity-40'))
                                }`}
                            >
                                <i className="fa-solid fa-check"></i> ĐÚNG
                            </button>
                            <button 
                                disabled={isA} 
                                onClick={() => handleSelect(i, false)} 
                                className={`p-4 rounded-xl border transition-all font-bold text-center flex items-center justify-center gap-2 ${
                                    !isA 
                                        ? 'border-slate-700 bg-slate-800/40 hover:bg-slate-700 hover:border-red-500 text-slate-300' 
                                        : (correct === false
                                            ? 'border-green-500 bg-green-500/10 text-green-400' 
                                            : (ua === false ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-slate-800 bg-slate-900/20 text-slate-600 opacity-40'))
                                }`}
                            >
                                <i className="fa-solid fa-xmark"></i> SAI
                            </button>
                        </div>
                        {isA && <div className={`mt-4 p-3 rounded-lg text-sm border ${isCorrect ? 'bg-green-900/20 border-green-500/30' : 'bg-indigo-900/20 border-indigo-500/30'}`}><strong className={isCorrect ? 'text-green-400' : 'text-yellow-400'}>{isCorrect ? 'Chính xác!' : 'Giải thích:'}</strong> <span className="text-slate-300">{isPremium ? item.explanation : "(Nâng cấp Pro để xem)"}</span></div>}
                    </div>
                );
            })}
        </div>
    );
};

// --- 3. FLASHCARD (Giữ nguyên) ---
const FlashcardGame = ({ data }) => { 
    const safeData = sanitizeData(data);
    const [i, setI] = useState(0); 
    const [flip, setFlip] = useState(false); 
    if (safeData.length === 0) return <div className="text-red-400">Lỗi dữ liệu thẻ.</div>;
    const next = () => { setFlip(false); setTimeout(() => setI((p) => (p + 1) % safeData.length), 300); };
    const prev = () => { setFlip(false); setTimeout(() => setI((p) => (p - 1 + safeData.length) % safeData.length), 300); };

    return (
        <div className="w-full max-w-md mx-auto perspective-1000 pb-20">
            <div className="text-center mb-4 text-slate-400 text-sm font-bold tracking-widest">THẺ {i + 1} / {safeData.length}</div>
            <div className={`flip-card w-full h-80 cursor-pointer group ${flip ? 'flipped' : ''}`} onClick={() => setFlip(!flip)}>
                <div className="flip-card-inner relative w-full h-full shadow-2xl rounded-3xl transition-transform duration-500">
                    <div className="flip-front absolute w-full h-full bg-slate-800 rounded-3xl flex flex-col items-center justify-center p-8 border border-slate-600 group-hover:border-indigo-500" style={{backfaceVisibility:'hidden'}}>
                        <span className="text-xs font-bold text-indigo-400 uppercase mb-4 tracking-widest">Thuật ngữ</span>
                        <h3 className="text-2xl font-bold text-center text-white">{safeData[i].front}</h3>
                        <p className="mt-8 text-slate-500 text-xs animate-bounce">Chạm để lật</p>
                    </div>
                    <div className="flip-back absolute w-full h-full vibe-gradient rounded-3xl flex flex-col items-center justify-center p-8 text-white" style={{backfaceVisibility:'hidden', transform:'rotateY(180deg)'}}>
                        <span className="text-xs font-bold text-white/70 uppercase mb-4 tracking-widest">Định nghĩa</span>
                        <p className="text-lg text-center font-medium">{safeData[i].back}</p>
                    </div>
                </div>
            </div>
            <div className="flex justify-center gap-4 mt-8">
                <button onClick={prev} className="p-4 bg-slate-800 rounded-full hover:bg-indigo-600 transition"><i className="fa-solid fa-arrow-left text-white"></i></button>
                <button onClick={next} className="p-4 bg-slate-800 rounded-full hover:bg-indigo-600 transition"><i className="fa-solid fa-arrow-right text-white"></i></button>
            </div>
        </div>
    ); 
};

// --- 4. ĐIỀN TỪ (Fix Nút Kiểm Tra) ---
const FillBlankGame = ({ data }) => {
    const safeData = sanitizeData(data);
    if (safeData.length === 0) return <div className="text-red-400">Lỗi dữ liệu.</div>;

    return (
        <div className="space-y-6 w-full max-w-2xl pb-20">
            {safeData.map((q, i) => {
                const [val, setVal] = useState('');
                const [status, setStatus] = useState('pending');
                const parts = q.sentence_with_blank && q.sentence_with_blank.includes('[BLANK]') 
                    ? q.sentence_with_blank.split('[BLANK]') 
                    : [q.question || "Câu hỏi lỗi", ""];
                
                const check = () => {
                    if (!q.hidden_word) { setStatus('wrong'); return; }
                    if (val.trim().toLowerCase() === q.hidden_word.toLowerCase().trim()) setStatus('correct');
                    else setStatus('wrong');
                };

                return (
                    <div key={i} className="glass-panel p-8 rounded-2xl border border-slate-700/50">
                        <div className="text-xl leading-loose text-slate-200 mb-6">
                            {parts[0]}
                            <input 
                                type="text" 
                                disabled={status === 'correct'}
                                value={val}
                                onChange={e => setVal(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && check()}
                                className={`mx-2 bg-transparent border-b-2 outline-none text-center font-bold min-w-[120px] px-2 py-1 transition-colors ${status === 'correct' ? 'border-green-500 text-green-400' : (status === 'wrong' ? 'border-red-500 text-red-400' : 'border-indigo-500 text-white focus:border-white')}`}
                                placeholder="..."
                            />
                            {parts[1] || ''}
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <div className="h-6">
                                {status === 'wrong' && <span className="text-red-400 text-sm font-bold flex items-center animate-pulse"><i className="fa-solid fa-triangle-exclamation mr-2"></i>Đáp án: {q.hidden_word}</span>}
                                {status === 'correct' && <span className="text-green-400 text-sm font-bold flex items-center"><i className="fa-solid fa-check-circle mr-2"></i>Chính xác!</span>}
                            </div>
                            <button onClick={check} disabled={status === 'correct' || !val} className={`px-6 py-2 rounded-lg font-bold text-sm transition shadow-lg ${status === 'correct' ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105 active:scale-95'}`}>Kiểm tra</button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- 5. HỎI ĐÁP (Q&A) -> Nâng cấp thành SELF-CHECK ---
const QAGame = ({ data }) => {
    const safeData = sanitizeData(data);
    if (safeData.length === 0) return <div className="text-red-400">Lỗi dữ liệu.</div>;

    return (
        <div className="space-y-6 w-full max-w-2xl pb-20">
            {safeData.map((q, i) => {
                const [revealed, setRevealed] = useState(false);
                
                return (
                    <div key={i} className="glass-panel p-0 rounded-2xl border border-slate-700/50 overflow-hidden">
                        <div className="p-6 bg-slate-800/50">
                            <h3 className="font-bold text-indigo-400 text-xs uppercase tracking-widest mb-3">Câu hỏi tự luận {i + 1}</h3>
                            <p className="text-xl font-bold text-white leading-relaxed">{q.question}</p>
                        </div>
                        
                        <div className="p-6">
                            {!revealed ? (
                                <button 
                                    onClick={() => setRevealed(true)}
                                    className="w-full py-10 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:border-indigo-500 hover:text-indigo-400 hover:bg-slate-800/50 transition-all flex flex-col items-center justify-center gap-3 group"
                                >
                                    <i className="fa-solid fa-eye text-2xl group-hover:scale-110 transition-transform"></i>
                                    <span className="font-bold">Nhấn để xem đáp án gợi ý</span>
                                </button>
                            ) : (
                                <div className="animate-fade-in">
                                    <div className="bg-indigo-900/20 border-l-4 border-indigo-500 p-4 rounded-r-lg mb-4">
                                        <h4 className="text-indigo-300 font-bold text-sm mb-2">Gợi ý trả lời:</h4>
                                        <p className="text-white italic">"{q.suggested_answer}"</p>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-slate-400 font-bold text-xs uppercase">Các ý chính cần có:</h4>
                                        {q.key_points && q.key_points.map((k, j) => (
                                            <div key={j} className="flex items-start gap-3 p-2 rounded hover:bg-slate-800/50">
                                                <i className="fa-solid fa-check text-green-500 mt-1"></i>
                                                <span className="text-slate-300 text-sm">{k}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <button onClick={() => setRevealed(false)} className="text-xs text-slate-500 hover:text-white underline">Ẩn đáp án</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// Export components to window in multiple ways for maximum compatibility
console.log('📤 Exporting GameComponents...', { MCQGame: !!MCQGame, TrueFalseGame: !!TrueFalseGame, FlashcardGame: !!FlashcardGame, FillBlankGame: !!FillBlankGame, QAGame: !!QAGame });

window.GameComponents = { MCQGame, TrueFalseGame, FlashcardGame, FillBlankGame, QAGame };
window.MCQGame = MCQGame;
window.TrueFalseGame = TrueFalseGame;
window.FlashcardGame = FlashcardGame;
window.FillBlankGame = FillBlankGame;
window.QAGame = QAGame;

console.log('✅ GameComponents exported successfully!');
console.log('✅ Available components:', Object.keys(window.GameComponents));
console.log('✅ All components loaded:', {
    MCQGame: !!window.GameComponents.MCQGame,
    TrueFalseGame: !!window.GameComponents.TrueFalseGame,
    FlashcardGame: !!window.GameComponents.FlashcardGame,
    FillBlankGame: !!window.GameComponents.FillBlankGame,
    QAGame: !!window.GameComponents.QAGame
});