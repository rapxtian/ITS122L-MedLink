<?php

class PatientController {
    private PDO $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // ===== DASHBOARD =====
    public function getDashboard(): void {
        $user = Auth::requireRole('patient');

        // Get children
        $stmt = $this->db->prepare('SELECT * FROM children WHERE parent_id = ?');
        $stmt->execute([$user['user_id']]);
        $children = $stmt->fetchAll();

        // Upcoming appointments
        $stmt = $this->db->prepare(
            'SELECT a.*, c.full_name AS child_name, u.full_name AS doctor_name, u.specialization
             FROM appointments a
             JOIN children c ON a.child_id = c.id
             JOIN users u ON a.doctor_id = u.id
             WHERE a.parent_id = ? AND a.status = 'Upcoming' AND a.appointment_date >= CURRENT_DATE
             ORDER BY a.appointment_date ASC, a.appointment_time ASC
             LIMIT 5'
        );
        $stmt->execute([$user['user_id']]);
        $upcomingAppointments = $stmt->fetchAll();

        // Recent medical records
        $stmt = $this->db->prepare(
            'SELECT mr.*, c.full_name AS child_name, u.full_name AS doctor_name
             FROM medical_records mr
             JOIN children c ON mr.child_id = c.id
             JOIN users u ON mr.doctor_id = u.id
             WHERE c.parent_id = ?
             ORDER BY mr.record_date DESC LIMIT 5'
        );
        $stmt->execute([$user['user_id']]);
        $recentRecords = $stmt->fetchAll();

        // Active prescriptions
        $stmt = $this->db->prepare(
            'SELECT rx.*, c.full_name AS child_name, u.full_name AS issued_by_name
             FROM prescriptions rx
             JOIN children c ON rx.child_id = c.id
             JOIN users u ON rx.issued_by = u.id
             WHERE c.parent_id = ? AND rx.status = 'Active'
             ORDER BY rx.issued_date DESC'
        );
        $stmt->execute([$user['user_id']]);
        $activePrescriptions = $stmt->fetchAll();

        // Appointment stats
        $stmt = $this->db->prepare(
            'SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'Upcoming' THEN 1 ELSE 0 END) AS upcoming,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled
             FROM appointments WHERE parent_id = ?'
        );
        $stmt->execute([$user['user_id']]);
        $stats = $stmt->fetch();

        // Unread notifications count
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = false');
        $stmt->execute([$user['user_id']]);
        $unreadNotifications = (int)$stmt->fetchColumn();

        Response::success([
            'children' => $children,
            'upcoming_appointments' => $upcomingAppointments,
            'recent_records' => $recentRecords,
            'active_prescriptions' => $activePrescriptions,
            'stats' => $stats,
            'unread_notifications' => $unreadNotifications
        ]);
    }

    // ===== CHILDREN =====
    public function getChildren(): void {
        $user = Auth::requireRole('patient');

        $stmt = $this->db->prepare('SELECT * FROM children WHERE parent_id = ? ORDER BY full_name');
        $stmt->execute([$user['user_id']]);

        Response::success($stmt->fetchAll());
    }

    public function addChild(): void {
        $user = Auth::requireRole('patient');
        $data = getInput();

        $v = new Validator();
        $v->required('full_name', $data['full_name'] ?? null, 'Child Name')
          ->required('date_of_birth', $data['date_of_birth'] ?? null, 'Date of Birth')
          ->date('date_of_birth', $data['date_of_birth'] ?? null, 'Date of Birth')
          ->required('gender', $data['gender'] ?? null, 'Gender')
          ->inList('gender', $data['gender'] ?? null, ['Male', 'Female'], 'Gender');
        $v->validate();

        $stmt = $this->db->prepare(
            'INSERT INTO children (parent_id, full_name, date_of_birth, gender, known_allergies, medical_history) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $user['user_id'],
            trim($data['full_name']),
            $data['date_of_birth'],
            $data['gender'],
            trim($data['known_allergies'] ?? ''),
            trim($data['medical_history'] ?? '')
        ]);

        Response::success(['id' => (int)$this->db->lastInsertId()], 'Child added successfully', 201);
    }

    // ===== MEDICAL RECORDS =====
    public function getMedicalRecords(): void {
        $user = Auth::requireRole('patient');

        $childId = getQueryParam('child_id');

        $sql = 'SELECT mr.*, c.full_name AS child_name, u.full_name AS doctor_name, u.specialization
                FROM medical_records mr
                JOIN children c ON mr.child_id = c.id
                JOIN users u ON mr.doctor_id = u.id
                WHERE c.parent_id = ?';
        $params = [$user['user_id']];

        if ($childId) {
            $sql .= ' AND mr.child_id = ?';
            $params[] = (int)$childId;
        }

        $sql .= ' ORDER BY mr.record_date DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll();

        // Attach prescriptions
        foreach ($records as &$record) {
            $stmt = $this->db->prepare('SELECT * FROM prescriptions WHERE medical_record_id = ?');
            $stmt->execute([(int)$record['id']]);
            $record['prescriptions'] = $stmt->fetchAll();
        }

        Response::success($records);
    }

    // ===== PRESCRIPTIONS =====
    public function getPrescriptions(): void {
        $user = Auth::requireRole('patient');

        $childId = getQueryParam('child_id');
        $status = getQueryParam('status');

        $sql = 'SELECT rx.*, c.full_name AS child_name, u.full_name AS issued_by_name
                FROM prescriptions rx
                JOIN children c ON rx.child_id = c.id
                JOIN users u ON rx.issued_by = u.id
                WHERE c.parent_id = ?';
        $params = [$user['user_id']];

        if ($childId) {
            $sql .= ' AND rx.child_id = ?';
            $params[] = (int)$childId;
        }
        if ($status) {
            $sql .= ' AND rx.status = ?';
            $params[] = $status;
        }

        $sql .= ' ORDER BY rx.issued_date DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        Response::success($stmt->fetchAll());
    }

    // ===== LAB RESULTS =====
    public function getLabResults(): void {
        $user = Auth::requireRole('patient');

        $childId = getQueryParam('child_id');

        $sql = 'SELECT lr.*, c.full_name AS child_name, u.full_name AS ordered_by_name
                FROM lab_results lr
                JOIN children c ON lr.child_id = c.id
                JOIN users u ON lr.ordered_by = u.id
                WHERE c.parent_id = ?';
        $params = [$user['user_id']];

        if ($childId) {
            $sql .= ' AND lr.child_id = ?';
            $params[] = (int)$childId;
        }

        $sql .= ' ORDER BY lr.result_date DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        Response::success($stmt->fetchAll());
    }

    public function downloadLabResult(int $id): void {
        $user = Auth::requireRole('patient');

        $stmt = $this->db->prepare(
            'SELECT lr.* FROM lab_results lr
             JOIN children c ON lr.child_id = c.id
             WHERE lr.id = ? AND c.parent_id = ?'
        );
        $stmt->execute([(int)$id, $user['user_id']]);
        $result = $stmt->fetch();

        if (!$result) {
            Response::error('Lab result not found', 404);
        }

        $filePath = __DIR__ . '/uploads/' . $result['file_path'];
        if (!file_exists($filePath)) {
            Response::error('File not found', 404);
        }

        $mimeType = $result['file_type'] === 'pdf' ? 'application/pdf' : 'image/jpeg';
        header('Content-Type: ' . $mimeType);
        header('Content-Disposition: attachment; filename="' . basename($result['file_name']) . '"');
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
        exit;
    }

    // ===== NOTIFICATIONS =====
    public function getNotifications(): void {
        $user = Auth::requireRole('patient');

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

    public function markNotificationRead(int $id): void {
        $user = Auth::requireRole('patient');

        $stmt = $this->db->prepare('UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?');
        $stmt->execute([(int)$id, $user['user_id']]);

        Response::success(null, 'Notification marked as read');
    }

    public function markAllNotificationsRead(): void {
        $user = Auth::requireRole('patient');

        $stmt = $this->db->prepare('UPDATE notifications SET is_read = true WHERE user_id = ? AND is_read = false');
        $stmt->execute([$user['user_id']]);

        Response::success(null, 'All notifications marked as read');
    }

    // ===== PROFILE =====
    public function getProfile(): void {
        $user = Auth::requireRole('patient');

        $stmt = $this->db->prepare(
            'SELECT id, email, full_name, contact_number, address, profile_photo, created_at FROM users WHERE id = ?'
        );
        $stmt->execute([$user['user_id']]);
        $profile = $stmt->fetch();

        // Children
        $stmt = $this->db->prepare('SELECT * FROM children WHERE parent_id = ? ORDER BY full_name');
        $stmt->execute([$user['user_id']]);
        $profile['children'] = $stmt->fetchAll();

        // Emergency contacts
        $stmt = $this->db->prepare('SELECT * FROM emergency_contacts WHERE parent_id = ? ORDER BY id');
        $stmt->execute([$user['user_id']]);
        $profile['emergency_contacts'] = $stmt->fetchAll();

        Response::success($profile);
    }

    public function updateProfile(): void {
        $user = Auth::requireRole('patient');
        $data = getInput();

        $fields = [];
        $params = [];

        if (isset($data['full_name'])) {
            $fields[] = 'full_name = ?';
            $params[] = trim($data['full_name']);
        }
        if (isset($data['contact_number'])) {
            $fields[] = 'contact_number = ?';
            $params[] = trim($data['contact_number']);
        }
        if (isset($data['address'])) {
            $fields[] = 'address = ?';
            $params[] = trim($data['address']);
        }

        if (empty($fields)) {
            Response::error('No fields to update');
        }

        $params[] = $user['user_id'];
        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        // Log activity
        $stmt = $this->db->prepare(
            'INSERT INTO activity_log (user_id, action, description, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$user['user_id'], 'Profile updated', 'Updated personal information', 'user', $user['user_id']]);

        Response::success(null, 'Profile updated successfully');
    }

    public function updateChild(): void {
        $user = Auth::requireRole('patient');
        $data = getInput();

        $childId = $data['child_id'] ?? null;
        if (!$childId) {
            Response::error('child_id is required');
        }

        // Verify ownership
        $stmt = $this->db->prepare('SELECT id FROM children WHERE id = ? AND parent_id = ?');
        $stmt->execute([(int)$childId, $user['user_id']]);
        if (!$stmt->fetch()) {
            Response::error('Child not found', 404);
        }

        $fields = [];
        $params = [];

        if (isset($data['known_allergies'])) {
            $fields[] = 'known_allergies = ?';
            $params[] = trim($data['known_allergies']);
        }
        if (isset($data['medical_history'])) {
            $fields[] = 'medical_history = ?';
            $params[] = trim($data['medical_history']);
        }
        if (isset($data['full_name'])) {
            $fields[] = 'full_name = ?';
            $params[] = trim($data['full_name']);
        }

        if (empty($fields)) {
            Response::error('No fields to update');
        }

        $params[] = (int)$childId;
        $sql = 'UPDATE children SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        Response::success(null, 'Child information updated');
    }

    // ===== EMERGENCY CONTACTS =====
    public function getEmergencyContacts(): void {
        $user = Auth::requireRole('patient');

        $stmt = $this->db->prepare('SELECT * FROM emergency_contacts WHERE parent_id = ? ORDER BY id');
        $stmt->execute([$user['user_id']]);

        Response::success($stmt->fetchAll());
    }

    public function addEmergencyContact(): void {
        $user = Auth::requireRole('patient');
        $data = getInput();

        $v = new Validator();
        $v->required('contact_name', $data['contact_name'] ?? null, 'Contact Name')
          ->required('relationship', $data['relationship'] ?? null, 'Relationship')
          ->required('contact_number', $data['contact_number'] ?? null, 'Contact Number');
        $v->validate();

        $stmt = $this->db->prepare(
            'INSERT INTO emergency_contacts (parent_id, contact_name, relationship, contact_number) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([
            $user['user_id'],
            trim($data['contact_name']),
            trim($data['relationship']),
            trim($data['contact_number'])
        ]);

        Response::success(['id' => (int)$this->db->lastInsertId()], 'Emergency contact added', 201);
    }

    public function updateEmergencyContact(int $id): void {
        $user = Auth::requireRole('patient');
        $data = getInput();

        $stmt = $this->db->prepare('SELECT id FROM emergency_contacts WHERE id = ? AND parent_id = ?');
        $stmt->execute([(int)$id, $user['user_id']]);
        if (!$stmt->fetch()) {
            Response::error('Emergency contact not found', 404);
        }

        $fields = [];
        $params = [];

        if (isset($data['contact_name'])) {
            $fields[] = 'contact_name = ?';
            $params[] = trim($data['contact_name']);
        }
        if (isset($data['relationship'])) {
            $fields[] = 'relationship = ?';
            $params[] = trim($data['relationship']);
        }
        if (isset($data['contact_number'])) {
            $fields[] = 'contact_number = ?';
            $params[] = trim($data['contact_number']);
        }

        if (empty($fields)) {
            Response::error('No fields to update');
        }

        $params[] = (int)$id;
        $sql = 'UPDATE emergency_contacts SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        Response::success(null, 'Emergency contact updated');
    }

    public function deleteEmergencyContact(int $id): void {
        $user = Auth::requireRole('patient');

        $stmt = $this->db->prepare('SELECT id FROM emergency_contacts WHERE id = ? AND parent_id = ?');
        $stmt->execute([(int)$id, $user['user_id']]);
        if (!$stmt->fetch()) {
            Response::error('Emergency contact not found', 404);
        }

        $stmt = $this->db->prepare('DELETE FROM emergency_contacts WHERE id = ? AND parent_id = ?');
        $stmt->execute([(int)$id, $user['user_id']]);

        Response::success(null, 'Emergency contact deleted');
    }

    // ===== APPOINTMENT REMINDERS =====
    public function checkAndSendReminders(): void {
        $user = Auth::requireRole('patient');

        $tomorrow = date('Y-m-d', strtotime('+1 day'));

        // Find appointments tomorrow that haven't had reminders sent
        $stmt = $this->db->prepare(
            'SELECT a.*, c.full_name AS child_name, u.full_name AS doctor_name
             FROM appointments a
             JOIN children c ON a.child_id = c.id
             JOIN users u ON a.doctor_id = u.id
             WHERE a.parent_id = ? AND a.appointment_date = ? AND a.status = \'Upcoming\' AND (a.reminder_sent = false OR a.reminder_sent IS NULL)'
        );
        $stmt->execute([$user['user_id'], $tomorrow]);
        $appointments = $stmt->fetchAll();

        $sent = 0;
        foreach ($appointments as $apt) {
            // Create reminder notification
            $stmt = $this->db->prepare(
                'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
            );
            $stmt->execute([
                $user['user_id'],
                'Appointment Reminder',
                "Reminder: {$apt['child_name']} has an appointment with {$apt['doctor_name']} tomorrow at {$apt['appointment_time']}.",
                'reminder'
            ]);

            // Mark as sent
            $stmt = $this->db->prepare('UPDATE appointments SET reminder_sent = true WHERE id = ?');
            $stmt->execute([(int)$apt['id']]);
            $sent++;
        }

        Response::success(['reminders_sent' => $sent]);
    }
}
