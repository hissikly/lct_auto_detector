# Запуск ML-приложения

Локальный сервис: DINOv2-L/14@336, нормированные 1024D-эмбеддинги,
пакетное AQE и версионированная политика отказа.

## Модель

Из корня репозитория:

```bash
python3.12 scripts/fetch_model.py
```

Загрузка — 1 217 580 060 байт. Источник закреплён на исходном коммите;
проверяются размер и SHA256
`de955ba6ec3a2cb232708eddd1b1b57400bc449405d6d9e2ab25c791a46e617f`.
Манифесты и matching boosting policy включены в Git. Git LFS здесь не нужен.

При наличии скачанного веса можно обойтись без сети:

```bash
python3.12 scripts/fetch_model.py --source /absolute/path/to/model_inference.pt
```

Или указать целый существующий bundle без копирования:

```bash
export LCT_ML_ARTIFACT_DIR=/absolute/path/to/strong_l336_aqe
```

Каталог должен содержать вес и JSON-файлы той же версии. Проверка веса
выполняется до установки зависимостей; манифесты не переписываются.

## Python

```bash
cd app
python3.12 -m venv .venv
.venv/bin/python quick_start.py
```

Открыть http://127.0.0.1:8000. Порты: 8000 для сайта/API и 8001 для ML.
Скрипт устанавливает зависимости из двух requirements-файлов в выбранное
виртуальное окружение. Если они уже установлены:

```bash
.venv/bin/python quick_start.py --skip-install --backend-port 18000 --ml-port 18001
```

На Windows используйте `.venv\Scripts\python.exe`. В PowerShell переменные
окружения задаются через `$env:LCT_ML_ARTIFACT_DIR="C:\path\to\bundle"`.

## Docker Compose

Сначала скачать вес на хост. Затем из `app/`:

```bash
docker compose up --build -d
docker compose ps
curl -fsS http://127.0.0.1:8000/ready
```

Bundle монтируется read-only; галерея, SQLite и экспорт хранятся в
persistent volumes. Сборка образа требует сети для установки пакетов.
Offline-поставка и целевая CUDA-производительность требуют отдельной проверки.
GPU override — `docker-compose.gpu.yml`.

Остановить приложение, сохранив данные: `docker compose down`.

## Сценарии

1. `/gallery`: загрузить общую галерею и дождаться индексации. Для политики
   Top-10 нужно не менее десяти изображений. Для оригинальных кадров
   передать BBox CSV; без BBox изображение считается готовым кропом.
2. `/solo`: выделить автомобиль рамкой на одном кадре. Поиск — exact cosine.
3. `/many`: передать изображения и CSV `image_id,x,y,w,h`.
   Пакет использует AQE; raw cosine отображается отдельно от ranking score.
4. `/judge-export`: экспорт без изменения галереи, включается через
   `LCT_JUDGE_EXPORT_ENABLED=1`. Точные команды — в
   [руководстве экспорта](docs/JUDGE_EXPORT.md).

`/docs` — OpenAPI; `/health` — процесс; `/ready` — готовность зависимостей.
Cosine и поле `confidence` не являются вероятностями.

- [Метрики и ограничения](../docs/RESULTS.md)
- [Воспроизведение обучения](repro/README.md)
- [Карта технических документов](docs/README.md)
- [Проверки публикационной копии](../docs/VERIFICATION.md)
