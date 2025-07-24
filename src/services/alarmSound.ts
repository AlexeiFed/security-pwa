/**
 * @file: alarmSound.ts
 * @description: Сервис для воспроизведения тревожных звуков
 * @dependencies: HTML5 Audio API
 * @created: 2025-06-27
 */

class AlarmSoundService {
    private audio: HTMLAudioElement | null = null;
    private isPlaying = false;

    constructor() {
        this.initAudio();
    }

    private initAudio() {
        try {
            this.audio = new Audio('/alarm.mp3');
            this.audio.loop = true;
            this.audio.volume = 0.7;

            // Обработчики событий
            this.audio.addEventListener('ended', () => {
                this.isPlaying = false;
            });

            this.audio.addEventListener('error', (error) => {
                console.error('Ошибка загрузки аудиофайла:', error);
                this.isPlaying = false;
            });
        } catch (error) {
            console.error('Ошибка инициализации аудио:', error);
        }
    }

    // Воспроизведение тревожной мелодии
    public playAlarm(): void {
        if (this.isPlaying || !this.audio) return;

        try {
            this.audio.play().then(() => {
                this.isPlaying = true;
                console.log('Тревожный звук начал воспроизведение');
            }).catch((error) => {
                console.error('Ошибка воспроизведения тревожного звука:', error);
                this.isPlaying = false;
            });
        } catch (error) {
            console.error('Ошибка воспроизведения:', error);
            this.isPlaying = false;
        }
    }

    // Остановка тревожной мелодии
    public stopAlarm(): void {
        if (!this.audio) return;

        try {
            this.audio.pause();
            this.audio.currentTime = 0;
            this.isPlaying = false;
            console.log('Тревожный звук остановлен');
        } catch (error) {
            console.error('Ошибка остановки тревожного звука:', error);
        }
    }

    // Простой тревожный сигнал (один раз)
    public playSimpleAlarm(): void {
        if (this.isPlaying || !this.audio) return;

        try {
            // Временно отключаем зацикливание для одного воспроизведения
            this.audio.loop = false;

            this.audio.play().then(() => {
                this.isPlaying = true;
                console.log('Простой тревожный звук воспроизведен');

                // Восстанавливаем зацикливание после окончания
                this.audio!.addEventListener('ended', () => {
                    this.audio!.loop = true;
                    this.isPlaying = false;
                }, { once: true });
            }).catch((error) => {
                console.error('Ошибка воспроизведения простого тревожного звука:', error);
                this.isPlaying = false;
                this.audio!.loop = true;
            });
        } catch (error) {
            console.error('Ошибка воспроизведения:', error);
            this.isPlaying = false;
            if (this.audio) {
                this.audio.loop = true;
            }
        }
    }

    // Проверка поддержки HTML5 Audio
    public isSupported(): boolean {
        return typeof HTMLAudioElement !== 'undefined';
    }

    // Получение статуса воспроизведения
    public getStatus(): boolean {
        return this.isPlaying;
    }

    // Установка громкости (0.0 - 1.0)
    public setVolume(volume: number): void {
        if (this.audio) {
            this.audio.volume = Math.max(0, Math.min(1, volume));
        }
    }

    // Получение текущей громкости
    public getVolume(): number {
        return this.audio ? this.audio.volume : 0;
    }
}

// Создаем единственный экземпляр сервиса
export const alarmSoundService = new AlarmSoundService();

// Экспортируем функции для удобства
export const playAlarm = () => alarmSoundService.playAlarm();
export const stopAlarm = () => alarmSoundService.stopAlarm();
export const playSimpleAlarm = () => alarmSoundService.playSimpleAlarm();
export const isAlarmSupported = () => alarmSoundService.isSupported();
export const getAlarmStatus = () => alarmSoundService.getStatus();
export const setAlarmVolume = (volume: number) => alarmSoundService.setVolume(volume);
export const getAlarmVolume = () => alarmSoundService.getVolume(); 