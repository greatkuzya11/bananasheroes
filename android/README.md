# Bananas Heroes Android

Это минимальная Android-обертка вокруг текущей HTML5-версии игры.

Как это устроено:
- `MainActivity` открывает `file:///android_asset/www/index.html` в полноэкранном `WebView`.
- Веб-ассеты не дублируются вручную в репозитории.
- На этапе Android-сборки task `syncWebAssets` копирует в `assets/www` только нужные файлы из корня проекта: `index.html`, `style.css`, `sw.js`, `js/`, `img/`, `audio/`, `favicon.*`.

Сборка APK:
1. Установить Android Studio или Android SDK с API 33.
2. Открыть папку [android](C:/Users/kuzya/Documents/GitHub/bananasheroes/android) в Android Studio.
3. Дождаться Gradle Sync и собрать `Build > Build APK(s)`.

CLI-вариант:
- если у тебя уже есть `gradle` или `gradlew`, собирай из папки [android](C:/Users/kuzya/Documents/GitHub/bananasheroes/android) командой `assembleDebug`
- итоговый debug APK будет в `app/build/outputs/apk/debug/`

Замечания:
- `serviceWorker` отключен для `file://`, потому что Android WebView грузит игру из `android_asset`.
- Кнопка Back в Android заведена на игровую логику: закрывает экраны/паузу, возвращает в меню и только из главного меню дает выйти из приложения.
