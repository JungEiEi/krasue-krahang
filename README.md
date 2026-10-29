# เกมจับผีกระสือและผีกระหัง

เล่นได้ที่ [jungeiei.github.io/krasue-krahang](https://jungeiei.github.io/krasue-krahang/) หลังจากเปิด GitHub Pages ครั้งเดียว

1. เปิด [Settings → Pages](https://github.com/JungEiEi/krasue-krahang/settings/pages)
2. ที่ **Build and deployment** เลือก **Deploy from a branch**
3. เลือกสาขา `gh-pages` และโฟลเดอร์ `/ (root)` แล้วกด Save

พุชขึ้นสาขา `main` แล้ว Actions จะอัปเดตสาขา `gh-pages` ให้เอง

เกมจับผีออนไลน์เล่นฟรีบนเบราว์เซอร์ ฉากหมู่บ้านไทยยามค่ำ ไม่ต้องสมัคร

- ผีกระสือลอยช้า — 10 คะแนน
- ผีกระหังบินผ่านเร็ว — 20 คะแนน
- ก้อนอุจจาระเป็นกับดัก — ห้ามแตะ โดนแล้วลบ 10 คะแนน
- จับได้มีวงคาถาและเสียงกรี๊ด
- เลือกระยะเวลา 30 / 45 / 60 วินาที
- คะแนนสูงสุดเก็บในเบราว์เซอร์

## รันในเครื่อง

```bash
npm install
npm run dev
```

จากนั้นเปิดที่พอร์ตที่เครื่องมือแสดง แล้วกดเริ่มเกม

สร้างชุดไฟล์สำหรับ Pages โดยไม่ต้องรอ Actions:

```bash
npm run build:pages
```
