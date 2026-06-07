<?php

function send_telegram_notification(
    array $settings,
    string $name,
    string $email,
    string $phone,
    string $comment,
    ?string &$error = null
): bool {

    $token = $settings['TELEGRAM_BOT_TOKEN'] ?? '';
    $chatId = $settings['TELEGRAM_BOT_CHAT_ID'] ?? '';

    $log = function ($msg) {
        $time = date('Y-m-d H:i:s');
        echo "[$time] $msg\n";
        error_log("[$time] $msg");
    };

    $log("🚀 Starting Telegram send...");

    if (!$token || !$chatId) {
        $error = 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_CHAT_ID';
        $log("❌ Config error: $error");
        return false;
    }

    $text =
        "📩 New contact from A-Pro Studio\n\n" .
        "🌐 Website: https://studio.a-pro.kz/\n\n" .
        "👤 Name: " . ($name ?: '-') . "\n" .
        "📧 Email: " . ($email ?: '-') . "\n" .
        "📞 Phone: " . ($phone ?: '-') . "\n\n" .
        "💬 Message: " . ($comment ?: '-Nothing...');

    $url = "https://api.telegram.org/bot{$token}/sendMessage";

    $postData = [
        'chat_id' => $chatId,
        'text' => $text,
        'disable_web_page_preview' => true,
    ];

    $log("📤 Sending request to Telegram...");
    $log("URL: $url");
    $log("CHAT_ID: $chatId");

    $ch = curl_init($url);

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($postData),
        CURLOPT_TIMEOUT => 10,
    ]);

    $response = curl_exec($ch);

    $curlError = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    curl_close($ch);

    $log("📥 HTTP CODE: $httpCode");
    $log("📥 RESPONSE: " . $response);

    if ($response === false) {
        $error = "cURL error: $curlError";
        $log("❌ cURL FAILED: $curlError");
        return false;
    }

    if ($httpCode !== 200) {
        $error = "HTTP error: $httpCode";
        $log("❌ HTTP ERROR: $httpCode");
        return false;
    }

    $decoded = json_decode($response, true);

    if (!is_array($decoded) || empty($decoded['ok'])) {
        $error = "Telegram error: " . ($decoded['description'] ?? $response);
        $log("❌ TELEGRAM ERROR: " . $error);
        return false;
    }

    $log("✅ Message sent successfully!");
    return true;
}