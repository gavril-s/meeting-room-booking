from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.models import Room
from app.db import get_db

router = APIRouter(prefix="/rooms", tags=["rooms"])

# Use templates from main.py
templates = Jinja2Templates(directory="app/templates")

class RoomCreate(BaseModel):
    name: str
    capacity: int
    description: str

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_room(room: RoomCreate, db: Session = Depends(get_db)):
    # Check if room with the same name already exists
    existing_room = db.query(Room).filter(Room.name == room.name).first()
    if existing_room:
        raise HTTPException(
            status_code=400,
            detail="Room with this name already exists"
        )
    
    # Create new room
    db_room = Room(
        name=room.name,
        capacity=room.capacity,
        description=room.description
    )
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    
    return db_room

@router.get("/")
async def get_rooms(db: Session = Depends(get_db)):
    rooms = db.query(Room).all()
    return rooms

@router.get("/{room_id}", response_class=HTMLResponse)
async def get_room(request: Request, room_id: int, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return templates.TemplateResponse("room.html", {"request": request, "room": room})
