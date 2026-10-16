# Технические документы

Все команды этих документов выполняются из `app/`. Актуальные входные точки:

- [Запуск](../README.md): strong L336, отдельная загрузка веса без Git LFS.
- [Экспорт](JUDGE_EXPORT.md): combined ZIP или четыре поля gallery/query CSV + images.
- [Пользовательский сценарий](UI_WORKFLOW_20260929.md): одна галерея, два режима поиска.
- [Потоковые загрузки](UPLOAD_STREAMING_FIX_20260929.md).
- [Итоговые метрики](../../docs/RESULTS.md).

Документы ниже оставлены как исторические свидетельства интеграции и
измерений прежней **mild joint** модели. Их веса, SHA, метрики и завершённый
full-export не следует приписывать strong-релизу:

- `JOINT_L336_DEPLOYMENT_20260925.md`
- `RELEASE_VERIFICATION_20260927.md`
- `CRITERIA_AUDIT_MAC_20260927.md`
- `JOINT_ERROR_AUDIT_20260927.md`
- `BACKEND_HANDOFF.md`, `BACKEND_DEVELOPER_GUIDE.md`

`ORGANIZER_ARCHIVE_IMPORT.md` описывает общий импортёр; замеры 27 сентября
относятся к старому весу. `STRONG_AQE_INTEGRATION_20260929.md` сохранён как
исторический integration snapshot; часть его статусов публикации устарела.
Для текущего состава этой копии используйте `app/README.md` и
`docs/VERIFICATION.md` в корне.
