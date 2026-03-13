<?php

class NotificationController {
    private PDO $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function getNotifications(): void {
        $user = Auth::requireAuth();

        $stmt = $this->db->prepare(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
        );
        $stmt->execute([$user['user_id']]);
        $notifications = $stmt->fetchAll();

        $stmt = $this->db->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = false');
        $stmt->execute([$user['user_id']]);
        $unreadCount = (int)$stmt->fetchColumn();

        Response::success([
            'notifications' => $notifications,
            'unread_count' => $unreadCount
        ]);
    }

    public function markRead(int $id): void {
        $user = Auth::requireAuth();

        $stmt = $this->db->prepare('UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?');
        $stmt->execute([(int)$id, $user['user_id']]);

        Response::success(null, 'Notification marked as read');
    }

    public function markAllRead(): void {
        $user = Auth::requireAuth();

        $stmt = $this->db->prepare('UPDATE notifications SET is_read = true WHERE user_id = ? AND is_read = false');
        $stmt->execute([$user['user_id']]);

        Response::success(null, 'All notifications marked as read');
    }
}
