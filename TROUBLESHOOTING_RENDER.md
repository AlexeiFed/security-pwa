# 🔧 Устранение проблем с Render сервером

## ❌ Проблема: "POST http://localhost:5001/createUser net::ERR_CONNECTION_REFUSED"

### 🔍 Причина
Браузер кэширует старую версию кода с локальным URL вместо Render сервера.

### ✅ Решение

#### 1. Очистка кэша браузера
1. **Chrome/Edge:** `Ctrl + Shift + R` (жесткая перезагрузка)
2. **Или:** `F12` → Network → "Disable cache" → перезагрузить страницу
3. **Или:** `Ctrl + Shift + Delete` → очистить кэш

#### 2. Режим инкогнито
1. Откройте приложение в режиме инкогнито
2. Попробуйте создать инспектора
3. Если работает - проблема в кэше

#### 3. Пересборка приложения
```bash
# Остановите dev сервер (Ctrl + C)
# Затем запустите заново:
npm start
```

#### 4. Проверка URL в коде
Убедитесь, что в файлах используется правильный URL:

**auth.ts:**
```typescript
const response = await fetch('https://push-server-b8p6.onrender.com/createUser', {
```

**notifications.ts:**
```typescript
const response = await fetch('https://push-server-b8p6.onrender.com/sendForceLogoutNotification', {
```

**pushNotifications.ts:**
```typescript
const PUSH_SERVER_URL = 'https://push-server-b8p6.onrender.com';
```

## 🧪 Тестирование после исправления

### 1. Проверка статуса сервера
```bash
curl https://push-server-b8p6.onrender.com/status
```

### 2. Тест создания пользователя
```bash
curl -X POST https://push-server-b8p6.onrender.com/createUser \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","role":"inspector","name":"Test User"}'
```

### 3. Проверка в браузере
1. Откройте DevTools (F12)
2. Перейдите на вкладку Network
3. Попробуйте создать инспектора
4. Убедитесь, что запрос идет на `https://push-server-b8p6.onrender.com`

## 🔄 Альтернативные решения

### Если проблема с кэшем не решается:

#### 1. Очистка localStorage
```javascript
// В консоли браузера:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

#### 2. Принудительная перезагрузка
```javascript
// В консоли браузера:
location.reload(true);
```

#### 3. Проверка service worker
```javascript
// В консоли браузера:
navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
        registration.unregister();
    }
});
location.reload();
```

## 📊 Проверка работоспособности

### ✅ Признаки успешного исправления:
- Запросы идут на `https://push-server-b8p6.onrender.com`
- Статус сервера: `200 OK`
- Создание пользователей работает
- Удаление пользователей работает
- Push-уведомления отправляются

### ❌ Признаки проблем:
- Запросы идут на `localhost:5001`
- Ошибки `ERR_CONNECTION_REFUSED`
- Ошибки `Failed to fetch`

## 🚀 Профилактика

### 1. Регулярная очистка кэша
- Используйте жесткую перезагрузку (`Ctrl + Shift + R`)
- Периодически очищайте кэш браузера

### 2. Проверка URL
- Регулярно проверяйте, что код использует правильные URL
- Используйте переменные окружения для URL

### 3. Мониторинг сервера
- Проверяйте статус: `https://push-server-b8p6.onrender.com/status`
- Следите за логами в Render Dashboard

## 📞 Если проблема не решается

1. **Проверьте логи в Render Dashboard**
2. **Убедитесь, что сервер работает:** `curl https://push-server-b8p6.onrender.com/status`
3. **Проверьте переменные окружения в Render**
4. **Обратитесь к документации:** `push-server/RENDER_DEPLOY.md`

---

**🔧 После применения этих решений проблема должна исчезнуть!** 