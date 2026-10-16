# Итоговый strong-рецепт

Команды выполняются из `app/`, Python 3.12, CUDA-окружение.
Они не запускаются автоматически при установке приложения.

Потребуются исходный архив организатора, CityFlow train и официальный
публичный DINOv2 ViT-L/14 pretrain; условия и SHA указаны в [README](README.md).
Не используйте inference-вес как исходный pretrain.

```bash
python3.12 -m venv .venv-repro
.venv-repro/bin/pip install -r repro/requirements.txt
.venv-repro/bin/python repro/eda.py \
  --archive /absolute/path/to/dataset.zip \
  --output outputs/eda --crop-cache data/derived/crops
.venv-repro/bin/python repro/train_joint_cityflow_organizer.py \
  --zip /absolute/path/to/AICity21_Track2_ReID.zip \
  --weights /absolute/path/to/dinov2_vitl14_official.pth \
  --objects outputs/eda/objects.csv \
  --splits repro/configs/identity_splits.json \
  --crops data/derived/crops --output outputs/strong_l336_reproduction \
  --epochs 20 --steps-per-epoch 335 --p-each 4 --k 4 --size 336 \
  --last-blocks 4 --lr 1e-5 --head-lr 3e-4 --weight-decay 0.04 \
  --warmup 2 --workers 0 --threads 4 --seed 20260918 \
  --augmentation strong --research-only
```

Trainer синхронизирован с реальным исследовательским исходником final-run;
изменён только путь split по умолчанию. Strong меняет appearance/erasing,
а не архитектуру, источники, split или число шагов. Кадры holdout/test
не передаются в обучение. Входной organizer BBox-кроп не получает
дополнительного маскирования номеров, OCR или номерных признаков.

Этот запуск создаёт новый checkpoint. Он не гарантирует битового совпадения
с поставленным весом, не включает автоматически новую калибровку refusal
и не заменяет frozen bundle. Команды извлечения/оценки в основном README
демонстрируют исследовательский цикл; старые mild-метрики не являются
метриками strong. Полный 20-эпоховый rerun этой публикационной копии
не выполнялся.
