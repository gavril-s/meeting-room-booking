document.addEventListener('DOMContentLoaded', function() {
    // Handle login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                console.log('Отправка запроса на аутентификацию:', email);
                
                const response = await fetch('/auth/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
                    credentials: 'include' // Важно для работы с cookie
                });

                console.log('Статус ответа:', response.status);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Получен токен:', data.access_token ? 'Да' : 'Нет');
                    
                    // Сохраняем токен в localStorage для использования в заголовках запросов
                    localStorage.setItem('token', data.access_token);
                    
                    // Проверяем, установлен ли токен в localStorage
                    const storedToken = localStorage.getItem('token');
                    console.log('Токен сохранен в localStorage:', storedToken ? 'Да' : 'Нет');
                    
                    // Показываем уведомление об успешном входе
                    if (typeof showToast === 'function') {
                        showToast('Вы успешно вошли в систему', 'success');
                        setTimeout(() => {
                            window.location.href = '/';
                        }, 1000);
                    } else {
                        window.location.href = '/';
                    }
                } else {
                    let errorMessage = 'Ошибка при входе';
                    try {
                        const error = await response.json();
                        errorMessage = error.detail || errorMessage;
                    } catch (e) {
                        console.error('Не удалось прочитать JSON из ответа:', e);
                    }
                    
                    console.error('Ошибка при входе:', errorMessage);
                    
                    if (typeof showToast === 'function') {
                        showToast(`Ошибка: ${errorMessage}`, 'danger');
                    } else {
                        alert(`Ошибка: ${errorMessage}`);
                    }
                }
            } catch (error) {
                console.error('Ошибка при входе:', error);
                
                if (typeof showToast === 'function') {
                    showToast('Произошла ошибка при входе', 'danger');
                } else {
                    alert('Произошла ошибка при входе');
                }
            }
        });
    }

    // Handle registration form submission
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (password !== confirmPassword) {
                alert('Пароли не совпадают');
                return;
            }

            try {
                console.log('Отправка запроса на регистрацию:', email);
                
                const response = await fetch('/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password
                    }),
                    credentials: 'include' // Важно для работы с cookie
                });

                console.log('Статус ответа:', response.status);
                
                if (response.ok) {
                    if (typeof showToast === 'function') {
                        showToast('Регистрация успешна! Пожалуйста, войдите.', 'success');
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 1000);
                    } else {
                        alert('Регистрация успешна! Пожалуйста, войдите.');
                        window.location.href = '/login';
                    }
                } else {
                    let errorMessage = 'Ошибка при регистрации';
                    try {
                        const error = await response.json();
                        errorMessage = error.detail || errorMessage;
                    } catch (e) {
                        console.error('Не удалось прочитать JSON из ответа:', e);
                    }
                    
                    if (typeof showToast === 'function') {
                        showToast(`Ошибка: ${errorMessage}`, 'danger');
                    } else {
                        alert(`Ошибка: ${errorMessage}`);
                    }
                }
            } catch (error) {
                console.error('Ошибка при регистрации:', error);
                
                if (typeof showToast === 'function') {
                    showToast('Произошла ошибка при регистрации', 'danger');
                } else {
                    alert('Произошла ошибка при регистрации');
                }
            }
        });
    }
});

function getAuthHeader() {
    const token = localStorage.getItem('token');
    console.log('getAuthHeader вызван, токен:', token ? 'Присутствует' : 'Отсутствует');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
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
    // Инициализируем контейнер для уведомлений
    setupToasts();
    
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
    
    // Проверяем, доступен ли bootstrap
    if (typeof bootstrap !== 'undefined') {
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: 5000
        });
        
        bsToast.show();
        
        // Удаляем уведомление после скрытия
        toast.addEventListener('hidden.bs.toast', function() {
            toast.remove();
        });
    } else {
        // Если bootstrap недоступен, просто показываем и скрываем через таймаут
        toast.style.display = 'block';
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    setupToasts();
});
