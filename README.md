# Pellwood - Next.js E-commerce Application

## Описание

Объединенное приложение на Next.js с интегрированным API сервером для e-commerce платформы Pellwood.

## Требования

- Node.js >= 20.0.0
- npm >= 10.0.0
- MongoDB (Atlas или локальный)
- PM2 (для production)

## Установка

```bash
cd client
npm install
```

## Настройка переменных окружения

Создайте файл `.env` в корне проекта client:

```env
# MongoDB
DB_URL=your_mongodb_connection_string

# Payment Gateway
PAYED_ID=your_payment_id
PAYED_PASSWORD=your_payment_password

# Google OAuth for Email
GOOGLE_SECRET=your_google_secret
GOOGLE_ID=your_google_client_id
GOOGLE_REFRESH=your_google_refresh_token

# Application
NODE_ENV=production
PORT=3100
```

## Запуск в разработке

```bash
npm run dev
```

Приложение будет доступно по адресу: http://localhost:3100

## Сборка для production

```bash
npm run build
```

## Запуск в production

### Локальный запуск

```bash
npm start
```

### Запуск через PM2 (рекомендуется для production)

```bash
# Установить PM2 глобально (если еще не установлен)
npm install -g pm2

# Запустить приложение
npm run pm2:start

# Другие команды PM2
npm run pm2:stop      # Остановить приложение
npm run pm2:restart   # Перезапустить приложение
npm run pm2:logs      # Просмотр логов
npm run pm2:monit     # Мониторинг приложения
npm run pm2:delete    # Удалить приложение из PM2
```

### Настройка PM2 для автозапуска

```bash
# Сохранить текущий список процессов
pm2 save

# Настроить автозапуск при перезагрузке сервера
pm2 startup
```

## API Endpoints

Все API endpoints доступны через `/api`:

### Orders
- `GET /api/order` - Получить все заказы
- `POST /api/order` - Создать новый заказ
- `PUT /api/order` - Обновить заказ
- `GET /api/order/:id` - Получить заказ по ID
- `DELETE /api/order/:id` - Удалить заказ
- `GET /api/order/email/:email` - Получить заказы по email
- `GET /api/order/current/:id` - Получить текущий заказ

### Users
- `GET /api/user` - Получить всех пользователей
- `POST /api/user` - Создать нового пользователя
- `PUT /api/user` - Обновить пользователя
- `POST /api/user/login` - Авторизация пользователя
- `PUT /api/user/password` - Обновить пароль

### Payment
- `POST /api/payment` - Обработка платежа
- `GET /api/payment/status/:id` - Получить статус платежа

### Email
- `POST /api/send/orderInfo` - Отправка информации о заказе
- `POST /api/send/reset-password` - Отправка письма для сброса пароля

## Структура проекта

```
client/
├── pages/
│   ├── api/              # API routes (интегрированный сервер)
│   │   ├── order/
│   │   ├── user/
│   │   ├── payment/
│   │   └── send/
│   ├── _app.js
│   └── index.js
├── models/               # MongoDB модели
├── lib/                  # Утилиты (dbConnect, mailer)
├── mail_template/        # Email шаблоны
├── components/
├── public/
├── ecosystem.config.js   # PM2 конфигурация
└── .env                  # Переменные окружения (не в git)
```

## Логи

Логи PM2 сохраняются в папке `logs/`:
- `pm2-error.log` - Логи ошибок
- `pm2-out.log` - Стандартный вывод
- `pm2-combined.log` - Объединенные логи

## Обновление на сервере

```bash
# Подключиться к серверу
ssh user@your-server

# Перейти в директорию проекта
cd /path/to/pellwood/client

# Получить изменения
git pull

# Установить зависимости
npm install

# Собрать проект
npm run build

# Перезапустить PM2
npm run pm2:restart
```

## Мониторинг

```bash
# Просмотр логов в реальном времени
pm2 logs pellwood

# Мониторинг ресурсов
pm2 monit

# Статус приложения
pm2 status
```

## Troubleshooting

### Проблемы с подключением к MongoDB
Проверьте строку подключения DB_URL в файле .env

### Ошибки при отправке email
Убедитесь, что переменные GOOGLE_ID, GOOGLE_SECRET и GOOGLE_REFRESH корректны

### PM2 не запускается
```bash
pm2 kill
pm2 start ecosystem.config.js
```

## Миграция со старого проекта

Старый серверный проект (server/) больше не нужен. Весь функционал перенесен в Next.js API routes.

Основные изменения:
- Сервер Express заменен на Next.js API routes
- Все зависимости обновлены для Node.js 20
- Docker заменен на PM2
- CommonJS модули конвертированы в ES6

## Лицензия

ISC
