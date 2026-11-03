# Проверка PlanOps Atlas — 3 ноября 2026

## Проверено

- Каталог: https://atlas.plan-ops.fr/maps/arma3
- Страница примера: https://atlas.plan-ops.fr/maps/arma3/altis
- Страница содержит параметры `mapInit`: minZoom 0, maxZoom 6, tileSize 381, factorX/factorY 0.012375, sizeInMeters 30720, шаблон `/data/1/maps/3/3/{z}/{x}/{y}.png`, attribution © Bohemia Interactive.
- HEAD одного тайла `https://atlas.plan-ops.fr/data/1/maps/3/3/0/0/0.png` успешен: Content-Type image/png, Content-Length 163856, Cache-Control public max-age=14400. Массовое скачивание не выполнялось.
- Исходный клиент https://atlas.plan-ops.fr/js/map-utils.js использует Leaflet CRS.Simple с преобразованием `(factorX*x, tileSize-factorY*y)` на нулевом масштабе. Адаптер OpenLayers использует origin `[0,tileSize/factor]` и resolution `1/factor/2^z`. Координаты остаются метрическими, Y направлен вверх. Поддерживается только равномерный factor по X/Y; прочие случаи требуют расширения конфигурации.
- В ответе HEAD отсутствовал Access-Control-Allow-Origin. Изображения браузер может показывать без CORS (crossOrigin намеренно не задан), но чтение пикселей и canvas-экспорт не гарантированы. Реальный cross-origin показ тайлов в редакторе не проверялся: интеграция отключена. Разрешение внешних изображений, CSP, доступность сервиса и адреса могут меняться.

## Правовой статус

Страница карты: `Content © Bohemia Interactive`. Внизу сервис указывает отсутствие связи/одобрения авторами контента. https://atlas.plan-ops.fr/Home/Privacy сообщает только, что сайт не собирает данные. На проверенных страницах не найдено разрешения на хотлинкинг, массовое скачивание, офлайн-кэширование или распространение карт. Это не утверждение, что таких условий нигде нет, и не разрешение на использование. Доступный URL и Cache-Control сами по себе не предоставляют лицензию.

До включения интеграции нужно получить применимые условия/разрешения у PlanOps и правообладателей конкретных карт, согласовать атрибуцию и допустимую нагрузку. Atlas выключен по умолчанию; service worker не кэширует его тайлы. Нет обходного прокси или скачивания каталога.

## Конфигурация

`public/tsg-config.json` поставляется с пустым `allowedIslands`, `enabled:false`, `rightsConfirmed:false`. Список островов TSG не получен и не выдуман. Администратор заполняет реальные islandId и записи карт после согласования. Ни имя Altis, ни другой пример не добавлены в рабочий белый список.

Структура записи `atlas.maps`: `id`, `islandId` (точное совпадение с allowedIslands), `name`, `tileUrl` (HTTPS на atlas.plan-ops.fr/data с {z}/{x}/{y}), `size` (метры), `tileSize` (пиксели), `factor` (пиксели/метр на z=0), `maxZoom`, `attribution`. Поля atlas: `enabled`, `rightsConfirmed`, `rightsNote` (ссылка/описание полученного разрешения). Все три условия обязательны, как и членство islandId в списке. Условия проверяются также при открытии импортированного Atlas-проекта. После изменения конфигурации перестроить production-версию.

Палитра: https://community.bistudio.com/wiki/Arma_3:_CfgMarkerColors — все 27 перечисленных классов, включая алиасы и Firing Drills; дополнительный голубой #00BFFF явно помечен как TSG. Цветовые обозначения TSG не меняют названия движковых классов.
