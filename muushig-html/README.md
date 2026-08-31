# Muushig Web — Plain HTML/JS хувилбар

Энэ бол `muushig-web-main` Next.js + React + TypeScript төслийг **build хэрэггүй, цэвэр
HTML/CSS/JavaScript** болгож хөрвүүлсэн хувилбар юм. Node.js, npm, TypeScript compiler
шаардлагагүй — файлуудыг шууд браузер эсвэл ямар ч static hosting дээр нээж ажиллуулна.

## Ажиллуулах

Хамгийн энгийн нь: `index.html`-ийг браузероор нээх, эсвэл жижиг static server ажиллуулах:

```bash
npx serve .
# эсвэл
python3 -m http.server 8000
```

(`fetch`/ES module ашигладаг тул `file://`-оор шууд нээхэд зарим браузер CORS-оор блоклож
магадгүй — static server ашиглахыг зөвлөж байна.)

## Бүтэц

```
index.html         Нүүр хуудас
login.html          Нэвтрэх
register.html        Бүртгэл
lobby.html          Lobby (өрөө үүсгэх / нэгдэх)
room.html            Өрөө (?code=XXXXXX query параметртэй)
game.html            Тоглоом (?code=XXXXXX query параметртэй)
profile.html         Demo profile
css/styles.css       Загвар (globals.css-тэй ижил)
js/cards.js           Хөзрийн тоо, тэмдэг, дэлгэц (lib/cards.ts)
js/gameLogic.js        Тоглоомын дүрэм (lib/gameLogic.ts)
js/score.js            Оноо тооцоолол (lib/score.ts)
js/auth.js              Supabase auth wrapper (lib/auth.ts)
js/realtime.js           Supabase realtime subscriptions (lib/realtime.ts)
js/supabaseClient.js      Supabase client (lazy-loaded CDN ESM)
js/config.js              Supabase URL/anon key энд бичнэ
js/room.js                room.html-ийн логик
js/game.js                game.html-ийн логик (тоглоомын бүх төлөв)
```

## Онцлог зөрүүнүүд (Next.js хувилбараас)

- Dynamic route (`/room/[roomId]`, `/game/[gameId]`) орлуулж query string ашигласан:
  `room.html?code=ABC123`, `game.html?code=ABC123`.
- React state → энгийн JS объект + гараар дуудагдах `render()` функц.
- Supabase холболт заавал биш: `js/config.js`-д URL/key хоосон бол login/register
  локал алдааны мессеж харуулна (анхны төслийн адил). Бөглөвол Supabase JS
  (`https://esm.sh/@supabase/supabase-js@2`) CDN-ээс lazy ачаалагдана.
- Тоглоомын дүрэм, оноо тооцоолол, хөзрийн логик — эх TypeScript-тэй яг ижил,
  зөвхөн төрлийн тэмдэглэгээ (type annotations) хасагдсан.
