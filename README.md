# 3KA14 WEBSITE TUGAS MANAGEMENT

web management tugas milik 3KA14.

## Fitur

- Crud tugas.
- Webhook discord
- Reminder web Notify

## Package

- Node.js
- Axios
- Cheerio

## Database

- Sqlite

## cara install

1. Clone repositori:

   ```bash
   git clone https://github.com/DanaPutra133/ka14_Management-task
   ```

2. Install module:

   ```
   npm install
   ```

## Cara Penggunaan

1. Jalankan scraper dengan NPM:

   ```javascript
   npm start
   ```

## DB prisma generate

```bash
npx prisma generate
```
```bash
npx prisma migrate dev --name init
```

## Generate vapid key 
```bash
npx web-push generate-vapid-keys
```


## Testing push 
```bash
curl -X POST http://localhost:3000/test-push
```

```bash
curl -X POST http://localhost:3000/test-discord \
    -H "Content-Type: application/json" \
    -d '{"message":"tes 123 ini tes webhook "}'
```

```bash
curl -X POST http://localhost:3000/test-discord-format -H "Content-Type: application/json" -d '{"data":[{"matakuliah":"M4 Sistem Keamanan","Namatugas":"Algoritma Substitusi Dan Permutasi","deadline":"2025-11-07","UrlGambar":null},{"matakuliah":"Interaksi manusia dan komputer","Namatugas":"Bandingkan desain website","deadline":"2025-11-05","UrlGambar":null},{"matakuliah":"M4 Sistem","Namatugas":"Tugas H-3","deadline":"2025-11-09","UrlGambar":null}]}' 
```

## Kontribusi

Silakan kirimkan isu atau pull request untuk perbaikan atau fitur tambahan ya :D happy code!..


