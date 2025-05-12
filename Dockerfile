# Используем официальный образ Python
FROM python:3.9-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем зависимости
COPY requirements.txt .

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем исходный код
COPY . .

# Устанавливаем переменные окружения
ENV DATABASE_URL=sqlite:///./meeting_rooms.db
ENV SECRET_KEY=your-secure-secret-key-for-jwt-tokens

# Инициализируем базу данных
RUN python -m app.init_db

# Пробрасываем порт
EXPOSE 8000

# Запускаем приложение
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
