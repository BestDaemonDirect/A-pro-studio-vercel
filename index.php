<?php
$settings = require __DIR__ . '/settings.php';
require_once __DIR__ . '/telegram.php';

function get_current_url(): string
{
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    return $scheme . '://' . $host . $uri;
}

$currentUrl = get_current_url();
$formAction = htmlspecialchars($_SERVER['SCRIPT_NAME'] ?? '/index.php', ENT_QUOTES);
$statusMessage = '';

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$requestedPath = realpath(__DIR__ . $uri);
$staticRoot = realpath(__DIR__ . '/static');

if ($requestedPath !== false && $staticRoot !== false && str_starts_with($requestedPath, $staticRoot) && is_file($requestedPath)) {
    return false;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim((string)($_POST['name'] ?? ''));
    $email = trim((string)($_POST['email'] ?? ''));
    $phone = trim((string)($_POST['phone'] ?? ''));
    $comment = trim((string)($_POST['comment'] ?? ''));

    

    if (send_telegram_notification($settings, $name, $email, $phone, $comment, $errorMessage)) {
        $statusMessage = '<div class="form-status form-status--success">Спасибо! Ваша заявка отправлена.</div>';
    } else {
        $statusMessage = '<div class="form-status form-status--error">Ошибка отправки: ' . htmlspecialchars($errorMessage, ENT_QUOTES) . '</div>';
    }
}

$templatePath = __DIR__ . '/templates/landing.html';
if (!is_readable($templatePath)) {
    http_response_code(500);
    echo 'Шаблон не найден: ' . htmlspecialchars($templatePath, ENT_QUOTES);
    exit;
}

include $templatePath;
