<?php
function load_dotenv(string $path): void
{
    if (!is_file($path) || !is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $equalsPos = strpos($line, '=');
        if ($equalsPos === false) {
            continue;
        }

        $name = trim(substr($line, 0, $equalsPos));
        $value = trim(substr($line, $equalsPos + 1));

        if ($name === '') {
            continue;
        }

        if ((str_starts_with($value, '"') && str_ends_with($value, '"')) || (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
            $value = substr($value, 1, -1);
        }

        $value = str_replace(['\\n', '\\r', '\\t'], ["\n", "\r", "\t"], $value);

        if (getenv($name) === false) {
            putenv("{$name}={$value}");
        }
        if (!isset($_ENV[$name])) {
            $_ENV[$name] = $value;
        }
        if (!isset($_SERVER[$name])) {
            $_SERVER[$name] = $value;
        }
    }
}

load_dotenv(__DIR__ . '/.env');

return [
    'DEBUG' => filter_var(getenv('DEBUG'), FILTER_VALIDATE_BOOLEAN),
    'TELEGRAM_BOT_TOKEN' => getenv('TELEGRAM_BOT_TOKEN') ?: '',
    'TELEGRAM_BOT_CHAT_ID' => getenv('TELEGRAM_BOT_CHAT_ID') ?: '',
];
