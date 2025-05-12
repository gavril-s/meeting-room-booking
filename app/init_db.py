from sqlalchemy.orm import Session
from app.db import engine, Base, get_db
from app.models import Room, User
from passlib.context import CryptContext
import os

# Создаем контекст для хеширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def init_db():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")
    
    # Получаем сессию базы данных
    db = next(get_db())
    
    # Проверяем, есть ли уже комнаты в базе данных
    existing_rooms = db.query(Room).count()
    if existing_rooms == 0:
        print("Adding sample rooms...")
        # Добавляем примеры комнат
        rooms = [
            Room(
                name="Конференц-зал",
                capacity=20,
                description="Большой конференц-зал для проведения встреч и презентаций",
                floor=1,
                is_active=True
            ),
            Room(
                name="Переговорная №1",
                capacity=8,
                description="Небольшая переговорная комната для рабочих встреч",
                floor=1,
                is_active=True
            ),
            Room(
                name="Переговорная №2",
                capacity=6,
                description="Уютная комната для небольших встреч",
                floor=1,
                is_active=True
            ),
            Room(
                name="Учебный класс",
                capacity=15,
                description="Комната для проведения тренингов и обучения",
                floor=2,
                is_active=True
            ),
            Room(
                name="Комната для видеоконференций",
                capacity=10,
                description="Комната с оборудованием для видеоконференций",
                floor=2,
                is_active=True
            )
        ]
        
        # Добавляем комнаты в базу данных
        for room in rooms:
            db.add(room)
        
        # Создаем тестового пользователя, если его еще нет
        test_user = db.query(User).filter(User.email == "admin@example.com").first()
        if not test_user:
            print("Adding test user...")
            admin_user = User(
                email="admin@example.com",
                hashed_password=hash_password("admin123"),
                is_admin=True
            )
            db.add(admin_user)
        
        # Сохраняем изменения
        db.commit()
        print("Sample data added successfully!")
    else:
        print(f"Database already contains {existing_rooms} rooms. Skipping initialization.")

if __name__ == "__main__":
    init_db()