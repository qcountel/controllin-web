# controllin-web

Сайт клиента Controllin — https://controllin.ru (GitHub Pages).

Статика без сборки: `index.html`, `styles.css`, `main.js` (переключатель RU/EN),
`gamepad.js` (Gamepad Viewer — порт `crates/client/src/module/gamepad_viewer/skins.rs`
из клиента: те же скины v4pro / DualShock 4, реагирует на подключённый геймпад
через Gamepad API, иначе крутит демо).

Тексты на двух языках лежат прямо в разметке: `<span lang="ru">` / `<span lang="en">`.

## GitHub Pages

Settings → Pages → Deploy from a branch → `main` / `(root)`.
Custom domain: `controllin.ru` (файл `CNAME`), включить Enforce HTTPS.

DNS у регистратора домена:

| Тип   | Имя | Значение            |
|-------|-----|---------------------|
| A     | @   | 185.199.108.153     |
| A     | @   | 185.199.109.153     |
| A     | @   | 185.199.110.153     |
| A     | @   | 185.199.111.153     |
| CNAME | www | qcountel.github.io  |
