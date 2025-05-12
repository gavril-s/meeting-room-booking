document.addEventListener('DOMContentLoaded', function() {
    updateAuthState();
    setupBookingForm();
    initializeCalendar();
    loadUpcomingBookings();
    setupRecurringBookingToggle();
    
    // Устанавливаем минимальные значения для полей даты и времени
    setMinDateTimeValues();
});

// Настройка формы бронирования
function setupBookingForm() {
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Проверяем, авторизован ли пользователь
            const token = localStorage.getItem('token');
            if (!token) {
                showToast('Для бронирования необходимо войти в систему', 'warning');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                return;
            }
            
            const roomId = window.location.pathname.split('/').pop();
            const bookingTitle = document.getElementById('booking-title').value;
            const startTime = document.getElementById('start-time').value;
            const endTime = document.getElementById('end-time').value;
            const participants = document.getElementById('participants').value;
            
            // Проверка корректности времени
            if (new Date(startTime) >= new Date(endTime)) {
                showToast('Время окончания должно быть позже времени начала', 'danger');
                return;
            }
            
            // Проверка на минимальную длительность бронирования (30 минут)
            const startDate = new Date(startTime);
            const endDate = new Date(endTime);
            const durationMinutes = (endDate - startDate) / (1000 * 60);
            
            if (durationMinutes < 30) {
                showToast('Минимальная длительность бронирования - 30 минут', 'warning');
                return;
            }
            
            // Проверка на повторяющееся бронирование
            const isRecurring = document.getElementById('recurring-booking').checked;
            let recurringData = null;
            
            if (isRecurring) {
                const recurringType = document.getElementById('recurring-type').value;
                const recurringEnd = document.getElementById('recurring-end').value;
                
                if (!recurringEnd) {
                    showToast('Укажите дату окончания повторяющегося бронирования', 'warning');
                    return;
                }
                
                recurringData = {
                    type: recurringType,
                    end_date: recurringEnd
                };
            }
            
            const bookingData = {
                title: bookingTitle,
                start_time: startTime,
                end_time: endTime,
                participants: parseInt(participants),
                room_id: parseInt(roomId),
                recurring: isRecurring ? recurringData : null
            };
            
            try {
                // Показываем индикатор загрузки
                const submitBtn = bookingForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Бронирование...';
                submitBtn.disabled = true;
                
                const response = await fetch(`/bookings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeader()
                    },
                    body: JSON.stringify(bookingData)
                });
                
                // Восстанавливаем кнопку
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
                
                if (response.ok) {
                    const result = await response.json();
                    showToast('Бронирование успешно создано!', 'success');
                    
                    // Обновляем календарь и список бронирований
                    initializeCalendar();
                    loadUpcomingBookings();
                    
                    // Сбрасываем форму
                    bookingForm.reset();
                    setMinDateTimeValues();
                } else {
                    const error = await response.json();
                    showToast(`Ошибка: ${error.detail}`, 'danger');
                }
            } catch (error) {
                console.error('Ошибка при создании бронирования:', error);
                showToast('Произошла ошибка при создании бронирования', 'danger');
            }
        });
    }
}

// Инициализация календаря занятости
function initializeCalendar() {
    const roomId = window.location.pathname.split('/').pop();
    const timeSlots = document.getElementById('time-slots');
    const currentDateElement = document.getElementById('current-date');
    
    // Устанавливаем текущую дату
    let currentDate = new Date();
    updateCalendarDate(currentDate);
    
    // Обработчики для кнопок навигации по календарю
    document.getElementById('prev-day').addEventListener('click', function() {
        currentDate.setDate(currentDate.getDate() - 1);
        updateCalendarDate(currentDate);
        loadTimeSlots(roomId, currentDate);
    });
    
    document.getElementById('next-day').addEventListener('click', function() {
        currentDate.setDate(currentDate.getDate() + 1);
        updateCalendarDate(currentDate);
        loadTimeSlots(roomId, currentDate);
    });
    
    // Загружаем временные слоты для текущей даты
    loadTimeSlots(roomId, currentDate);
    
    // Функция обновления отображаемой даты
    function updateCalendarDate(date) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateElement.textContent = date.toLocaleDateString('ru-RU', options);
    }
    
    // Функция загрузки временных слотов
    async function loadTimeSlots(roomId, date) {
        try {
            timeSlots.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm" role="status"></div> Загрузка...</div>';
            
            // Форматируем дату для запроса
            const formattedDate = date.toISOString().split('T')[0];
            
            // В реальном приложении здесь был бы запрос к API
            // Для демонстрации создаем фиктивные данные
            const workingHours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
            const bookedSlots = [
                { start: '10:00', end: '11:30', title: 'Еженедельная встреча команды' },
                { start: '14:00', end: '15:00', title: 'Интервью с кандидатом' }
            ];
            
            // Очищаем контейнер
            timeSlots.innerHTML = '';
            
            // Создаем временные слоты
            workingHours.forEach(hour => {
                const startTime = `${hour}:00`;
                const endTime = `${hour + 1}:00`;
                
                // Проверяем, забронирован ли слот
                const isBooked = bookedSlots.some(slot => {
                    return (startTime >= slot.start && startTime < slot.end) ||
                           (endTime > slot.start && endTime <= slot.end) ||
                           (startTime <= slot.start && endTime >= slot.end);
                });
                
                const bookedSlot = bookedSlots.find(slot => {
                    return (startTime >= slot.start && startTime < slot.end) ||
                           (endTime > slot.start && endTime <= slot.end) ||
                           (startTime <= slot.start && endTime >= slot.end);
                });
                
                const slotElement = document.createElement('div');
                slotElement.className = `booking-time-slot ${isBooked ? 'booked' : ''}`;
                
                let slotContent = `
                    <div class="d-flex justify-content-between">
                        <span>${startTime} - ${endTime}</span>
                        <span class="badge ${isBooked ? 'bg-danger' : 'bg-success'}">${isBooked ? 'Занято' : 'Свободно'}</span>
                    </div>
                `;
                
                if (isBooked && bookedSlot) {
                    slotContent += `<small>${bookedSlot.title}</small>`;
                }
                
                slotElement.innerHTML = slotContent;
                
                // Добавляем возможность быстрого бронирования для свободных слотов
                if (!isBooked) {
                    slotElement.style.cursor = 'pointer';
                    slotElement.addEventListener('click', function() {
                        // Заполняем форму бронирования
                        const startDateTime = new Date(date);
                        startDateTime.setHours(hour, 0, 0);
                        
                        const endDateTime = new Date(date);
                        endDateTime.setHours(hour + 1, 0, 0);
                        
                        document.getElementById('start-time').value = startDateTime.toISOString().slice(0, 16);
                        document.getElementById('end-time').value = endDateTime.toISOString().slice(0, 16);
                        
                        // Прокручиваем к форме бронирования
                        document.getElementById('booking-form').scrollIntoView({ behavior: 'smooth' });
                    });
                }
                
                timeSlots.appendChild(slotElement);
            });
            
        } catch (error) {
            console.error('Ошибка при загрузке временных слотов:', error);
            timeSlots.innerHTML = '<div class="alert alert-danger">Ошибка при загрузке данных</div>';
        }
    }
}

// Загрузка предстоящих бронирований
async function loadUpcomingBookings() {
    const upcomingBookingsContainer = document.getElementById('upcoming-bookings');
    const roomId = window.location.pathname.split('/').pop();
    
    try {
        upcomingBookingsContainer.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm" role="status"></div> Загрузка...</div>';
        
        // В реальном приложении здесь был бы запрос к API
        // Для демонстрации создаем фиктивные данные
        const upcomingBookings = [
            { id: 1, title: 'Еженедельная встреча команды', start_time: '2025-05-13T10:00:00', end_time: '2025-05-13T11:30:00' },
            { id: 2, title: 'Интервью с кандидатом', start_time: '2025-05-14T14:00:00', end_time: '2025-05-14T15:00:00' },
            { id: 3, title: 'Презентация проекта', start_time: '2025-05-15T16:00:00', end_time: '2025-05-15T17:30:00' }
        ];
        
        if (upcomingBookings.length === 0) {
            upcomingBookingsContainer.innerHTML = '<div class="text-center text-muted">Нет предстоящих бронирований</div>';
            return;
        }
        
        // Очищаем контейнер
        upcomingBookingsContainer.innerHTML = '';
        
        // Создаем список бронирований
        upcomingBookings.forEach(booking => {
            const bookingElement = document.createElement('div');
            bookingElement.className = 'booking-time-slot mb-2';
            
            const startDate = new Date(booking.start_time);
            const endDate = new Date(booking.end_time);
            
            const formattedDate = startDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
            const formattedStartTime = startDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const formattedEndTime = endDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            
            bookingElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <strong>${booking.title}</strong>
                    <span class="badge bg-primary">${formattedDate}</span>
                </div>
                <div>${formattedStartTime} - ${formattedEndTime}</div>
            `;
            
            upcomingBookingsContainer.appendChild(bookingElement);
        });
        
    } catch (error) {
        console.error('Ошибка при загрузке предстоящих бронирований:', error);
        upcomingBookingsContainer.innerHTML = '<div class="alert alert-danger">Ошибка при загрузке данных</div>';
    }
}

// Настройка переключателя повторяющегося бронирования
function setupRecurringBookingToggle() {
    const recurringCheckbox = document.getElementById('recurring-booking');
    const recurringOptions = document.getElementById('recurring-options');
    
    if (recurringCheckbox && recurringOptions) {
        recurringCheckbox.addEventListener('change', function() {
            if (this.checked) {
                recurringOptions.classList.remove('d-none');
            } else {
                recurringOptions.classList.add('d-none');
            }
        });
    }
}

// Установка минимальных значений для полей даты и времени
function setMinDateTimeValues() {
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const recurringEndInput = document.getElementById('recurring-end');
    
    if (startTimeInput && endTimeInput) {
        const now = new Date();
        
        // Округляем до ближайших 30 минут
        const minutes = now.getMinutes();
        now.setMinutes(minutes < 30 ? 30 : 60);
        now.setSeconds(0);
        now.setMilliseconds(0);
        
        // Устанавливаем минимальное время начала
        const minStartTime = now.toISOString().slice(0, 16);
        startTimeInput.min = minStartTime;
        startTimeInput.value = minStartTime;
        
        // Устанавливаем минимальное время окончания (начало + 30 минут)
        const endTime = new Date(now);
        endTime.setMinutes(now.getMinutes() + 30);
        const minEndTime = endTime.toISOString().slice(0, 16);
        endTimeInput.min = minEndTime;
        endTimeInput.value = minEndTime;
        
        // Обработчик изменения времени начала
        startTimeInput.addEventListener('change', function() {
            const newStartTime = new Date(this.value);
            const newEndTime = new Date(newStartTime);
            newEndTime.setMinutes(newStartTime.getMinutes() + 30);
            
            const newMinEndTime = newEndTime.toISOString().slice(0, 16);
            endTimeInput.min = newMinEndTime;
            
            // Если текущее значение времени окончания меньше нового минимального,
            // устанавливаем новое минимальное значение
            if (new Date(endTimeInput.value) < newEndTime) {
                endTimeInput.value = newMinEndTime;
            }
        });
    }
    
    // Устанавливаем минимальную дату окончания повторяющегося бронирования
    if (recurringEndInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        recurringEndInput.min = tomorrow.toISOString().split('T')[0];
        recurringEndInput.value = tomorrow.toISOString().split('T')[0];
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
