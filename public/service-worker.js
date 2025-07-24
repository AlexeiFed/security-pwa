/**
 * @file: service-worker.js
 * @description: Service Worker для обработки push-уведомлений и тревожных сигналов
 * @dependencies: OneSignal, Web Audio API
 * @created: 2025-07-11
 */

/* eslint-disable */

// Кэширование статических ресурсов
const CACHE_NAME = 'security-pwa-v6';
const urlsToCache = [
    '/',
    '/static/js/bundle.js',
    '/static/css/main.css',
    '/logo192.png',
    '/logo512.png',
    '/manifest.json',
    '/alarm.mp3'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: установка v7');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Service Worker: кэширование файлов');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('❌ Service Worker: ошибка кэширования:', error);
            })
    );
    // Активируем новый Service Worker сразу
    self.skipWaiting();
});

// Обработка установки PWA
self.addEventListener('beforeinstallprompt', (event) => {
    console.log('📱 PWA: доступна установка');
    // Сохраняем событие для показа промпта установки позже
    event.preventDefault();
    self.deferredPrompt = event;
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: активация v6');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Service Worker: удаление старого кэша', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    event.waitUntil(
        (async () => {
            await clients.claim();
            console.log('✅ Service Worker: активирован и готов к работе');
            // Оповещаем все вкладки о новой версии
            const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (const client of allClients) {
                client.postMessage({ type: 'NEW_VERSION_AVAILABLE' });
            }
        })()
    );
});

// Обработка fetch запросов
self.addEventListener('fetch', (event) => {
    // Пропускаем запросы к OneSignal
    if (event.request.url.includes('onesignal.com')) {
        return;
    }

    // Network-first для index.html и навигации
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Обновляем кэш
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Cache-first для остальных файлов
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            })
            .catch((error) => {
                console.error('❌ Service Worker: ошибка fetch:', error);
            })
    );
});

// Обработка push-уведомлений (чистый web push)
self.addEventListener('push', function (event) {
    let data = {};
    try {
        data = event.data.json();
    } catch {
        data = { title: 'Тревога!', body: 'Получен сигнал тревоги', type: 'alarm' };
    }

    const options = {
        body: data.body,
        icon: '/icons/logo-vityaz.png',
        badge: '/icons/logo-vityaz.png',
        data: data,
        requireInteraction: data.type === 'force_logout', // Требуем взаимодействия для force_logout
        tag: data.type === 'force_logout' ? 'force_logout' : (data.type === 'alarm' ? 'alarm' : 'notification'),
        actions: data.type === 'force_logout' ? [
            {
                action: 'logout',
                title: 'Выйти'
            },
            {
                action: 'close',
                title: 'Закрыть'
            }
        ] : [
            {
                action: 'open',
                title: 'Открыть PWA'
            },
            {
                action: 'close',
                title: 'Закрыть'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );

    // Воспроизводим звук тревоги
    if (data.type === 'alarm') {
        playAlarmSound();
    }

    // Для force_logout сразу отправляем сообщение всем клиентам
    if (data.type === 'force_logout') {
        console.log('🚪 Получено уведомление о принудительном выходе, отправляем сообщение клиентам');
        event.waitUntil(
            clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            }).then(function (clientList) {
                console.log('🔍 Найдено клиентов для принудительного выхода:', clientList.length);
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url.includes(self.location.origin)) {
                        console.log('📤 Отправляем FORCE_LOGOUT клиенту:', client.url);
                        client.postMessage({
                            type: 'FORCE_LOGOUT',
                            data: data
                        });
                    }
                }
            })
        );
    }
});

function playAlarmSound() {
    try {
        // Создаем новый AudioContext для каждого воспроизведения
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Воспроизводим звук с задержкой для стабильности
        setTimeout(() => {
            fetch('/alarm.mp3')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Не удалось загрузить звук тревоги');
                    }
                    return response.arrayBuffer();
                })
                .then(buffer => audioContext.decodeAudioData(buffer))
                .then(decoded => {
                    const source = audioContext.createBufferSource();
                    source.buffer = decoded;
                    source.connect(audioContext.destination);
                    source.start(0);
                    console.log('🔊 Звук тревоги воспроизводится');
                })
                .catch(error => {
                    console.error('❌ Ошибка воспроизведения звука тревоги:', error);
                });
        }, 100);
    } catch (error) {
        console.error('❌ Ошибка создания AudioContext:', error);
    }
}

self.addEventListener('notificationclick', function (event) {
    console.log('🖱️ Service Worker: клик по уведомлению', event.notification.data);

    // Закрываем уведомление
    event.notification.close();

    // Обрабатываем действия уведомления
    if (event.action === 'close') {
        console.log('❌ Пользователь закрыл уведомление');
        return;
    }

    // Обрабатываем принудительный выход
    if (event.action === 'logout') {
        console.log('🚪 Пользователь подтвердил выход из системы');
        event.waitUntil(
            clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            }).then(function (clientList) {
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url.includes(self.location.origin)) {
                        client.postMessage({
                            type: 'FORCE_LOGOUT',
                            data: event.notification.data
                        });
                        // Фокусируемся на клиенте перед выходом
                        return client.focus();
                    }
                }
            })
        );
        return;
    }

    // Воспроизводим звук для тревожных уведомлений
    if (event.notification.data?.type === 'alarm') {
        playAlarmSound();
    }

    // Определяем URL для открытия
    let urlToOpen = '/';

    if (event.notification.data?.type === 'alarm') {
        // Для тревожных уведомлений открываем тревожный экран
        const objectId = event.notification.data?.objectId;
        urlToOpen = objectId ? `/alarm/${objectId}` : '/alarm';
    } else if (event.notification.data?.type === 'force_logout') {
        // Для уведомлений о принудительном выходе открываем страницу входа
        urlToOpen = '/login';
    } else {
        urlToOpen = event.notification.data?.url || '/';
    }

    console.log('🎯 URL для навигации:', urlToOpen);

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function (clientList) {
            console.log('🔍 Найдено клиентов:', clientList.length);

            // Ищем уже открытое PWA окно
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                console.log('🔍 Проверяем клиент:', client.url);

                // Проверяем, что это наше PWA приложение
                if (client.url.includes(self.location.origin)) {
                    console.log('✅ Фокусируемся на существующем PWA окне');

                    // Отправляем сообщение для навигации
                    client.postMessage({
                        type: 'NAVIGATE_TO_ALARM',
                        url: urlToOpen,
                        data: event.notification.data
                    });

                    return client.focus();
                }
            }

            // Если PWA окно не найдено, открываем новое
            console.log('🆕 Открываем новое PWA окно с URL:', urlToOpen);
            return clients.openWindow(urlToOpen);
        }).catch((error) => {
            console.error('❌ Ошибка при открытии PWA:', error);
            // Fallback - открываем в текущем окне
            return clients.openWindow(urlToOpen);
        })
    );
});

// Обработка закрытия уведомлений
self.addEventListener('notificationclose', (event) => {
    console.log('❌ Service Worker: уведомление закрыто', event);
});

// Обработка сообщений от основного приложения
self.addEventListener('message', (event) => {
    console.log('💬 Service Worker: получено сообщение', event.data);

    if (event.data && event.data.type === 'PLAY_ALARM') {
        // Воспроизводим тревожный звук в Service Worker
        playAlarmSound();
    }
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: 'v2' });
    }
}); 