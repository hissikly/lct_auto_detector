# Демо интерфейса

Корневые `public/`, `api/`, `package.json` и `vercel.json` сохраняют ранее
опубликованный прототип: https://lct-auto-detector.vercel.app.

- Галерея хранится в IndexedDB браузера.
- Сходство считается по цветовым блокам 8×8, без DINOv2.
- Экспорт конкурсных файлов на Vercel выключен.
- Полный ML-сервис запускается из [`app/`](../app/README.md).

Для статического локального просмотра из корня:

```bash
python3 -m http.server 4173 --directory public
```

Открыть http://127.0.0.1:4173. Здесь используйте прямые URL `gallery.html`,
`solo.html`, `many.html`: простой сервер не исполняет Vercel rewrites и API.
Для полного поведения демо используйте опубликованный URL.
