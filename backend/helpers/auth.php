<?php

class Auth {
    private static int $tokenExpiry = 86400; // 24 hours

    public static function generateToken(array $userData): string {
        $header = self::base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload = self::base64UrlEncode(json_encode([
            'user_id' => $userData['id'],
            'email' => $userData['email'],
            'role' => $userData['role'],
            'full_name' => $userData['full_name'],
            'iat' => time(),
            'exp' => time() + self::$tokenExpiry
        ]));
        $signature = self::base64UrlEncode(
            hash_hmac('sha256', "$header.$payload", self::getSecretKey(), true)
        );
        return "$header.$payload.$signature";
    }

    public static function validateToken(): ?array {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;

        if (!$authHeader || !preg_match('/^Bearer\s+(.+)$/', $authHeader, $matches)) {
            return null;
        }

        $token = $matches[1];
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        [$header, $payload, $signature] = $parts;

        $expectedSignature = self::base64UrlEncode(
            hash_hmac('sha256', "$header.$payload", self::getSecretKey(), true)
        );

        if (!hash_equals($expectedSignature, $signature)) return null;

        $data = json_decode(self::base64UrlDecode($payload), true);
        if (!$data || !isset($data['exp']) || $data['exp'] < time()) return null;

        return $data;
    }

    public static function requireAuth(): array {
        $user = self::validateToken();
        if (!$user) {
            Response::error('Unauthorized', 401);
        }
        return $user;
    }

    public static function requireRole(string ...$roles): array {
        $user = self::requireAuth();
        if (!in_array($user['role'], $roles)) {
            Response::error('Forbidden: insufficient permissions', 403);
        }
        return $user;
    }

    public static function hashPassword(string $password): string {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
    }

    public static function verifyPassword(string $password, string $hash): bool {
        return password_verify($password, $hash);
    }

    private static function getSecretKey(): string {
        return getenv('JWT_SECRET') ?: 'change-this-jwt-secret';
    }

    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
