<?php

class PublicController {
    private PDO $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function getDoctors(): void {
        $stmt = $this->db->query(
            "SELECT id, full_name, specialization, profile_photo
             FROM users
             WHERE role = 'doctor' AND is_active = true
             ORDER BY full_name ASC"
        );

        Response::success($stmt->fetchAll());
    }
}
