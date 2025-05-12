from sqlalchemy.orm import Session
from app.db import engine, Base, get_db
from app.models import Room, User, Booking
from datetime import datetime, timedelta
import random

def add_test_bookings():
    # Получаем сессию базы данных
    db = next(get_db())
    
    # Проверяем, есть ли уже бронирования в базе данных
    existing_bookings = db.query(Booking).count()
    if existing_bookings > 0:
        print(f"В базе данных уже есть {existing_bookings} бронирований. Пропускаем добавление тестовых данных.")
        return
    
    # Получаем пользователей и комнаты
    users = db.query(User).all()
    rooms = db.query(Room).all()
    
    if not users:
        print("Нет пользователей в базе данных. Добавьте пользователей перед добавлением бронирований.")
        return
    
    if not rooms:
        print("Нет комнат в базе данных. Добавьте комнаты перед добавлением бронирований.")
        return
    
    print(f"Найдено {len(users)} пользователей и {len(rooms)} комнат.")
    
    # Создаем тестовые бронирования
    bookings = []
    
    # Текущая дата и время
    now = datetime.now()
    
    # Предстоящие бронирования
    for i in range(1, 4):
        start_time = now + timedelta(days=i, hours=random.randint(9, 16))
        end_time = start_time + timedelta(hours=1, minutes=30)
        
        booking = Booking(
            id=i,  # Явно устанавливаем ID
            title=f"Тестовое бронирование {i}",
            start_time=start_time,
            end_time=end_time,
            room_id=random.choice(rooms).id,
            user_id=random.choice(users).id,
            participants=random.randint(2, 10),
            created_at=now
        )
        bookings.append(booking)
    
    # Прошедшие бронирования
    for i in range(4, 6):
        start_time = now - timedelta(days=i-3, hours=random.randint(1, 5))
        end_time = start_time + timedelta(hours=1, minutes=30)
        
        booking = Booking(
            id=i,  # Явно устанавливаем ID
            title=f"Прошедшее бронирование {i-3}",
            start_time=start_time,
            end_time=end_time,
            room_id=random.choice(rooms).id,
            user_id=random.choice(users).id,
            participants=random.randint(2, 10),
            created_at=now - timedelta(days=i-3)
        )
        bookings.append(booking)
    
    # Повторяющееся бронирование
    start_time = now + timedelta(days=7)
    end_time = start_time + timedelta(hours=1)
    
    booking = Booking(
        id=6,  # Явно устанавливаем ID
        title="Еженедельная встреча команды",
        start_time=start_time,
        end_time=end_time,
        room_id=random.choice(rooms).id,
        user_id=random.choice(users).id,
        participants=random.randint(5, 15),
        created_at=now
    )
    bookings.append(booking)
    
    # Добавляем бронирования в базу данных
    for booking in bookings:
        db.add(booking)
    
    # Сохраняем изменения
    db.commit()
    
    print(f"Добавлено {len(bookings)} тестовых бронирований.")

if __name__ == "__main__":
    add_test_bookings()