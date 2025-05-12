document.addEventListener('DOMContentLoaded', function() {
    updateAuthState();
    loadRooms();
    setupFilters();
    setupToasts();
    
    // Проверяем, авторизован ли пользователь
    const token = localStorage.getItem('token');
    if (token) {
        // Скрываем/показываем соответствующие элементы для авторизованных пользователей
        document.querySelectorAll('#my-bookings-link, #profile-link').forEach(el => {
            el.classList.remove('d-none');
        });
    } else {
        // Скрываем элементы для неавторизованных пользователей
        document.querySelectorAll('#my-bookings-link, #profile-link').forEach(el => {
            el.classList.add('d-none');
        });
    }
});

// Обновление состояния авторизации
function updateAuthState() {
    const token = localStorage.getItem('token');
    if (token) {
        document.getElementById('login-link')?.classList.add('d-none');
        document.getElementById('register-link')?.classList.add('d-none');
        document.getElementById('logout-link')?.classList.remove('d-none');
    } else {
        document.getElementById('login-link')?.classList.remove('d-none');
        document.getElementById('register-link')?.classList.remove('d-none');
        document.getElementById('logout-link')?.classList.add('d-none');
    }
}

// Выход из системы
async function logout() {
    try {
        // Удаляем токен из localStorage
        localStorage.removeItem('token');
        
        // Вызываем API для удаления cookie
        await fetch('/auth/logout', {
            method: 'GET',
            credentials: 'include' // Важно для работы с cookie
        });
        
        showToast('Вы успешно вышли из системы', 'success');
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    } catch (error) {
        console.error('Ошибка при выходе из системы:', error);
        // Все равно перенаправляем на главную страницу
        window.location.href = '/';
    }
}

// Загрузка списка комнат
async function loadRooms(filters = {}) {
    try {
        // Проверяем, есть ли элемент rooms-list на странице
        const roomsList = document.getElementById('rooms-list');
        if (!roomsList) {
            // Если элемента нет, значит мы не на главной странице
            return;
        }
        
        // Показываем индикатор загрузки
        roomsList.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Загрузка...</span></div></div>';
        
        // Формируем URL с параметрами фильтрации
        let url = '/rooms';
        if (Object.keys(filters).length > 0) {
            const params = new URLSearchParams();
            for (const key in filters) {
                if (filters[key]) {
                    params.append(key, filters[key]);
                }
            }
            url += '?' + params.toString();
        }
        
        const response = await fetch(url);
        const rooms = await response.json();
        
        if (rooms.length === 0) {
            roomsList.innerHTML = '<div class="col-12"><div class="alert alert-info">Комнаты не найдены. Попробуйте изменить параметры фильтрации.</div></div>';
            return;
        }
        
        displayRooms(rooms);
    } catch (error) {
        console.error('Ошибка при загрузке комнат:', error);
        // Показываем уведомление только если мы на главной странице
        if (document.getElementById('rooms-list')) {
            showToast('Ошибка при загрузке комнат', 'danger');
        }
    }
}

// Отображение списка комнат
function displayRooms(rooms) {
    const roomsList = document.getElementById('rooms-list');
    roomsList.innerHTML = '';

    rooms.forEach(room => {
        const roomCard = document.createElement('div');
        roomCard.className = 'col-md-4 mb-4';
        
        // Используем один цвет для всех карточек с белым текстом
        roomCard.innerHTML = `
            <div class="card h-100">
                <div class="card-header bg-primary text-white">
                    <h5 class="card-title mb-0 text-white">${room.name}</h5>
                </div>
                <div class="card-body d-flex flex-column">
                    <div class="mb-3">
                        <span class="badge bg-primary">
                            <i class="bi bi-people-fill me-1"></i>
                            Вместимость: ${room.capacity} человек
                        </span>
                    </div>
                    <p class="card-text flex-grow-1">${room.description}</p>
                    <div class="d-flex mt-auto">
                        <a href="/rooms/${room.id}" class="btn btn-primary me-2">
                            <i class="bi bi-info-circle me-1"></i>Подробнее
                        </a>
                        <button class="btn btn-success" onclick="quickBook(${room.id})">
                            <i class="bi bi-calendar-plus me-1"></i>Забронировать
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        roomsList.appendChild(roomCard);
    });
}

// Настройка фильтров
function setupFilters() {
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            const capacityFilter = document.getElementById('capacity-filter').value;
            const dateFilter = document.getElementById('date-filter').value;
            
            const filters = {
                min_capacity: capacityFilter,
                date: dateFilter
            };
            
            loadRooms(filters);
        });
    }
}

// Быстрое бронирование комнаты
function quickBook(roomId) {
    // Проверяем, авторизован ли пользователь
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Для бронирования необходимо войти в систему', 'warning');
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
        return;
    }
    
    // Перенаправляем на страницу комнаты
    window.location.href = `/rooms/${roomId}`;
}

// Настройка системы уведомлений
function setupToasts() {
    // Создаем контейнер для уведомлений, если его еще нет
    if (!document.querySelector('.toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
}

// Показать уведомление
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.setAttribute('id', toastId);
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 5000
    });
    
    bsToast.show();
    
    // Удаляем уведомление после скрытия
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

// Получение текущей даты в формате YYYY-MM-DD
function getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Форматирование даты и времени
function formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}`;
}
