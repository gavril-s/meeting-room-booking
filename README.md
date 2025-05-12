# Meeting Room Booking System

Курсовая работа по дисциплине "Бэкенд-разработка", Сенькевич Г.Д., ИКБО-30-22
Тема: 37. Веб-сервис для управления бронированием переговорных комнат

## Описание

Веб-сервис для управления бронированием переговорных комнат. Позволяет пользователям регистрироваться, просматривать доступные комнаты и бронировать их на определенное время.

## Технологии

- FastAPI
- SQLite
- SQLAlchemy
- Alembic (миграции)
- JWT (аутентификация)
- Bootstrap (фронтенд)

## Установка и запуск

### Локальная установка

1. Клонировать репозиторий:
   ```
   git clone https://github.com/yourusername/meeting-room-booking.git
   cd meeting-room-booking
   ```

2. Создать виртуальное окружение и активировать его:
   ```
   python -m venv venv
   source venv/bin/activate  # для Linux/Mac
   venv\Scripts\activate     # для Windows
   ```

3. Установить зависимости:
   ```
   pip install -r requirements.txt
   ```

4. Настроить переменные окружения (или использовать существующий файл .env):
   ```
   DATABASE_URL=sqlite:///./meeting_rooms.db
   SECRET_KEY=your-secure-secret-key-for-jwt-tokens
   ```

5. Инициализировать базу данных:
   ```
   python -m app.init_db
   ```

6. Запустить приложение:
   ```
   uvicorn app.main:app --reload
   ```

7. Открыть в браузере: http://localhost:8000

### Запуск с использованием Docker

1. Клонировать репозиторий:
   ```
   git clone https://github.com/yourusername/meeting-room-booking.git
   cd meeting-room-booking
   ```

2. Запустить с помощью Docker Compose:
   ```
   docker-compose up -d
   ```

3. Открыть в браузере: http://localhost:8000

## API Endpoints

- `/auth/token` - Получение JWT токена (авторизация)
- `/users` - Управление пользователями
- `/rooms` - Управление комнатами
- `/bookings` - Управление бронированиями

## Миграции базы данных

Для создания новой миграции:
```
alembic revision --autogenerate -m "описание изменений"
```

Для применения миграций:
```
alembic upgrade head
```
