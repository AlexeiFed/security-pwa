/**
 * @file: clear-cache.js
 * @description: Скрипт для очистки кэша браузера и перезагрузки приложения
 */

// Очистка всех кэшей
if ('caches' in window) {
    caches.keys().then(function (cacheNames) {
        return Promise.all(
            cacheNames.map(function (cacheName) {
                console.log('🗑️ Удаление кэша:', cacheName);
                return caches.delete(cacheName);
            })
        );
    }).then(function () {
        console.log('✅ Все кэши очищены');
    });
}

// Очистка localStorage и sessionStorage
localStorage.clear();
sessionStorage.clear();
console.log('✅ localStorage и sessionStorage очищены');

// Удаление service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister();
            console.log('🗑️ Service Worker удален');
        }
    });
}

// Принудительная перезагрузка страницы
console.log('🔄 Перезагрузка страницы...');
setTimeout(function () {
    window.location.reload(true);
}, 1000); 