# Bedolaga Cabinet - Web Interface

Веб-интерфейс личного кабинета, который может работать автономно как standalone web-приложение с API панели RemnaWave.

React + Vite + TypeScript | Standalone/Web режим | Мультиязычность (EN/RU) | Адаптивный дизайн

## Требования

- Docker и Docker Compose
- Доступный API backend (панель RemnaWave или совместимый Cabinet API)
- Обратный прокси (Caddy / Nginx / Traefik)

## Архитектура

```
Браузер  →  Caddy/Nginx  →  /api/*     →  remnawave_panel:3000 (backend API)
                         →  /*          →  /srv/cabinet         (статика frontend)
```

Frontend — это статические файлы (HTML, JS, CSS). Обратный прокси выполняет две задачи:
1. Раздает статику frontend
2. Проксирует `/api/*` запросы на backend API (с удалением префикса `/api`)

## Установка

### Шаг 1. Настройка backend API

На стороне вашего backend/panel сервиса проверьте:

```env
# JWT секрет (сгенерируйте случайную строку: openssl rand -hex 32)
CABINET_JWT_SECRET=your_random_secret_key_here

# Разрешенные origins для CORS (домен, на котором будет кабинет)
CABINET_ALLOWED_ORIGINS=https://cabinet.example.com
```

Перезапустите backend после изменений.

### Шаг 2. Получение frontend файлов

#### Вариант A: Готовый Docker образ (рекомендуется)

```bash
docker pull ghcr.io/bedolaga-dev/bedolaga-cabinet:latest
```

Извлеките собранные файлы из образа:

```bash
# Создать временный контейнер и скопировать статику
docker create --name tmp_cabinet ghcr.io/bedolaga-dev/bedolaga-cabinet:latest
docker cp tmp_cabinet:/usr/share/nginx/html ./cabinet-dist
docker rm tmp_cabinet
```

#### Вариант B: Сборка из исходников

```bash
git clone https://github.com/BEDOLAGA-DEV/bedolaga-cabinet.git
cd bedolaga-cabinet
cp .env.example .env
```

Отредактируйте `.env`:

```env
VITE_API_URL=/api
VITE_APP_NAME=My VPN
VITE_APP_LOGO=V
```

Соберите и извлеките:

```bash
docker compose build
docker create --name tmp_cabinet cabinet_frontend
docker cp tmp_cabinet:/usr/share/nginx/html ./cabinet-dist
docker rm tmp_cabinet
```

### Шаг 3. Размещение файлов на сервере

Скопируйте содержимое `cabinet-dist` в директорию, которую будет раздавать ваш прокси:

```bash
# Создайте директорию на сервере
sudo mkdir -p /srv/cabinet

# Скопируйте файлы (с локальной машины или напрямую на сервере)
sudo cp -r ./cabinet-dist/* /srv/cabinet/
```

### Шаг 4. Настройка обратного прокси

#### Caddy (рекомендуется)

Caddy автоматически получает и обновляет SSL сертификаты.

```caddyfile
https://cabinet.example.com {
    encode gzip zstd

    # API запросы → backend API (удаляет /api префикс)
    handle /api/* {
        uri strip_prefix /api
        reverse_proxy remnawave_panel:3000
    }

    # Frontend статика
    handle {
        root * /srv/cabinet
        try_files {path} /index.html
        file_server

        # Кэширование статических ассетов (JS, CSS, шрифты, изображения)
        @static path *.js *.css *.woff *.woff2 *.ttf *.ico *.png *.jpg *.jpeg *.svg *.webp *.gif
        header @static Cache-Control "public, max-age=31536000, immutable"

        # HTML без кэша (для обновлений SPA)
        @html path *.html /
        header @html Cache-Control "no-cache, must-revalidate"
    }
}
```

> **Примечание:** `remnawave_panel:3000` — пример имени контейнера backend/panel в Docker сети.
> Если Caddy запущен на хосте, а не в Docker, используйте `localhost:8080` или IP сервера.

#### Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name cabinet.example.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /srv/cabinet;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;

    # API запросы → backend API
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://remnawave_panel:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Кэширование статических ассетов
    location ~* \.(?:js|css|woff2?|ttf|ico|png|jpe?g|svg|webp|gif)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # SPA fallback
    location / {
        try_files $uri /index.html;
        add_header Cache-Control "no-cache, must-revalidate";
    }
}
```

### Шаг 5. Запуск и проверка

```bash
# Перезагрузите Caddy
docker exec <caddy_container> caddy reload --config /etc/caddy/Caddyfile

# Или Nginx
docker exec <nginx_container> nginx -s reload
```

Откройте `https://cabinet.example.com` в браузере.

## Альтернативная установка: Docker контейнер с nginx внутри

Если вы не хотите раздавать статику напрямую, можно проксировать запросы на Docker контейнер cabinet.

### docker-compose.yml

```yaml
services:
  cabinet-frontend:
    image: ghcr.io/bedolaga-dev/bedolaga-cabinet:latest
    container_name: cabinet_frontend
    restart: unless-stopped
    # Порты НЕ пробрасываем — доступ только через Docker сеть
    networks:
      - bot_network

networks:
  bot_network:
    external: true
    name: remnawave-panel-network  # Сеть вашего backend/panel
```

### Caddyfile

```caddyfile
https://cabinet.example.com {
    encode gzip zstd

    # API запросы → backend API
    handle /api/* {
        uri strip_prefix /api
        reverse_proxy remnawave_panel:3000
    }

    # Frontend → nginx контейнер (порт 80 внутри Docker сети)
    handle {
        reverse_proxy cabinet_frontend:80
    }
}
```

> В этом варианте кэшированием статики занимается nginx внутри контейнера.

## Переменные окружения

### Build-time (вшиваются в JS при сборке)

| Переменная | Описание | По умолчанию |
|---|---|---|
| `VITE_API_URL` | Путь к API (`/api` или полный URL) | `/api` |
| `VITE_AUTH_MODE` | Режим авторизации (`api_key` или `jwt`) | `api_key` |
| `VITE_API_KEY_HEADER` | Заголовок для API ключа | `X-API-Key` |
| `VITE_API_KEY_PREFIX` | Префикс значения ключа (например `Bearer`) | — |
| `VITE_APP_NAME` | Название в шапке и вкладке браузера | `Cabinet` |
| `VITE_APP_LOGO` | Текст логотипа (1-2 символа) | `V` |

### Runtime (только для Docker контейнера)

| Переменная | Описание | По умолчанию |
|---|---|---|
| `CABINET_PORT` | Порт контейнера на хосте | `3020` |

### Backend API (пример переменных)

| Переменная | Описание | По умолчанию |
|---|---|---|
| `CABINET_JWT_SECRET` | Секретный ключ для JWT | `BOT_TOKEN` |
| `CABINET_ALLOWED_ORIGINS` | CORS origins (через запятую) | — |
| `CABINET_ACCESS_TOKEN_EXPIRE_MINUTES` | Время жизни access token | `15` |
| `CABINET_REFRESH_TOKEN_EXPIRE_DAYS` | Время жизни refresh token | `7` |

## Устранение проблем

### CORS ошибка в консоли браузера

Домен кабинета не добавлен в `CABINET_ALLOWED_ORIGINS` вашего backend API. Добавьте и перезапустите backend.

### API возвращает HTML вместо JSON

Прокси настроен неправильно — запросы `/api/*` попадают на frontend вместо backend. Проверьте порядок блоков `handle` в Caddyfile (API должен быть первым).

### 502 Bad Gateway

1. Backend API не запущен — проверьте `docker ps`
2. Контейнеры в разных Docker сетях — проверьте и подключите:
   ```bash
   # Проверить сети контейнера
   docker inspect <container> --format='{{json .NetworkSettings.Networks}}' | python3 -m json.tool

   # Подключить к нужной сети
   docker network connect <network_name> <container_name>
   ```
3. Неправильное имя сервиса в прокси — проверьте через:
   ```bash
   docker exec <caddy_container> wget -qO- http://remnawave_panel:3000/health
   ```

### Белый экран / SPA не работает

Прокси не настроен на fallback к `index.html`. Убедитесь что `try_files {path} /index.html` (Caddy) или `try_files $uri /index.html` (Nginx) присутствует в конфигурации.

## Разработка

```bash
git clone https://github.com/BEDOLAGA-DEV/bedolaga-cabinet.git
cd bedolaga-cabinet
npm install
cp .env.example .env
# Отредактируйте .env
npm run dev
```

Dev-сервер запустится на `http://localhost:5173` с автоматическим проксированием `/api` на `localhost:8080`.

## Структура проекта

```
bedolaga-cabinet/
├── src/
│   ├── api/           # API клиенты (axios)
│   ├── components/    # React компоненты (UI kit)
│   ├── contexts/      # React контексты (auth, theme)
│   ├── hooks/         # Custom hooks
│   ├── locales/       # Переводы (i18n)
│   ├── pages/         # Страницы приложения
│   ├── types/         # TypeScript типы
│   └── utils/         # Утилиты
├── public/            # Статические файлы
├── Dockerfile         # Multi-stage сборка (node → nginx)
├── docker-compose.yml # Docker Compose для сборки
├── nginx.conf         # Nginx конфиг внутри контейнера
└── .env.example       # Пример переменных окружения
```

## Связанные проекты

- [RemnaWave](https://remna.st) — Панель/бэкенд, к которому подключается кабинет
- [Bedolaga Chat](https://t.me/+wTdMtSWq8YdmZmVi) — Чат поддержки

## Контакты

- Telegram: [@fringg](https://t.me/fringg)
- Telegram: [@pedzeo](https://t.me/pedzeo)
- Чат: [Bedolaga Chat](https://t.me/+wTdMtSWq8YdmZmVi)
