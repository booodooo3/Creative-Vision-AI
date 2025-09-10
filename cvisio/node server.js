// استيراد الحزم المطلوبة
// Import required packages
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer'); // لمعالجة رفع الملفات
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

// تحميل متغيرات البيئة من ملف .env
// Load environment variables from .env file
dotenv.config();

// إعداد تطبيق Express
// Setup Express app
const app = express();
const port = process.env.PORT || 3000;

// إعدادات الأمان لنموذج Gemini
// Safety settings for the Gemini model
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// التحقق من وجود مفتاح API
// Check if the API key exists
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in the .env file');
}

// إعداد Gemini AI
// Configure Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// إعداد Multer لتخزين الملفات في الذاكرة
// Configure Multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// استخدام Middleware
// Use Middleware
app.use(cors()); // تفعيل CORS للسماح بالطلبات من واجهات مختلفة
app.use(express.json()); // للسماح بتحليل أجسام الطلبات بصيغة JSON
app.use(express.static(__dirname)); // لخدمة ملف index.html والملفات الثابتة الأخرى

// --- تعريف المسارات (API Endpoints) ---

// مسار لخدمة ملف الواجهة الأمامية الرئيسي
// Route to serve the main frontend file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// 1. مسار إنشاء صورة من نص
// 1. Route for Text-to-Image generation
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-002" }); // استخدام نموذج إنشاء الصور
    
    // واجهة برمجة التطبيقات تتوقع "instances" و "parameters"
    // The API expects "instances" and "parameters"
    const result = await model.generateContent(prompt);
    
    // ملاحظة: هيكل الاستجابة لـ imagen قد يختلف. هذا مجرد مثال.
    // Note: The response structure for imagen might differ. This is an example.
    // ستحتاج إلى تكييف هذا بناءً على الاستجابة الفعلية من واجهة برمجة التطبيقات.
    // You will need to adapt this based on the actual API response.
    
    res.json({ success: true, data: result.response });

  } catch (error) {
    console.error('Error in /api/generate-image:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});


// 2. مسار البحث القانوني باستخدام Gemini
// 2. Route for Legal AI Research
app.post('/api/legal-search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // استخدام نموذج مع تفعيل البحث
    // Use a model with search grounding enabled
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20",
      tools: [{ "google_search": {} }],
    });
    
    const result = await model.generateContent(query);
    res.json(result.response);

  } catch (error) {
    console.error('Error in /api/legal-search:', error);
    res.status(500).json({ error: 'Failed to perform legal search' });
  }
});

// دالة مساعدة لتحويل Buffer إلى جزء بيانات Gemini
// Helper function to convert buffer to Gemini data part
const fileToGenerativePart = (buffer, mimeType) => {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType
    },
  };
};

// 3. مسار تعديل الصور
// 3. Route for AI Image Editing
app.post('/api/edit-image', upload.single('image'), async (req, res) => {
    try {
        const { prompt } = req.body;
        const imageFile = req.file;

        if (!prompt || !imageFile) {
            return res.status(400).json({ error: 'Prompt and image file are required' });
        }
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview", safetySettings });
        const imagePart = fileToGenerativePart(imageFile.buffer, imageFile.mimetype);

        const result = await model.generateContent([prompt, imagePart]);
        
        res.json(result.response);

    } catch (error) {
        console.error('Error in /api/edit-image:', error);
        res.status(500).json({ error: 'Failed to edit image' });
    }
});

// 4. مسار دمج صورتين
// 4. Route for merging two images
app.post('/api/merge-images', upload.fields([{ name: 'image1' }, { name: 'image2' }]), async (req, res) => {
    try {
        const { prompt } = req.body;
        const imageFile1 = req.files['image1'][0];
        const imageFile2 = req.files['image2'][0];

        if (!imageFile1 || !imageFile2) {
            return res.status(400).json({ error: 'Two image files are required' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview", safetySettings });

        const imagePart1 = fileToGenerativePart(imageFile1.buffer, imageFile1.mimetype);
        const imagePart2 = fileToGenerativePart(imageFile2.buffer, imageFile2.mimetype);
        
        // بناء الطلب مع الصورتين والنص
        // Construct the prompt with both images and text
        const promptParts = [
            prompt || "Merge these two images.",
            imagePart1,
            imagePart2,
        ];

        const result = await model.generateContent(promptParts);
        
        res.json(result.response);

    } catch (error) {
        console.error('Error in /api/merge-images:', error);
        res.status(500).json({ error: 'Failed to merge images' });
    }
});


// تشغيل الخادم
// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
