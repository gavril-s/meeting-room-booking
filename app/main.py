from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from app.routers import users, rooms, bookings, auth
from app.db import Base, engine
from app.routers.auth import get_current_user
from app.models import User
import os

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Meeting Room Booking System",
    description="Система бронирования переговорных комнат",
    version="1.0.0"
)

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Initialize templates
templates = Jinja2Templates(directory="app/templates")

# Main page
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# Authentication pages
@app.get("/login", response_class=templates.TemplateResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/register", response_class=templates.TemplateResponse)
async def register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

# User profile page
@app.get("/profile", response_class=templates.TemplateResponse)
async def profile_page(request: Request, current_user: User = Depends(get_current_user)):
    return templates.TemplateResponse("profile.html", {"request": request, "user": current_user})

# User bookings page
@app.get("/my-bookings", response_class=templates.TemplateResponse)
async def my_bookings_page(request: Request, current_user: User = Depends(get_current_user)):
    return templates.TemplateResponse("my_bookings.html", {"request": request, "user": current_user})

# Admin dashboard
@app.get("/admin", response_class=templates.TemplateResponse)
async def admin_page(request: Request, current_user: User = Depends(get_current_user)):
    # В реальном приложении здесь была бы проверка на права администратора
    return templates.TemplateResponse("admin.html", {"request": request, "user": current_user})

# Error handlers
@app.exception_handler(401)
async def unauthorized_handler(request: Request, exc: HTTPException):
    return RedirectResponse(url="/login")

@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return templates.TemplateResponse("404.html", {"request": request}, status_code=404)

# Include routers
app.include_router(users.router)
app.include_router(rooms.router)
app.include_router(bookings.router)
app.include_router(auth.router)
