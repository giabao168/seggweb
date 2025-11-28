require('dotenv').config();
const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');

const app = express();

// ========== SECURITY MIDDLEWARE ==========

// 1. HELMET - Cấu hình lại để cho phép CDN và Inline Script
app.use(
    helmet({
        contentSecurityPolicy: false, // Tắt CSP để chạy được script từ CDN (React, Tailwind)
        crossOriginEmbedderPolicy: false,
    })
);

// 2. CORS - Restrict to specific origins
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5000', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// 3. Rate Limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // increased for development
    message: 'Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req, res) => process.env.NODE_ENV === 'development', // Skip rate limit in development
    handler: (req, res) => {
        res.status(429).json({ success: false, message: 'Quá nhiều yêu cầu' });
    }
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300, // increased for development
    message: 'Quá nhiều yêu cầu. Vui lòng chậm lại.',
    skip: (req, res) => process.env.NODE_ENV === 'development', // Skip rate limit in development
    handler: (req, res) => {
        res.status(429).json({ success: false, message: 'Quá nhiều yêu cầu' });
    }
});

app.use('/api/', apiLimiter);

// 4. JSON Parser with size limit
app.use(express.json({ limit: '10mb' }));

// 5. File upload with size limit
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        // Only allow PDF files
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Chỉ cho phép tệp PDF'));
        }
    }
});

// Cấu hình đường dẫn tĩnh tới thư mục public
app.use(express.static(path.join(__dirname, '../public')));

// ========== REQUEST LOGGING ==========
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.path}`);
    res.on('finish', () => {
        console.log(`   ✅ Response: ${res.statusCode}`);
    });
    next();
});

// ========== CONFIGURATION ==========
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "YOUR_KEY_HERE");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
const DB_FILE = path.join(__dirname, '../config/database.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const TOKEN_EXPIRY = '7d';

// ========== VALIDATION SCHEMAS ==========
const loginSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(6).max(100).required()
});

const registerSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(8).max(100).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required() // At least 1 uppercase, 1 lowercase, 1 number
});

// ========== DATABASE FUNCTIONS ==========
const readDb = () => {
    const defaultData = {
        users: [
            { 
                id: 1, 
                username: "student", 
                passwordHash: bcrypt.hashSync("Student@123", 10), 
                balance: 0, 
                isPremium: false, 
                role: "student",
                createdAt: new Date()
            },
            { 
                id: 999, 
                username: "admin", 
                passwordHash: bcrypt.hashSync("Admin@123", 10), 
                balance: 0, 
                isPremium: true, 
                role: "admin",
                createdAt: new Date()
            }
        ],
        logs: []
    };

    try {
        // Đảm bảo thư mục config tồn tại
        const configDir = path.dirname(DB_FILE);
        if (!fs.existsSync(configDir)){
            fs.mkdirSync(configDir, { recursive: true });
        }

        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        if (!fileContent.trim()) throw new Error("File rỗng");
        
        const data = JSON.parse(fileContent);

        // --- AUTO-FIX: Kiểm tra dữ liệu cũ (chưa có passwordHash) ---
        // Nếu tìm thấy user nào không có passwordHash hoặc data bị lỗi cấu trúc, reset lại DB
        const hasOldData = Array.isArray(data.users) && data.users.some(u => !u.passwordHash);
        const isCorrupt = !data.users || !Array.isArray(data.users);

        if (hasOldData || isCorrupt) {
            console.log("♻️ Phát hiện Database cũ/lỗi cấu trúc. Đang reset lại dữ liệu mặc định...");
            fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        // -------------------------------------------------------------

        return data;
    } catch (err) {
        console.error("[DB ERROR]:", err.message);
        // Nếu lỗi đọc file (JSON lỗi), reset luôn
        fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
};

const writeDb = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error("[DB WRITE ERROR]:", err.message);
    }
};

// ========== AUTHENTICATION MIDDLEWARE ==========
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, message: "Thiếu token xác thực" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: "Token không hợp lệ" });
        req.user = user;
        next();
    });
};

// ========== HELPER FUNCTIONS ==========
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
};

const maskUser = (user) => {
    const { passwordHash, ...safe } = user;
    return safe;
};

// ========== AUTH ENDPOINTS ==========
app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const { error, value } = loginSchema.validate(req.body);
        if (error) return res.status(400).json({ success: false, message: error.details[0].message });

        const { username, password } = value;
        const db = readDb();
        const user = db.users.find(u => u.username === username);

        if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
            return res.status(401).json({ success: false, message: "Tên đăng nhập hoặc mật khẩu sai" });
        }

        const token = generateToken(user.id);
        res.json({ 
            success: true, 
            token,
            user: maskUser(user)
        });
    } catch (err) {
        console.error('[LOGIN ERROR]:', err.message);
        res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { error, value } = registerSchema.validate(req.body);
        if (error) return res.status(400).json({ success: false, message: error.details[0].message });

        const { username, password } = value;
        const db = readDb();

        if (db.users.find(u => u.username === username)) {
            return res.status(400).json({ success: false, message: "Tên đăng nhập đã tồn tại" });
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const newUser = {
            id: Date.now(),
            username,
            passwordHash,
            balance: 0,
            isPremium: false,
            role: "student",
            createdAt: new Date()
        };

        db.users.push(newUser);
        writeDb(db);

        const token = generateToken(newUser.id);
        res.status(201).json({
            success: true,
            message: "Đăng ký thành công",
            token,
            user: maskUser(newUser)
        });
    } catch (err) {
        console.error('[REGISTER ERROR]:', err.message);
        res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    }
});

app.get('/api/user/:id', authenticateToken, (req, res) => {
    try {
        const db = readDb();
        const user = db.users.find(u => u.id === parseInt(req.params.id));

        if (!user) return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });

        res.json({ success: true, user: maskUser(user) });
    } catch (err) {
        console.error('[GET USER ERROR]:', err.message);
        res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    }
});

// BUY PREMIUM
app.post('/api/buy-premium', authenticateToken, async (req, res) => {
    try {
        const { userId, plan } = req.body;
        
        if (!userId || !plan) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin" });
        }

        const db = readDb();
        const user = db.users.find(u => u.id === parseInt(userId));

        if (!user) {
            return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
        }

        // Set premium status (in real app, verify payment first)
        user.isPremium = true;
        user.premiumExpiresAt = new Date(Date.now() + (plan === 'month' ? 30 : 1) * 24 * 60 * 60 * 1000);

        writeDb(db);

        res.json({
            success: true,
            message: "Nâng cấp thành công",
            user: maskUser(user)
        });
    } catch (err) {
        console.error('[BUY PREMIUM ERROR]:', err.message);
        res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    }
});

// ========== GAME MANAGEMENT ==========
app.post('/api/game/rename', authenticateToken, (req, res) => {
    try {
        const { gameId, newName } = req.body;
        if (!newName || typeof newName !== 'string' || newName.length > 255) {
            return res.status(400).json({ success: false, message: "Tên game không hợp lệ" });
        }

        const db = readDb();
        const log = db.logs.find(l => l.id === gameId && l.userId === req.user.userId);

        if (!log) return res.status(404).json({ success: false, message: "Game không tồn tại hoặc không có quyền truy cập" });

        log.customTitle = newName;
        writeDb(db);
        res.json({ success: true });
    } catch (err) {
        console.error('[RENAME GAME ERROR]:', err.message);
        res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    }
});

app.post('/api/game/delete', authenticateToken, (req, res) => {
    try {
        const { gameId } = req.body;
        const db = readDb();
        const initialLen = db.logs.length;

        db.logs = db.logs.filter(l => !(l.id === gameId && l.userId === req.user.userId));

        if (db.logs.length < initialLen) {
            writeDb(db);
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: "Game không tồn tại hoặc không có quyền xóa" });
        }
    } catch (err) {
        console.error('[DELETE GAME ERROR]:', err.message);
        res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    }
});

app.get('/api/logs/:userId', authenticateToken, (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        
        // Users can only access their own logs
        if (req.user.userId !== userId) {
            return res.status(403).json({ success: false, message: "Không có quyền truy cập" });
        }

        const db = readDb();
        res.json({ success: true, logs: db.logs.filter(log => log.userId === userId) });
    } catch (err) {
        console.error('[GET LOGS ERROR]:', err.message);
        res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    }
});

// ========== ADMIN ENDPOINTS ==========
const isAdmin = (req, res, next) => {
    const db = readDb();
    const user = db.users.find(u => u.id === req.user.userId);
    if (user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: "Chỉ admin có quyền truy cập" });
    }
    next();
};

app.get('/api/admin/users', authenticateToken, isAdmin, (req, res) => {
    try {
        const db = readDb();
        res.json({
            success: true,
            users: db.users.map(u => maskUser(u))
        });
    } catch (err) {
        console.error('[ADMIN GET USERS ERROR]:', err.message);
        res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    }
});

app.get('/api/admin/all-logs', authenticateToken, isAdmin, (req, res) => {
    try {
        const db = readDb();
        const logs = db.logs.map(l => ({
            ...l,
            creatorName: db.users.find(u => u.id === l.userId)?.username || "Unknown"
        }));
        console.log('[ADMIN LOGS]', `Returning ${logs.length} logs`);
        res.json({ success: true, logs });
    } catch (err) {
        console.error('[ADMIN GET LOGS ERROR]:', err.message);
        res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    }
});

app.post('/api/admin/toggle-premium', authenticateToken, isAdmin, (req, res) => {
    try {
        const { targetUserId, status } = req.body;
        const db = readDb();
        const idx = db.users.findIndex(u => u.id === parseInt(targetUserId));

        if (idx === -1) return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });

        db.users[idx].isPremium = Boolean(status);
        writeDb(db);
        res.json({ success: true, user: maskUser(db.users[idx]) });
    } catch (err) {
        console.error('[TOGGLE PREMIUM ERROR]:', err.message);
        res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    }
});

// ========== GENERATE API ==========
app.post('/api/generate', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Chưa upload file" });

        const { mode, customNum, focusTopic } = req.body;
        const db = readDb();
        const user = db.users.find(u => u.id === req.user.userId);
        const isUserPremium = user?.isPremium;

        const allowedFree = ['multiple_choice', 'flashcard'];
        if (!isUserPremium && !allowedFree.includes(mode)) {
            return res.status(403).json({ error: "Tính năng này yêu cầu gói Pro" });
        }

        let numItems = isUserPremium ? Math.min(parseInt(customNum) || 10, 20) : 5;

        const text = (await pdf(req.file.buffer)).text.slice(0, 40000);

        let focusInstruction = "Tạo câu hỏi ngẫu nhiên bao quát toàn bộ nội dung văn bản.";
        if (isUserPremium && focusTopic?.trim()) {
            focusInstruction = `TẬP TRUNG CHÍNH VÀO CHỦ ĐỀ: "${focusTopic.substring(0, 200)}".`;
        }

        let modeInstruction = "";
        if (mode === "true_false") {
            modeInstruction = `Tạo 50% câu đúng, 50% câu sai. Câu sai cần sửa đổi chi tiết nhỏ, tinh tế để gây nhiễu.
JSON Format: [{ "statement": "...", "is_correct": true/false, "explanation": "..." }]`;
        } else if (mode === "multiple_choice") {
            modeInstruction = `Đáp án đúng phân bố ngẫu nhiên (A, B, C, D). Đáp án nhiễu phải hợp lý.
JSON Format: [{ "question": "...", "options": {"A": "...", "B": "...", "C": "...", "D": "..."}, "answer": "A", "explanation": "..." }]`;
        } else if (mode === "fill_blank") {
            modeInstruction = `Ẩn từ khóa quan trọng (danh từ/động từ/thuật ngữ), không ẩn từ hư từ. Thay bằng [BLANK].
JSON Format: [{ "sentence_with_blank": "Năm ... thành lập nước Việt Nam.", "hidden_word": "1945", "explanation": "..." }]`;
        } else if (mode === "qa") {
            modeInstruction = `Câu hỏi tư duy, kèm gợi ý trả lời chi tiết và các ý chính cần có.
JSON Format: [{ "question": "...", "suggested_answer": "...", "key_points": ["...", "...", "..."], "explanation": "..." }]`;
        } else if (mode === "flashcard") {
            modeInstruction = `Tạo thẻ học tập với 'front' (thuật ngữ/khái niệm) và 'back' (định nghĩa/giải thích chi tiết).
JSON Format: [{ "front": "...", "back": "..." }]`;
        }

        const prompt = `
        Bạn là chuyên gia soạn đề thi. Hãy tạo bộ dữ liệu trò chơi JSON từ văn bản dưới đây.
        
        THÔNG SỐ:
        - Chế độ: ${mode}
        - Số lượng: ${numItems}
        - Yêu cầu: ${focusInstruction}
        - Output: JSON Array only (KHÔNG markdown).
        
        HƯỚNG DẪN CHI TIẾT:
        ${modeInstruction}
        
        VĂN BẢN:
        ${text}`;

        const result = await model.generateContent(prompt);
        const gameData = JSON.parse(result.response.text().replace(/```json/g, "").replace(/```/g, "").trim());

        const newLog = {
            id: Date.now(),
            userId: req.user.userId,
            mode,
            fileName: req.file.originalname.substring(0, 255),
            customTitle: null,
            createdAt: new Date(),
            data: gameData
        };

        db.logs.unshift(newLog);
        writeDb(db);
        res.json({ success: true, data: gameData, log: newLog });

    } catch (err) {
        console.error('[GENERATE ERROR]:', err.message);
        res.status(500).json({ error: "Lỗi xử lý AI: " + err.message });
    }
});

// ========== STATIC ROUTES ==========
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ========== ERROR HANDLING ==========
app.use((err, req, res, next) => {
    console.error('[UNHANDLED ERROR]:', err.message);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: "Lỗi tải file: " + err.message });
    }
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
const publicPath = path.join(__dirname, '../public');
const indexPath = path.join(publicPath, 'index.html');
const adminPath = path.join(publicPath, 'admin.html');
const gameComponentsPath = path.join(publicPath, 'GameComponents.js');

app.listen(PORT, () => {
    console.log(`\n🚀 Server chạy tại http://localhost:${PORT}`);
    console.log(`📦 Node environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`\n📁 File Paths:`);
    console.log(`   Public dir: ${publicPath} - ${fs.existsSync(publicPath) ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`   index.html: ${indexPath} - ${fs.existsSync(indexPath) ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`   admin.html: ${adminPath} - ${fs.existsSync(adminPath) ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`   GameComponents.js: ${gameComponentsPath} - ${fs.existsSync(gameComponentsPath) ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`\n📊 API Status:`);
    console.log(`   ✅ Static files serving from ${publicPath}`);
    console.log(`   ✅ Request logging enabled`);
    console.log(`   ✅ JWT auth enabled`);
    console.log(`   ✅ Rate limiting enabled`);
    console.log(`\n💡 Default credentials: student / Student@123\n`);
});