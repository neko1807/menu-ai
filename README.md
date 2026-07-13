# Menu AI

เว็บแอปหน้าเดียวสำหรับสร้างไอเดียเมนูอาหารจากวัตถุดิบที่ผู้ใช้มี โดยผลลัพธ์ทุกเมนูสร้างจาก Gemini

## โครงสร้าง

- `frontend/` — React + Vite
- `src/` — Express API
- `POST /api/ai/recipe` — สร้างเมนูจากวัตถุดิบและเงื่อนไขเพิ่มเติม
- `GET /health` — ตรวจสถานะ API

ระบบปัจจุบันทำงานแบบหน้าเดียวและไม่จัดเก็บข้อมูลผู้ใช้

หาก Gemini หรือ API key ไม่พร้อมใช้งาน หน้าเว็บจะแสดงข้อผิดพลาดโดยไม่สร้างผลลัพธ์สำรอง
หลัง Gemini ตอบกลับ backend จะตรวจวัตถุดิบอีกครั้ง โดยเก็บเฉพาะรายการ input ไว้ในวัตถุดิบที่ใช้ได้ และย้ายรายการอื่นไปเป็นวัตถุดิบที่ต้องซื้อ

## ใช้งานในเครื่อง

1. คัดลอก `.env.example` เป็น `.env` และใส่ `GEMINI_API_KEY`
2. คัดลอก `frontend/.env.example` เป็น `frontend/.env`
3. ติดตั้งและเปิด API:

   ```bash
   npm install
   npm run dev
   ```

4. เปิด frontend ในอีก terminal:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Frontend จะเปิดที่ `http://localhost:5173` และเรียก API ที่ `http://localhost:3000`

## Deploy

### Render API

ใช้ `render.yaml` และกำหนด environment variables:

- `CORS_ORIGIN` — URL ของ frontend เช่น `https://your-app.vercel.app`
- `GEMINI_API_KEY` — API key ของ Gemini
- `GEMINI_RECIPE_MODEL` — ไม่บังคับ ค่าเริ่มต้นคือ `gemini-2.5-flash`

### Vercel frontend

1. ตั้ง Root Directory เป็น `frontend`
2. ไม่ต้องกำหนด `VITE_API_BASE_URL` ใน production เพราะ `frontend/vercel.json` ส่งต่อ `/api/*` ไปยัง Render
3. หากเปลี่ยนชื่อ Render service ให้แก้ปลายทาง rewrite ใน `frontend/vercel.json`
