import { readFileSync, writeFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const LITERALS_DIR = `${__dirname}/../public/i18n/literals`;

// All new English strings that need translations
const NEW_KEYS = [
  // models/page.js
  "All built-in and custom models across providers.",
  "models.dev catalog is unavailable.",
  "Refreshing...",
  "Refresh models.dev",
  "Search by model id, name or alias...",
  "All providers",
  "No models found.",
  "Importing...",
  "Import from models.dev",
  "Edit model",
  "Enable model",
  "Disable model",
  "Delete custom model",
  "Delete Custom Model",

  // EditModelModal.js
  "Alias",
  "Friendly name for routing",
  "Capabilities",
  "Reset to defaults",
  "Context window (tokens)",
  "Max output (tokens)",
  "Pricing",
  "($ per 1M tokens, empty = unset)",
  "Vision (image input)",
  "Reasoning / thinking",
  "Tool calling",
  "PDF input",
  "Image output",
  "Audio input",
  "Input",
  "Output",
  "Cached input",
  "Cache creation",

  // ImportModelsModal.js
  "Import Models from Provider",
  "Done",
  "Fetching models from provider...",
  "Search models...",
  "Select All",
  "No models match the search",
  "added",
  "Provider returned 0 models",

  // CompatibleModelsSection.js
  "Model ID",
  "Adding...",
  "Import from /models",
  "Set a Base URL on the active connection to enable importing models.",
  "Add a connection to enable importing models.",
  "Remove model",
  "Copied!",
  "Testing...",
  "Test",

  // ModelsCard.js
  "Add Custom Model",
  "Remove custom model",
  "FREE",

  // Sidebar.js / Header.js
  "Models",
  "Browse and edit models across all providers",

  // Header.js — previously untranslated page titles/descriptions
  "Usage & Analytics",
  "Auth Files",
  "Map provider credentials stored in the local database",
  "Track and manage your API quota limits",
  "MITM Proxy",
  "Token Saver",
  "Compress prompts and outputs to save tokens",
  "Proxy Pools",
  "Manage your proxy pool configurations",
  "Agent Skills",
  "Copy a link and paste to your AI to use 9Router — no install needed",
  "Media Providers",
  "Manage your",
  "providers",
];

// Russian translations
const RU = {
  "All built-in and custom models across providers.": "Все встроенные и пользовательские модели по провайдерам.",
  "models.dev catalog is unavailable.": "Каталог models.dev недоступен.",
  "Refreshing...": "Обновление...",
  "Refresh models.dev": "Обновить models.dev",
  "Search by model id, name or alias...": "Поиск по ID, имени или псевдониму модели...",
  "All providers": "Все провайдеры",
  "No models found.": "Модели не найдены.",
  "Importing...": "Импорт...",
  "Import from models.dev": "Импорт из models.dev",
  "Edit model": "Редактировать модель",
  "Enable model": "Включить модель",
  "Disable model": "Отключить модель",
  "Delete custom model": "Удалить модель",
  "Delete Custom Model": "Удалить модель",
  "Alias": "Псевдоним",
  "Friendly name for routing": "Понятное имя для маршрутизации",
  "Capabilities": "Возможности",
  "Reset to defaults": "Сбросить к значениям по умолчанию",
  "Context window (tokens)": "Контекстное окно (токенов)",
  "Max output (tokens)": "Макс. вывод (токенов)",
  "Pricing": "Цены",
  "($ per 1M tokens, empty = unset)": "($ за 1M токенов, пусто = не задано)",
  "Vision (image input)": "Зрение (ввод изображений)",
  "Reasoning / thinking": "Рассуждение / обдумывание",
  "Tool calling": "Вызов инструментов",
  "PDF input": "Ввод PDF",
  "Image output": "Вывод изображений",
  "Audio input": "Ввод аудио",
  "Input": "Ввод",
  "Output": "Вывод",
  "Cached input": "Кэшированный ввод",
  "Cache creation": "Создание кэша",
  "Import Models from Provider": "Импорт моделей от провайдера",
  "Done": "Готово",
  "Fetching models from provider...": "Получение моделей от провайдера...",
  "Search models...": "Поиск моделей...",
  "Select All": "Выбрать все",
  "No models match the search": "Нет моделей по запросу",
  "added": "добавлено",
  "Provider returned 0 models": "Провайдер вернул 0 моделей",
  "Model ID": "ID модели",
  "Adding...": "Добавление...",
  "Import from /models": "Импорт из /models",
  "Set a Base URL on the active connection to enable importing models.": "Укажите Base URL в активном подключении для импорта моделей.",
  "Add a connection to enable importing models.": "Добавьте подключение для импорта моделей.",
  "Remove model": "Удалить модель",
  "Copied!": "Скопировано!",
  "Testing...": "Тестирование...",
  "Test": "Тест",
  "Add Custom Model": "Добавить модель",
  "Remove custom model": "Удалить модель",
  "FREE": "БЕСПЛАТНО",
  "Models": "Модели",
  "Browse and edit models across all providers": "Просмотр и редактирование моделей всех провайдеров",
  "Usage & Analytics": "Использование и аналитика",
  "Auth Files": "Файлы аутентификации",
  "Map provider credentials stored in the local database": "Управление учётными данными провайдеров в локальной БД",
  "Track and manage your API quota limits": "Отслеживание и управление квотами API",
  "MITM Proxy": "MITM Прокси",
  "Token Saver": "Экономия токенов",
  "Compress prompts and outputs to save tokens": "Сжатие промптов и ответов для экономии токенов",
  "Proxy Pools": "Пулы прокси",
  "Manage your proxy pool configurations": "Управление конфигурациями пулов прокси",
  "Agent Skills": "Навыки агента",
  "Copy a link and paste to your AI to use 9Router — no install needed": "Скопируйте ссылку и вставьте в ваш AI для использования 9Router — без установки",
  "Media Providers": "Медиа-провайдеры",
  "Manage your": "Управление",
  "providers": "провайдерами",
};

const files = readdirSync(LITERALS_DIR).filter((f) => f.endsWith(".json"));

let addedTotal = 0;

for (const file of files) {
  const path = `${LITERALS_DIR}/${file}`;
  const data = JSON.parse(readFileSync(path, "utf-8"));
  const locale = file.replace(".json", "");
  let added = 0;

  for (const key of NEW_KEYS) {
    if (data[key] !== undefined) continue;
    if (locale === "ru") {
      data[key] = RU[key] || key;
    } else {
      data[key] = key; // fallback: English value
    }
    added++;
  }

  if (added > 0) {
    writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
    console.log(`${file}: +${added} keys`);
    addedTotal += added;
  }
}

console.log(`\nTotal: ${addedTotal} keys added across ${files.length} files`);
