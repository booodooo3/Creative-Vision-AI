// استيراد المكتبات المطلوبة 
 // Import required libraries 
 const express = require('express'); 
 const axios = require('axios'); 
 const cors = require('cors'); 
 require('dotenv').config(); // لاستخدام متغيرات البيئة من ملف .env 
  
 // إعداد تطبيق Express 
 // Initialize the Express app 
 const app = express(); 
 const port = 3000; // المنفذ الذي سيعمل عليه السيرفر 
  
 // --- Middleware --- 
 // استخدام CORS للسماح بالطلبات من الواجهة الأمامية 
 // Use CORS to allow requests from the frontend 
 app.use(cors()); 
 // استخدام express.json() لتحليل الطلبات القادمة بصيغة JSON 
 // Use express.json() to parse incoming JSON requests 
 app.use(express.json()); 
  
  
 // --- متغيرات البيئة --- 
 // احصل على مفتاح API من متغيرات البيئة لمزيد من الأمان 
 // Get the API key from environment variables for better security 
 const API_KEY = process.env.GOOGLE_AI_API_KEY; 
  
 // التحقق من وجود مفتاح الـ API عند بدء التشغيل 
 // Check if the API key is set on startup 
 if (!API_KEY) { 
     console.error("خطأ: متغير البيئة GOOGLE_AI_API_KEY غير موجود. يرجى إنشاء ملف .env وإضافة المفتاح."); 
     process.exit(1); // إيقاف السيرفر إذا لم يتم العثور على المفتاح 
 } 
  
  
 // --- نقاط النهاية (API Endpoints) --- 
  
 /** 
  * نقطة نهاية لمعالجة طلبات إنشاء الصور (Text-to-Image) 
  * Endpoint to handle Text-to-Image generation requests 
  */ 
 app.post('/generate-image', async (req, res) => { 
     // استخراج الوصف النصي من جسم الطلب 
     // Extract the prompt from the request body 
     const { prompt } = req.body; 
  
     // التحقق من وجود الوصف 
     // Validate that a prompt was provided 
     if (!prompt) { 
         return res.status(400).json({ error: 'الرجاء إدخال وصف نصي (prompt).' }); 
     } 
  
     // رابط API الخاص بـ Google 
     // The Google API URL 
     const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${API_KEY}`; 
     const payload = { instances: [{ prompt }], parameters: { "sampleCount": 1 } }; 
  
     try { 
         // إرسال الطلب إلى Google AI API 
         // Send the request to the Google AI API 
         const response = await axios.post(apiUrl, payload); 
         // إعادة إرسال الرد من Google إلى الواجهة الأمامية 
         // Forward the response from Google back to the frontend 
         res.json(response.data); 
     } catch (error) { 
         console.error('حدث خطأ أثناء استدعاء Google API:', error.response ? error.response.data : error.message); 
         res.status(500).json({ error: 'فشل إنشاء الصورة. يرجى المحاولة مرة أخرى.' }); 
     } 
 }); 
  
  
 /** 
  * نقطة نهاية لمعالجة طلبات البحث القانوني 
  * Endpoint to handle Legal Research requests 
  */ 
 app.post('/legal-search', async (req, res) => { 
     const { query } = req.body; 
     if (!query) { 
         return res.status(400).json({ error: 'الرجاء إدخال استعلام البحث.' }); 
     } 
  
     const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`; 
     const systemPrompt = "You are a professional legal assistant. Your task is to find official laws and legal articles based on the user's query. Use the search tool to find the most accurate and up-to-date information from official government or legal sources. Provide a clear summary of the law, and you MUST cite your sources."; 
     const payload = { 
         contents: [{ parts: [{ text: query }] }], 
         tools: [{ "google_search": {} }], 
         systemInstruction: { parts: [{ text: systemPrompt }] }, 
     }; 
  
     try { 
         const response = await axios.post(apiUrl, payload); 
         res.json(response.data); 
     } catch (error) { 
         console.error('خطأ في البحث القانوني:', error.response ? error.response.data : error.message); 
         res.status(500).json({ error: 'فشل البحث القانوني. يرجى المحاولة مرة أخرى.' }); 
     } 
 }); 
  
  
 // --- تشغيل السيرفر --- 
 // بدء الاستماع للطلبات على المنفذ المحدد 
 // Start listening for requests on the specified port 
 app.listen(port, () => { 
     console.log(`🚀 السيرفر يعمل الآن على http://localhost:${port}`); 
 });