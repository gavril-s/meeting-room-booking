from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from app.models import Booking, User, Room
from app.db import get_db
from app.routers.auth import get_current_user
from enum import Enum

router = APIRouter(prefix="/bookings", tags=["bookings"])

class RecurringType(str, Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"

class RecurringData(BaseModel):
    type: RecurringType
    end_date: datetime

class BookingCreate(BaseModel):
    title: str
    start_time: datetime
    end_time: datetime
    room_id: int
    participants: int = Field(gt=0)
    recurring: Optional[RecurringData] = None

class BookingUpdate(BaseModel):
    title: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    participants: Optional[int] = Field(None, gt=0)

class BookingResponse(BaseModel):
    id: int
    title: str
    start_time: datetime
    end_time: datetime
    room_id: int
    user_id: int
    participants: int
    room_name: str
    user_email: str
    
    class Config:
        orm_mode = True

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=BookingResponse)
async def create_booking(
    booking: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate time range
    if booking.start_time >= booking.end_time:
        raise HTTPException(
            status_code=400,
            detail="End time must be after start time"
        )
    
    # Validate minimum booking duration (30 minutes)
    duration = (booking.end_time - booking.start_time).total_seconds() / 60
    if duration < 30:
        raise HTTPException(
            status_code=400,
            detail="Minimum booking duration is 30 minutes"
        )
    
    # Check if room exists
    room = db.query(Room).filter(Room.id == booking.room_id).first()
    if not room:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )
    
    # Check if participants count exceeds room capacity
    if booking.participants > room.capacity:
        raise HTTPException(
            status_code=400,
            detail=f"Number of participants exceeds room capacity ({room.capacity})"
        )

    # Check for overlapping bookings
    existing_booking = db.query(Booking).filter(
        Booking.room_id == booking.room_id,
        Booking.start_time < booking.end_time,
        Booking.end_time > booking.start_time
    ).first()

    if existing_booking:
        raise HTTPException(
            status_code=409,
            detail="This room is already booked for the selected time"
        )

    # Create new booking
    db_booking = Booking(
        title=booking.title,
        start_time=booking.start_time,
        end_time=booking.end_time,
        room_id=booking.room_id,
        user_id=current_user.id,
        participants=booking.participants
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    
    # Handle recurring bookings if specified
    if booking.recurring:
        current_date = booking.start_time.date()
        end_date = booking.recurring.end_date.date()
        
        # Calculate time difference for consistent booking duration
        time_diff = booking.end_time - booking.start_time
        
        # Create recurring bookings
        while current_date < end_date:
            if booking.recurring.type == RecurringType.daily:
                current_date += timedelta(days=1)
            elif booking.recurring.type == RecurringType.weekly:
                current_date += timedelta(weeks=1)
            elif booking.recurring.type == RecurringType.monthly:
                # Simple month addition (not perfect for all edge cases)
                month = current_date.month + 1
                year = current_date.year + month // 12
                month = month % 12 or 12
                day = min(current_date.day, [31, 29 if year % 4 == 0 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month-1])
                current_date = current_date.replace(year=year, month=month, day=day)
            
            # Create new start and end times
            new_start_time = datetime.combine(current_date, booking.start_time.time())
            new_end_time = new_start_time + time_diff
            
            # Check for overlapping bookings
            existing_booking = db.query(Booking).filter(
                Booking.room_id == booking.room_id,
                Booking.start_time < new_end_time,
                Booking.end_time > new_start_time
            ).first()
            
            if not existing_booking:
                recurring_booking = Booking(
                    title=booking.title,
                    start_time=new_start_time,
                    end_time=new_end_time,
                    room_id=booking.room_id,
                    user_id=current_user.id,
                    participants=booking.participants
                )
                db.add(recurring_booking)
    
    # Commit all recurring bookings
    if booking.recurring:
        db.commit()
    
    # Return response with room and user details
    response = BookingResponse(
        id=db_booking.id,
        title=db_booking.title,
        start_time=db_booking.start_time,
        end_time=db_booking.end_time,
        room_id=db_booking.room_id,
        user_id=db_booking.user_id,
        participants=db_booking.participants,
        room_name=room.name,
        user_email=current_user.email
    )
    
    return response

@router.get("/", response_model=List[BookingResponse])
async def get_bookings(
    room_id: Optional[int] = None,
    date: Optional[datetime] = None,
    user_id: Optional[int] = None,
    min_capacity: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(
        Booking,
        Room.name.label("room_name"),
        User.email.label("user_email")
    ).join(Room).join(User)
    
    # Apply filters
    if room_id:
        query = query.filter(Booking.room_id == room_id)
    
    if date:
        # Filter bookings for the specified date
        start_of_day = datetime.combine(date.date(), datetime.min.time())
        end_of_day = datetime.combine(date.date(), datetime.max.time())
        query = query.filter(
            Booking.start_time >= start_of_day,
            Booking.start_time <= end_of_day
        )
    
    if user_id:
        query = query.filter(Booking.user_id == user_id)
    
    if min_capacity:
        query = query.filter(Room.capacity >= min_capacity)
    
    # Execute query
    results = query.all()
    
    # Convert to response model
    bookings = []
    for booking, room_name, user_email in results:
        bookings.append(
            BookingResponse(
                id=booking.id,
                title=booking.title if hasattr(booking, 'title') else "Untitled",
                start_time=booking.start_time,
                end_time=booking.end_time,
                room_id=booking.room_id,
                user_id=booking.user_id,
                participants=booking.participants if hasattr(booking, 'participants') else 1,
                room_name=room_name,
                user_email=user_email
            )
        )
    
    return bookings

@router.get("/my", response_model=List[BookingResponse])
async def get_my_bookings(
    status: Optional[str] = Query(None, enum=["upcoming", "past", "all"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(
        Booking,
        Room.name.label("room_name"),
        User.email.label("user_email")
    ).join(Room).join(User).filter(Booking.user_id == current_user.id)
    
    # Apply status filter
    now = datetime.now()
    if status == "upcoming":
        query = query.filter(Booking.end_time >= now)
    elif status == "past":
        query = query.filter(Booking.end_time < now)
    
    # Order by start time
    query = query.order_by(Booking.start_time)
    
    # Execute query
    results = query.all()
    
    # Convert to response model
    bookings = []
    for booking, room_name, user_email in results:
        bookings.append(
            BookingResponse(
                id=booking.id,
                title=booking.title if hasattr(booking, 'title') else "Untitled",
                start_time=booking.start_time,
                end_time=booking.end_time,
                room_id=booking.room_id,
                user_id=booking.user_id,
                participants=booking.participants if hasattr(booking, 'participants') else 1,
                room_name=room_name,
                user_email=user_email
            )
        )
    
    return bookings

@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: int,
    db: Session = Depends(get_db)
):
    result = db.query(
        Booking,
        Room.name.label("room_name"),
        User.email.label("user_email")
    ).join(Room).join(User).filter(Booking.id == booking_id).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking, room_name, user_email = result
    
    return BookingResponse(
        id=booking.id,
        title=booking.title if hasattr(booking, 'title') else "Untitled",
        start_time=booking.start_time,
        end_time=booking.end_time,
        room_id=booking.room_id,
        user_id=booking.user_id,
        participants=booking.participants if hasattr(booking, 'participants') else 1,
        room_name=room_name,
        user_email=user_email
    )

@router.put("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: int,
    booking_update: BookingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get the booking
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check if user owns the booking
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this booking")
    
    # Get the room
    room = db.query(Room).filter(Room.id == booking.room_id).first()
    
    # Update fields if provided
    if booking_update.title is not None:
        booking.title = booking_update.title
    
    # Handle time updates
    start_time = booking.start_time
    end_time = booking.end_time
    
    if booking_update.start_time is not None:
        start_time = booking_update.start_time
    
    if booking_update.end_time is not None:
        end_time = booking_update.end_time
    
    # Validate time range if both are provided
    if start_time >= end_time:
        raise HTTPException(
            status_code=400,
            detail="End time must be after start time"
        )
    
    # Check for overlapping bookings if times are changed
    if booking_update.start_time is not None or booking_update.end_time is not None:
        existing_booking = db.query(Booking).filter(
            Booking.id != booking_id,
            Booking.room_id == booking.room_id,
            Booking.start_time < end_time,
            Booking.end_time > start_time
        ).first()
        
        if existing_booking:
            raise HTTPException(
                status_code=409,
                detail="This room is already booked for the selected time"
            )
        
        booking.start_time = start_time
        booking.end_time = end_time
    
    # Update participants if provided
    if booking_update.participants is not None:
        if booking_update.participants > room.capacity:
            raise HTTPException(
                status_code=400,
                detail=f"Number of participants exceeds room capacity ({room.capacity})"
            )
        booking.participants = booking_update.participants
    
    # Save changes
    db.commit()
    db.refresh(booking)
    
    # Return response
    return BookingResponse(
        id=booking.id,
        title=booking.title if hasattr(booking, 'title') else "Untitled",
        start_time=booking.start_time,
        end_time=booking.end_time,
        room_id=booking.room_id,
        user_id=booking.user_id,
        participants=booking.participants if hasattr(booking, 'participants') else 1,
        room_name=room.name,
        user_email=current_user.email
    )

@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get the booking
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check if user owns the booking
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")
    
    # Delete the booking
    db.delete(booking)
    db.commit()
    
    return None
