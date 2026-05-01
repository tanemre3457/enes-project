# Speak Up Youth — site + admin panel

İçerikleri JSON üzerinden düzenlenebilen, Coolify'a deploy edilmeye hazır site.

## Yerelde çalıştır

```bash
npm install
npm run extract     # views/original.html'den template + content üretir (zaten yapıldı)
npm start           # http://localhost:3000
```

Admin paneli: `http://localhost:3000/admin`
Varsayılan giriş (mutlaka değiştir): `admin / gencdernegi2026`

## Coolify'a deploy

### 1. Repoya push'la
Bu klasörü bir Git repo'suna (GitHub/GitLab) push'la.

### 2. Coolify'da yeni proje
- **New Resource → Public/Private Repository** seç
- Repo URL ver, branch: `main`
- **Build Pack: Dockerfile**
- **Port:** `3000`

### 3. Environment variables
Coolify → Environment Variables sekmesine ekle:

| Key | Değer |
|---|---|
| `ADMIN_USER` | `admin` (veya istediğin isim) |
| `ADMIN_PASS` | **güçlü bir şifre** |
| `SESSION_SECRET` | uzun rastgele string (`openssl rand -hex 32`) |
| `PORT` | `3000` |

### 4. Persistent volume (admin değişiklikleri için kritik)
Coolify → Storage → **Add Persistent Volume**:
- **Name:** `speakup-content`
- **Source path:** `speakup-content` (Coolify yönetir)
- **Destination path:** `/app/data`

Bu olmadan, her deploy admin düzenlemelerini sıfırlar.

### 5. Domain
- Coolify → Domains → kendi domain'ini bağla. SSL otomatik (Let's Encrypt).

### 6. Deploy
**Deploy** butonuna bas. İlk deploy ~2 dk sürer.

## Mimari özet

```
views/original.html  → kaynak (elle ya da designer'la güncellenir)
extract.js           → original.html'i tarar, [data-lang] çiftlerine data-key ekler
                       → views/template.html + data/content.json üretir
server.js            → her istekte template + content'i birleştirir, HTML döner
                       /admin → şifreli içerik editörü
```

İçeriği değiştirmek için **kod değiştirmeye gerek yok** — `/admin` üzerinden TR/EN
metinleri düzenle, "Kaydet" → site canlıda anında güncellenir.

## Tasarımı güncellersem ne olur?

`views/original.html`'i yeni versiyon ile değiştir, sonra:

```bash
node extract.js
```

Bu, mevcut `data/content.json`'u **ezer**. Eğer admin'den yapılmış güncellemeler varsa
önce yedek al (`cp data/content.json data/content.backup.json`).

İleride istersen `extract.js`'e "mevcut content.json'daki değerleri koru, sadece yeni
key'leri ekle" mantığı eklenebilir — şimdilik fresh-start davranışında.

## Buton metinleri

`extract.js` içindeki `COPY_OVERRIDES` blokunda 3 buton daha "insanca" yeniden yazıldı:

- `Başvur →` → **Aramıza Katıl** / **Take a Seat**
- `Başvuruya Git` → **Yerini Şimdi Ayır** / **Claim Your Seat**
- `Forum Hakkında` → **Forumu Tanı** / **Inside the Forum**

Bunlar artık `/admin`'den de düzenlenebilir.
