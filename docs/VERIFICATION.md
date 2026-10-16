# Проверки публикационной копии

Дата проверки: 16 октября 2026. Проверялась отдельная публикационная копия,
а не прежний checkout с локальными данными.

| Проверка | Результат |
|---|---|
| Установка `app/requirements-dev.txt` в новое окружение Python 3.12.14 | Успешно |
| `pip check` в этом окружении | Нет конфликтов зависимостей |
| Backend | 63 passed |
| Research error-slice contract | 1 passed |
| Загрузчик модели: проверка, отказ при порче/обрыве | 4 passed |
| Frontend, Node.js | 12 passed |
| ANN contract в отдельном процессе прежнего test-окружения | 1 passed |
| CLI final strong trainer в чистом Python 3.12 | `--help` проходит, флаг strong доступен |
| SHA256 и размер существующего настоящего веса | Совпадают с frozen manifest |
| Artifact preflight на существующем bundle | Проходит |
| `docker compose config --quiet` | Проходит; контейнеры заново не собирались |
| Относительные Markdown-ссылки | Все цели существуют |
| Презентация | 33 страницы; SHA256 совпадает с предоставленным PDF |
| Публикуемый состав | 186 файлов, около 4,4 МБ; файлов больше 10 МиБ нет |
| Проверка типовых токенов, private keys, session cookies | Совпадений в текстовых файлах нет |
| Пароли/данные/веса/локальная wiki | Не входят в Git |
| Существующий Vercel-прототип | `public/`, `api/`, package и vercel config не изменены |

В чистом Python 3.12 совместный pytest-прогон дал **68 passed**
(63 backend + 1 research + 4 downloader). Выведены только предупреждения
об устаревающих API зависимостей. ANN проверен отдельно в ранее настроенном
Python 3.13 окружении с FAISS; его нельзя считать частью чистого 3.12 прогона.

Точные версии чистого окружения: Python 3.12.14, torch 2.8.0,
torchvision 0.23.0, NumPy 1.26.4, OpenCV 4.10.0.84. В публикационной
копии NumPy закреплён на проверенной версии; NumPy 2.x из прежнего
requirements-файла не соответствует использованному ранее окружению.

Команды из `app/`, после установки inference-зависимостей и pytest:

```bash
python -m pytest backend/tests -q
PYTHONPATH=backend python -m pytest backend/ml/tests -q
PYTHONPATH=repro python -m pytest repro/tests -q
node --test frontend/tests/*.test.js
```

ANN-тесты могут требовать отдельный `backend/ml/requirements-ann-demo.txt`.
Исследовательские команды дополнительно требуют `repro/requirements.txt`.
Веса и датасеты не требуются тестам с фикстурами.

Исторические 10+2 model/Docker smoke за сентябрь не считаются новым
full-archive, Windows, clean-machine или performance-прогоном.

Полная подготовка dev-окружения из корня репозитория:

```bash
python3.12 -m venv .venv-dev
.venv-dev/bin/pip install -r app/requirements-dev.txt
PYTHONPATH=app/repro:app/backend .venv-dev/bin/python -m pytest tests app/backend/tests app/repro/tests -q
node --test app/frontend/tests/*.test.js
```

Вес проверялся на уже существующем локальном файле командой
`python scripts/fetch_model.py --verify-file /absolute/path/to/model_inference.pt`.
Upstream URL закреплён на конкретном коммите и вернул HTTP 200 на HEAD;
полная повторная загрузка 1,2 ГБ не выполнялась.
