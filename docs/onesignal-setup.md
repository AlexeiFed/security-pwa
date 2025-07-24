# Настройка OneSignal для Push-уведомлений

## Шаг 1: Регистрация в OneSignal

1. Перейдите на [https://onesignal.com/](https://onesignal.com/)
2. Зарегистрируйтесь и создайте аккаунт
3. Создайте новое приложение
4. Выберите платформу **Web Push**

## Шаг 2: Получение App ID

1. В панели OneSignal перейдите в **Settings** → **Keys & IDs**
2. Скопируйте **OneSignal App ID**
3. Замените `your-onesignal-app-id` в файле `src/services/oneSignal.ts`

## Шаг 3: Получение REST API Key

1. В панели OneSignal перейдите в **Settings** → **Keys & IDs**
2. Скопируйте **REST API Key**
3. Замените `YOUR_REST_API_KEY` в файле `src/services/oneSignal.ts`

## Шаг 4: Настройка домена

1. В панели OneSignal перейдите в **Settings** → **Web Configuration**
2. Добавьте ваш домен (например, `https://your-app.firebaseapp.com`)
3. Для разработки добавьте `http://localhost:3000`

## Шаг 5: Обновление кода

### В файле `src/services/oneSignal.ts`:

```typescript
// Замените на ваш App ID
const ONESIGNAL_APP_ID = 'ваш-app-id-здесь';

// В функциях sendNotificationToAll и sendNotificationToUsers замените:
'Authorization': 'Basic ВАШ_REST_API_KEY_ЗДЕСЬ'
```

## Шаг 6: Тестирование

1. Соберите проект: `npm run build`
2. Деплойте: `firebase deploy`
3. Откройте приложение и разрешите уведомления
4. Протестируйте тревожную кнопку

## Особенности OneSignal

- **Бесплатный тариф**: до 10 000 подписчиков
- **Логотип OneSignal**: отображается в уведомлениях на бесплатном тарифе
- **Геолокация**: можно отправлять уведомления по регионам
- **Сегментация**: можно создавать группы пользователей
- **Аналитика**: статистика по уведомлениям

## Альтернативы

Если OneSignal не подходит, можно использовать:
- **Pushwoosh** - аналогичный сервис
- **WonderPush** - для мобильных приложений
- **Свой сервер** на бесплатном хостинге

## Поддержка

- [OneSignal Documentation](https://documentation.onesignal.com/)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [PWA Push Notifications](https://web.dev/push-notifications/) 