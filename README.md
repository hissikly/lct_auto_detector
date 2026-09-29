# lct_auto_detector

Интерфейсный прототип для Vercel. Это отдельная копия экранов поиска.
Локальный Docker, ML-сервис и вес strong DINOv2-L/14@336 остаются в
`/Users/hissikly/Documents/lct_auto_detector/LCT_task_7_ml_fix` и в ветке
`ayfaga/LCT_task_7` `ml/three-workflow-ui-20260929`. Этот репозиторий их не заменяет.

## Что здесь запускается

- Страницы `/`, `/gallery`, `/solo`, `/many`, `/judge-export`, `/replenishment`.
- Галерея и демонстрационный поиск считаются в браузере и хранятся в IndexedDB этого браузера.
- Сходство — среднее по цветовым блокам 8×8. Это не эмбеддинг DINOv2, не cosine выбранной модели и не вероятность.
- Экспорт `embeddings.npy`, `submission.csv`, `candidates.csv` на Vercel выключен.

## Чего здесь нет специально

Вес `model_inference.pt` занимает 1 217 580 060 байт. Serverless-функция Vercel
такой файл не выполняет, Docker на Vercel не запускается, а тело запроса
ограничено примерно 4,5 МБ. Полный архив организатора и консольная команда
описаны в локальном файле `LCT_task_7_ml_fix/docs/JUDGE_EXPORT.md`.

## Локальный просмотр копии

Из этой папки, без Docker:

```sh
npx --yes serve public -l 4173
```

Откройте http://127.0.0.1:4173/
