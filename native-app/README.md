# Security PWA Native App с NaviKit SDK

## Обзор

Нативное мобильное приложение для Security PWA с интеграцией NaviKit SDK от Яндекса для полноценной навигации.

## Возможности

- ✅ **Полная навигация** - пошаговые инструкции и голосовые команды
- ✅ **Офлайн карты** - работа без интернета
- ✅ **Обновление маршрута** - автоматическое перестроение при отклонении
- ✅ **Информация о пробках** - учет дорожной обстановки
- ✅ **Голосовые команды** - управление навигацией голосом
- ✅ **Интеграция с PWA** - синхронизация данных между веб и нативным приложением

## Установка

### Предварительные требования

- Node.js 16+
- React Native CLI
- Android Studio (для Android)
- Xcode (для iOS)
- Yandex.Cloud аккаунт с NaviKit API ключом

### 1. Клонирование и установка зависимостей

```bash
# Клонирование репозитория
git clone https://github.com/your-org/security-pwa-native.git
cd security-pwa-native

# Установка зависимостей
npm install

# Установка iOS зависимостей (только для macOS)
cd ios && pod install && cd ..
```

### 2. Настройка NaviKit SDK

#### Получение API ключа

1. Зарегистрируйтесь в [Yandex.Cloud](https://cloud.yandex.ru/)
2. Создайте новый проект
3. Активируйте NaviKit API
4. Получите API ключ в разделе "Сервисные аккаунты"

#### Настройка для Android

1. Откройте `android/app/src/main/AndroidManifest.xml`
2. Добавьте разрешения:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

3. Добавьте API ключ в `android/app/src/main/res/values/strings.xml`:

```xml
<string name="navikit_api_key">YOUR_NAVIKIT_API_KEY</string>
```

#### Настройка для iOS

1. Откройте `ios/SecurityPWA/Info.plist`
2. Добавьте разрешения:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Приложению необходим доступ к геолокации для навигации</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Приложению необходим доступ к геолокации для навигации в фоне</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>Приложению необходим доступ к геолокации для навигации в фоне</string>
```

3. Добавьте API ключ в `ios/SecurityPWA/AppDelegate.mm`:

```objc
#import <YandexNaviKit/YandexNaviKit.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Инициализация NaviKit
  [YandexNaviKit initializeWithApiKey:@"YOUR_NAVIKIT_API_KEY"];
  
  return YES;
}
```

### 3. Настройка Firebase

1. Создайте проект в Firebase Console
2. Добавьте Android и iOS приложения
3. Скачайте конфигурационные файлы:
   - `google-services.json` для Android
   - `GoogleService-Info.plist` для iOS
4. Разместите файлы в соответствующих папках

### 4. Запуск приложения

```bash
# Запуск Metro сервера
npm start

# Запуск на Android
npm run android

# Запуск на iOS
npm run ios
```

## Структура проекта

```
native-app/
├── src/
│   ├── components/
│   │   ├── NaviKitNavigator.tsx    # Компонент навигации с NaviKit
│   │   ├── InspectorTasks.tsx      # Список заданий
│   │   └── InspectorProfile.tsx    # Профиль инспектора
│   ├── services/
│   │   ├── navikit.ts              # Сервис для работы с NaviKit
│   │   ├── auth.ts                 # Аутентификация
│   │   └── tasks.ts                # Работа с заданиями
│   ├── navigation/
│   │   └── AppNavigator.tsx        # Навигация приложения
│   └── utils/
│       └── permissions.ts          # Управление разрешениями
├── android/                        # Android конфигурация
├── ios/                           # iOS конфигурация
└── package.json
```

## Использование NaviKit SDK

### Инициализация

```typescript
import { NaviKit } from '@yandex/navi-kit-react-native';

const naviKit = new NaviKit({
    apiKey: 'YOUR_NAVIKIT_API_KEY',
    language: 'ru',
    voiceLanguage: 'ru'
});
```

### Запуск навигации

```typescript
const startNavigation = async (destination: [number, number], name: string) => {
    try {
        await naviKit.startNavigation({
            destination: {
                latitude: destination[0],
                longitude: destination[1],
                name: name
            },
            routingMode: 'driving',
            avoidTrafficJams: true
        });
    } catch (error) {
        console.error('Ошибка запуска навигации:', error);
    }
};
```

### Обработка событий

```typescript
// Пошаговые инструкции
naviKit.onInstruction((instruction) => {
    console.log('Инструкция:', instruction.text);
    console.log('Расстояние:', instruction.distance);
    console.log('Маневр:', instruction.maneuver);
});

// Обновление маршрута
naviKit.onRouteUpdate((route) => {
    console.log('Время в пути:', route.duration);
    console.log('Расстояние:', route.distance);
    console.log('Пробки:', route.trafficLevel);
});

// Ошибки
naviKit.onError((error) => {
    console.error('Ошибка навигации:', error);
});
```

## Сборка для продакшена

### Android

```bash
# Сборка APK
npm run build:android

# APK будет создан в android/app/build/outputs/apk/release/
```

### iOS

```bash
# Сборка для App Store
npm run build:ios

# Архив будет создан в ios/SecurityPWA.xcarchive
```

## Интеграция с PWA

### Синхронизация данных

Приложение синхронизируется с PWA через Firebase:

- **Задания** - загружаются из Firestore
- **Профили** - синхронизируются с Firebase Auth
- **Уведомления** - получаются через Firebase Messaging

### Переключение между PWA и нативным приложением

```typescript
// Проверка доступности нативного приложения
const isNativeAppAvailable = () => {
    return Platform.OS === 'ios' || Platform.OS === 'android';
};

// Открытие нативного приложения из PWA
const openNativeApp = () => {
    if (Platform.OS === 'ios') {
        Linking.openURL('securitypwa://');
    } else if (Platform.OS === 'android') {
        Linking.openURL('intent://securitypwa#Intent;scheme=securitypwa;package=com.securitypwa.app;end');
    }
};
```

## Устранение неполадок

### Частые проблемы

1. **NaviKit не инициализируется**
   - Проверьте правильность API ключа
   - Убедитесь, что NaviKit API активирован в Yandex.Cloud

2. **Геолокация не работает**
   - Проверьте разрешения в настройках устройства
   - Убедитесь, что GPS включен

3. **Карты не загружаются**
   - Проверьте интернет-соединение
   - Убедитесь, что API ключ имеет доступ к картам

### Логи

```bash
# Просмотр логов Android
adb logcat | grep SecurityPWA

# Просмотр логов iOS
xcrun simctl spawn booted log stream --predicate 'process == "SecurityPWA"'
```

## Поддержка

- **Документация NaviKit**: https://yandex.ru/dev/navi-kit/
- **Yandex.Cloud**: https://cloud.yandex.ru/docs/navi-kit/
- **React Native**: https://reactnative.dev/
- **Firebase**: https://firebase.google.com/docs

## Лицензия

MIT License 