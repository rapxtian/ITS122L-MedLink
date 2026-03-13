<?php

class DoctorController {
    private PDO $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // ===== DASHBOARD =====
    public function getDashboard(): void {
        $user = Auth::requireRole('doctor');

        $today = date('Y-m-d');

        // Today's appointments
        $stmt = $this->db->prepare(
            'SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status IN (\'Upcoming\', \'In Progress\')'
        );
        $stmt->execute([$user['user_id'], $today]);
        $todayAppointments = (int)$stmt->fetchColumn();

        // Total patients (unique children)
        $stmt = $this->db->prepare(
            'SELECT COUNT(DISTINCT child_id) FROM appointments WHERE doctor_id = ?'
        );
        $stmt->execute([$user['user_id']]);
        $totalPatients = (int)$stmt->fetchColumn();

        // Completed this month
        $monthStart = date('Y-m-01');
        $stmt = $this->db->prepare(
            'SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND status = \'Completed\' AND appointment_date >= ?'
        );
        $stmt->execute([$user['user_id'], $monthStart]);
        $completedThisMonth = (int)$stmt->fetchColumn();

        // Upcoming appointments
        $stmt = $this->db->prepare(
            'SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND status = \'Upcoming\' AND appointment_date >= ?'
        );
        $stmt->execute([$user['user_id'], $today]);
        $upcomingCount = (int)$stmt->fetchColumn();

        // Today's schedule
        $stmt = $this->db->prepare(
            'SELECT a.*, c.full_name AS child_name, c.date_of_birth AS child_dob,
                    p.full_name AS parent_name, p.contact_number AS parent_contact
             FROM appointments a
             JOIN children c ON a.child_id = c.id
             JOIN users p ON a.parent_id = p.id
             WHERE a.doctor_id = ? AND a.appointment_date = ?
             ORDER BY a.appointment_time ASC'
        );
        $stmt->execute([$user['user_id'], $today]);
        $todaySchedule = $stmt->fetchAll();

        // Recent patients
        $stmt = $this->db->prepare(
            'SELECT DISTINCT c.id, c.full_name, c.date_of_birth, c.gender,
                    a.appointment_date AS last_visit, a.status AS last_status
             FROM appointments a
             JOIN children c ON a.child_id = c.id
             WHERE a.doctor_id = ?
             ORDER BY a.appointment_date DESC
             LIMIT 5'
        );
        $stmt->execute([$user['user_id']]);
        $recentPatients = $stmt->fetchAll();

        Response::success([
            'today_appointments' => $todayAppointments,
            'total_patients' => $totalPatients,
            'completed_this_month' => $completedThisMonth,
            'upcoming_count' => $upcomingCount,
            'today_schedule' => $todaySchedule,
            'recent_patients' => $recentPatients
        ]);
    }

    // ===== SCHEDULE MANAGEMENT =====
    public function getSchedule(): void {
        $user = Auth::requireRole('doctor');

        $stmt = $this->db->prepare(
            'SELECT * FROM doctor_schedules WHERE doctor_id = ? ORDER BY CASE day_of_week WHEN \'Monday\' THEN 1 WHEN \'Tuesday\' THEN 2 WHEN \'Wednesday\' THEN 3 WHEN \'Thursday\' THEN 4 WHEN \'Friday\' THEN 5 WHEN \'Saturday\' THEN 6 END, time_slot'
        );
        $stmt->execute([$user['user_id']]);
        $slots = $stmt->fetchAll();

        // Group by day
        $schedule = [];
        foreach ($slots as $slot) {
            $schedule[$slot['day_of_week']][] = [
                'id' => (int)$slot['id'],
                'time' => $slot['time_slot'],
                'status' => $slot['status']
            ];
        }

        Response::success($schedule);
    }

    public function addSlot(): void {
        $user = Auth::requireRole('doctor');
        $data = getInput();

        $v = new Validator();
        $v->required('day_of_week', $data['day_of_week'] ?? null, 'Day')
          ->inList('day_of_week', $data['day_of_week'] ?? null, ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], 'Day')
          ->required('time_slot', $data['time_slot'] ?? null, 'Time Slot');
        $v->validate();

        // Check if slot already exists
        $stmt = $this->db->prepare(
            'SELECT id FROM doctor_schedules WHERE doctor_id = ? AND day_of_week = ? AND time_slot = ?'
        );
        $stmt->execute([$user['user_id'], $data['day_of_week'], $data['time_slot']]);
        if ($stmt->fetch()) {
            Response::error('This slot already exists');
        }

        $stmt = $this->db->prepare(
            'INSERT INTO doctor_schedules (doctor_id, day_of_week, time_slot, status) VALUES (?, ?, ?, "available")'
        );
        $stmt->execute([$user['user_id'], $data['day_of_week'], $data['time_slot']]);

        Response::success(['id' => (int)$this->db->lastInsertId()], 'Schedule slot added', 201);
    }

    public function updateSchedule(): void {
        $user = Auth::requireRole('doctor');
        $data = getInput();

        if (!isset($data['slots']) || !is_array($data['slots'])) {
            Response::error('Invalid schedule data');
        }

        $this->db->beginTransaction();
        try {
            // Remove all non-booked slots and re-create
            $stmt = $this->db->prepare(
                'DELETE FROM doctor_schedules WHERE doctor_id = ? AND status != \'booked\''
            );
            $stmt->execute([$user['user_id']]);

            $insert = $this->db->prepare(
                'INSERT INTO doctor_schedules (doctor_id, day_of_week, time_slot, status) VALUES (?, ?, ?, \'available\') ON CONFLICT (doctor_id, day_of_week, time_slot) DO NOTHING'
            );

            foreach ($data['slots'] as $slot) {
                if (isset($slot['day_of_week'], $slot['time_slot'])) {
                    $insert->execute([$user['user_id'], $slot['day_of_week'], $slot['time_slot']]);
                }
            }

            $this->db->commit();
            Response::success(null, 'Schedule updated');
        } catch (Exception $e) {
            $this->db->rollBack();
            Response::error('Failed to update schedule', 500);
        }
    }

    public function removeSlot(int $id): void {
        $user = Auth::requireRole('doctor');

        $stmt = $this->db->prepare(
            'SELECT * FROM doctor_schedules WHERE id = ? AND doctor_id = ?'
        );
        $stmt->execute([(int)$id, $user['user_id']]);
        $slot = $stmt->fetch();

        if (!$slot) {
            Response::error('Slot not found', 404);
        }

        if ($slot['status'] === 'booked') {
            Response::error('Cannot remove a booked slot');
        }

        $stmt = $this->db->prepare('DELETE FROM doctor_schedules WHERE id = ? AND doctor_id = ?');
        $stmt->execute([(int)$id, $user['user_id']]);

        Response::success(null, 'Slot removed');
    }

    // ===== APPOINTMENTS =====
    public function getAppointments(): void {
        $user = Auth::requireRole('doctor');

        $status = getQueryParam('status');
        $date = getQueryParam('date');

        $sql = 'SELECT a.*, c.full_name AS child_name, c.date_of_birth AS child_dob, c.gender AS child_gender,
                       c.known_allergies, p.full_name AS parent_name, p.contact_number AS parent_contact
                FROM appointments a
                JOIN children c ON a.child_id = c.id
                JOIN users p ON a.parent_id = p.id
                WHERE a.doctor_id = ?';
        $params = [$user['user_id']];

        if ($status) {
            $sql .= ' AND a.status = ?';
            $params[] = $status;
        }
        if ($date) {
            $sql .= ' AND a.appointment_date = ?';
            $params[] = $date;
        }

        $sql .= ' ORDER BY a.appointment_date DESC, a.appointment_time ASC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        Response::success($stmt->fetchAll());
    }

    public function updateAppointment(int $id): void {
        $user = Auth::requireRole('doctor');
        $data = getInput();

        $stmt = $this->db->prepare('SELECT * FROM appointments WHERE id = ? AND doctor_id = ?');
        $stmt->execute([(int)$id, $user['user_id']]);
        $appointment = $stmt->fetch();

        if (!$appointment) {
            Response::error('Appointment not found', 404);
        }

        $fields = [];
        $params = [];

        if (isset($data['status'])) {
            $fields[] = 'status = ?';
            $params[] = $data['status'];
        }
        if (isset($data['notes'])) {
            $fields[] = 'notes = ?';
            $params[] = trim($data['notes']);
        }

        if (empty($fields)) {
            Response::error('No fields to update');
        }

        $params[] = (int)$id;
        $sql = 'UPDATE appointments SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        // Notify parent about status change
        if (isset($data['status'])) {
            $stmt = $this->db->prepare(
                'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
            );
            $stmt->execute([
                (int)$appointment['parent_id'],
                "Appointment {$data['status']}",
                "Your appointment on {$appointment['appointment_date']} has been marked as {$data['status']}.",
                'appointment'
            ]);

            // If completed, free the slot for future dates
            if ($data['status'] === 'Completed') {
                $dayOfWeek = date('l', strtotime($appointment['appointment_date']));
                $stmt = $this->db->prepare(
                    'UPDATE doctor_schedules SET status = \'available\' WHERE doctor_id = ? AND day_of_week = ? AND time_slot = ?'
                );
                $stmt->execute([$user['user_id'], $dayOfWeek, $appointment['appointment_time']]);
            }
        }

        // Log activity
        $stmt = $this->db->prepare(
            'INSERT INTO activity_log (user_id, action, description, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $user['user_id'],
            'Appointment updated',
            "Updated appointment #{$id}" . (isset($data['status']) ? " to {$data['status']}" : ''),
            'appointment',
            (int)$id
        ]);

        Response::success(null, 'Appointment updated');
    }

    // ===== MEDICAL RECORDS =====
    public function addMedicalRecord(): void {
        $user = Auth::requireRole('doctor');
        $data = getInput();

        $v = new Validator();
        $v->required('child_id', $data['child_id'] ?? null, 'Patient')
          ->required('diagnosis', $data['diagnosis'] ?? null, 'Diagnosis')
          ->required('treatment', $data['treatment'] ?? null, 'Treatment');
        $v->validate();

        // Verify child exists
        $stmt = $this->db->prepare('SELECT id, full_name FROM children WHERE id = ?');
        $stmt->execute([(int)$data['child_id']]);
        $child = $stmt->fetch();
        if (!$child) {
            Response::error('Patient not found', 404);
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                'INSERT INTO medical_records (child_id, doctor_id, appointment_id, diagnosis, treatment, notes, record_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                (int)$data['child_id'],
                $user['user_id'],
                isset($data['appointment_id']) ? (int)$data['appointment_id'] : null,
                trim($data['diagnosis']),
                trim($data['treatment']),
                trim($data['notes'] ?? ''),
                $data['record_date'] ?? date('Y-m-d')
            ]);
            $recordId = (int)$this->db->lastInsertId();

            // Add prescriptions if provided
            if (isset($data['prescriptions']) && is_array($data['prescriptions'])) {
                $prescStmt = $this->db->prepare(
                    'INSERT INTO prescriptions (medical_record_id, child_id, medication_name, dosage, frequency, status, issued_by, issued_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                );
                foreach ($data['prescriptions'] as $rx) {
                    $prescStmt->execute([
                        $recordId,
                        (int)$data['child_id'],
                        trim($rx['medication_name']),
                        trim($rx['dosage']),
                        trim($rx['frequency']),
                        'Active',
                        $user['user_id'],
                        date('Y-m-d')
                    ]);
                }
            }

            // Notify parent
            $stmt = $this->db->prepare('SELECT parent_id FROM children WHERE id = ?');
            $stmt->execute([(int)$data['child_id']]);
            $parentData = $stmt->fetch();

            if ($parentData) {
                $stmt = $this->db->prepare(
                    'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
                );
                $stmt->execute([
                    (int)$parentData['parent_id'],
                    'New Medical Record',
                    "A new medical record has been added for {$child['full_name']}.",
                    'medical'
                ]);
            }

            // Log activity
            $stmt = $this->db->prepare(
                'INSERT INTO activity_log (user_id, action, description, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $user['user_id'],
                'Medical record added',
                "Added medical record for {$child['full_name']}: {$data['diagnosis']}",
                'medical_record',
                $recordId
            ]);

            $this->db->commit();

            Response::success(['id' => $recordId], 'Medical record added', 201);

        } catch (Exception $e) {
            $this->db->rollBack();
            Response::error('Failed to add medical record', 500);
        }
    }

    public function getMedicalRecords(): void {
        $user = Auth::requireRole('doctor');

        $childId = getQueryParam('child_id');
        $sql = 'SELECT mr.*, c.full_name AS child_name, u.full_name AS doctor_name
                FROM medical_records mr
                JOIN children c ON mr.child_id = c.id
                JOIN users u ON mr.doctor_id = u.id
                WHERE mr.doctor_id = ?';
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

    // ===== PATIENT HISTORY =====
    public function getPatientHistory(int $childId): void {
        $user = Auth::requireRole('doctor');

        // Get child info
        $stmt = $this->db->prepare(
            'SELECT c.*, p.full_name AS parent_name, p.contact_number AS parent_contact, p.email AS parent_email
             FROM children c
             JOIN users p ON c.parent_id = p.id
             WHERE c.id = ?'
        );
        $stmt->execute([(int)$childId]);
        $child = $stmt->fetch();

        if (!$child) {
            Response::error('Patient not found', 404);
        }

        // Get appointments
        $stmt = $this->db->prepare(
            'SELECT a.*, u.full_name AS doctor_name
             FROM appointments a
             JOIN users u ON a.doctor_id = u.id
             WHERE a.child_id = ?
             ORDER BY a.appointment_date DESC'
        );
        $stmt->execute([(int)$childId]);
        $appointments = $stmt->fetchAll();

        // Get medical records
        $stmt = $this->db->prepare(
            'SELECT mr.*, u.full_name AS doctor_name
             FROM medical_records mr
             JOIN users u ON mr.doctor_id = u.id
             WHERE mr.child_id = ?
             ORDER BY mr.record_date DESC'
        );
        $stmt->execute([(int)$childId]);
        $records = $stmt->fetchAll();

        // Attach prescriptions to each record
        foreach ($records as &$record) {
            $stmt = $this->db->prepare('SELECT * FROM prescriptions WHERE medical_record_id = ?');
            $stmt->execute([(int)$record['id']]);
            $record['prescriptions'] = $stmt->fetchAll();
        }

        // Get prescriptions
        $stmt = $this->db->prepare(
            'SELECT rx.*, u.full_name AS issued_by_name
             FROM prescriptions rx
             JOIN users u ON rx.issued_by = u.id
             WHERE rx.child_id = ?
             ORDER BY rx.issued_date DESC'
        );
        $stmt->execute([(int)$childId]);
        $prescriptions = $stmt->fetchAll();

        // Get lab results
        $stmt = $this->db->prepare(
            'SELECT lr.*, u.full_name AS ordered_by_name
             FROM lab_results lr
             JOIN users u ON lr.ordered_by = u.id
             WHERE lr.child_id = ?
             ORDER BY lr.result_date DESC'
        );
        $stmt->execute([(int)$childId]);
        $labResults = $stmt->fetchAll();

        Response::success([
            'patient' => $child,
            'appointments' => $appointments,
            'medical_records' => $records,
            'prescriptions' => $prescriptions,
            'lab_results' => $labResults
        ]);
    }

    // ===== PATIENTS LIST (for doctor) =====
    public function getPatients(): void {
        $user = Auth::requireRole('doctor');

        $stmt = $this->db->prepare(
            'SELECT DISTINCT c.id, c.full_name, c.date_of_birth, c.gender, c.known_allergies,
                    p.full_name AS parent_name,
                    MAX(a.appointment_date) AS last_visit,
                    COUNT(a.id) AS total_visits
             FROM appointments a
             JOIN children c ON a.child_id = c.id
             JOIN users p ON a.parent_id = p.id
             WHERE a.doctor_id = ?
             GROUP BY c.id, c.full_name, c.date_of_birth, c.gender, c.known_allergies, p.full_name
             ORDER BY last_visit DESC'
        );
        $stmt->execute([$user['user_id']]);

        Response::success($stmt->fetchAll());
    }

    // ===== LAB RESULT UPLOAD =====
    public function uploadLabResult(): void {
        $user = Auth::requireRole('doctor');

        $childId = $_POST['child_id'] ?? null;
        if (!$childId) {
            Response::error('child_id is required');
        }

        // Verify child exists
        $stmt = $this->db->prepare('SELECT id, parent_id, full_name FROM children WHERE id = ?');
        $stmt->execute([(int)$childId]);
        $child = $stmt->fetch();
        if (!$child) {
            Response::error('Patient not found', 404);
        }

        // Validate file upload
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            Response::error('File upload is required');
        }

        $file = $_FILES['file'];
        $maxSize = 10 * 1024 * 1024; // 10MB
        if ($file['size'] > $maxSize) {
            Response::error('File size must not exceed 10MB');
        }

        $allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $allowedMimes)) {
            Response::error('Only PDF and image files (JPG, PNG) are allowed');
        }

        $fileType = $mimeType === 'application/pdf' ? 'pdf' : 'image';

        // Create upload directory
        $uploadDir = __DIR__ . '/../uploads/lab_results/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        // Generate unique filename
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $fileName = 'lab_' . $childId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $filePath = $uploadDir . $fileName;

        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            Response::error('Failed to save file', 500);
        }

        $resultDate = $_POST['result_date'] ?? date('Y-m-d');

        $stmt = $this->db->prepare(
            'INSERT INTO lab_results (child_id, file_name, file_path, file_type, ordered_by, result_date) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            (int)$childId,
            $file['name'],
            'lab_results/' . $fileName,
            $fileType,
            $user['user_id'],
            $resultDate
        ]);
        $labResultId = (int)$this->db->lastInsertId();

        // Notify parent
        $stmt = $this->db->prepare(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([
            (int)$child['parent_id'],
            'New Lab Result Available',
            "A new lab result has been uploaded for {$child['full_name']}.",
            'lab_result'
        ]);

        // Log activity
        $stmt = $this->db->prepare(
            'INSERT INTO activity_log (user_id, action, description, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $user['user_id'],
            'Lab result uploaded',
            "Uploaded lab result for {$child['full_name']}",
            'lab_result',
            $labResultId
        ]);

        Response::success(['id' => $labResultId], 'Lab result uploaded successfully', 201);
    }
}
