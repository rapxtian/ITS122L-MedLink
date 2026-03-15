<?php

class AppointmentController {
    private PDO $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function book(): void {
        $user = Auth::requireRole('patient');
        $data = getInput();

        $v = new Validator();
        $v->required('child_id', $data['child_id'] ?? null, 'Child')
          ->required('doctor_id', $data['doctor_id'] ?? null, 'Doctor')
          ->required('appointment_date', $data['appointment_date'] ?? null, 'Date')
          ->date('appointment_date', $data['appointment_date'] ?? null, 'Date')
          ->required('appointment_time', $data['appointment_time'] ?? null, 'Time');
        $v->validate();

        // Verify child belongs to this parent
        $stmt = $this->db->prepare('SELECT id FROM children WHERE id = ? AND parent_id = ?');
        $stmt->execute([(int)$data['child_id'], $user['user_id']]);
        if (!$stmt->fetch()) {
            Response::error('Child not found', 404);
        }

        // Verify doctor exists
        $stmt = $this->db->prepare('SELECT id, full_name FROM users WHERE id = ? AND role = \'doctor\' AND is_active = true');
        $stmt->execute([(int)$data['doctor_id']]);
        $doctor = $stmt->fetch();
        if (!$doctor) {
            Response::error('Doctor not found', 404);
        }

        // Check appointment date is not in the past
        if (strtotime($data['appointment_date']) < strtotime(date('Y-m-d'))) {
            Response::error('Cannot book appointments in the past');
        }

        // Check if slot is already booked
        $stmt = $this->db->prepare(
            'SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status IN (\'Upcoming\', \'In Progress\')'
        );
        $stmt->execute([(int)$data['doctor_id'], $data['appointment_date'], $data['appointment_time']]);
        if ($stmt->fetch()) {
            Response::error('This time slot is already booked');
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                'INSERT INTO appointments (child_id, parent_id, doctor_id, appointment_date, appointment_time, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id'
            );
            $stmt->execute([
                (int)$data['child_id'],
                $user['user_id'],
                (int)$data['doctor_id'],
                $data['appointment_date'],
                $data['appointment_time'],
                trim($data['reason'] ?? ''),
                'Upcoming'
            ]);
            $appointmentId = (int)$stmt->fetchColumn();

            // Update schedule slot to booked
            $dayOfWeek = date('l', strtotime($data['appointment_date']));
            $stmt = $this->db->prepare(
                'UPDATE doctor_schedules SET status = \'booked\' WHERE doctor_id = ? AND day_of_week = ? AND time_slot = ?'
            );
            $stmt->execute([(int)$data['doctor_id'], $dayOfWeek, $data['appointment_time']]);

            // Create notification for doctor
            $childStmt = $this->db->prepare('SELECT full_name FROM children WHERE id = ?');
            $childStmt->execute([(int)$data['child_id']]);
            $child = $childStmt->fetch();

            $stmt = $this->db->prepare(
                'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
            );
            $stmt->execute([
                (int)$data['doctor_id'],
                'New Appointment Booked',
                "Appointment booked for {$child['full_name']} on {$data['appointment_date']} at {$data['appointment_time']}",
                'appointment'
            ]);

            // Log activity
            $stmt = $this->db->prepare(
                'INSERT INTO activity_log (user_id, action, description, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $user['user_id'],
                'Appointment booked',
                "Booked appointment with {$doctor['full_name']} for {$child['full_name']}",
                'appointment',
                $appointmentId
            ]);

            $this->db->commit();

            Response::success(['id' => $appointmentId], 'Appointment booked successfully', 201);

        } catch (Exception $e) {
            $this->db->rollBack();
            Response::error('Failed to book appointment', 500);
        }
    }

    public function getByPatient(int $parentId): void {
        $user = Auth::requireAuth();

        // Patients can only see their own appointments
        if ($user['role'] === 'patient' && (int)$user['user_id'] !== (int)$parentId) {
            Response::error('Forbidden', 403);
        }

        $status = getQueryParam('status');
        $sql = 'SELECT a.*, c.full_name AS child_name, u.full_name AS doctor_name, u.specialization
                FROM appointments a
                JOIN children c ON a.child_id = c.id
                JOIN users u ON a.doctor_id = u.id
                WHERE a.parent_id = ?';
        $params = [(int)$parentId];

        if ($status) {
            $sql .= ' AND a.status = ?';
            $params[] = $status;
        }

        $sql .= ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $appointments = $stmt->fetchAll();

        Response::success($appointments);
    }

    public function getById(int $id): void {
        $user = Auth::requireAuth();

        $stmt = $this->db->prepare(
            'SELECT a.*, c.full_name AS child_name, c.date_of_birth AS child_dob, c.gender AS child_gender,
                    c.known_allergies, c.medical_history,
                    u.full_name AS doctor_name, u.specialization,
                    p.full_name AS parent_name, p.contact_number AS parent_contact
             FROM appointments a
             JOIN children c ON a.child_id = c.id
             JOIN users u ON a.doctor_id = u.id
             JOIN users p ON a.parent_id = p.id
             WHERE a.id = ?'
        );
        $stmt->execute([(int)$id]);
        $appointment = $stmt->fetch();

        if (!$appointment) {
            Response::error('Appointment not found', 404);
        }

        // Authorization check
        if ($user['role'] === 'patient' && (int)$appointment['parent_id'] !== $user['user_id']) {
            Response::error('Forbidden', 403);
        }
        if ($user['role'] === 'doctor' && (int)$appointment['doctor_id'] !== $user['user_id']) {
            Response::error('Forbidden', 403);
        }

        Response::success($appointment);
    }

    public function getAll(): void {
        $user = Auth::requireRole('admin');

        $status = getQueryParam('status');
        $search = getQueryParam('search');

        $sql = 'SELECT a.*, c.full_name AS child_name, u.full_name AS doctor_name, u.specialization,
                       p.full_name AS parent_name
                FROM appointments a
                JOIN children c ON a.child_id = c.id
                JOIN users u ON a.doctor_id = u.id
                JOIN users p ON a.parent_id = p.id
                WHERE 1=1';
        $params = [];

        if ($status) {
            $sql .= ' AND a.status = ?';
            $params[] = $status;
        }

        if ($search) {
            $sql .= ' AND (c.full_name ILIKE ? OR u.full_name ILIKE ? OR p.full_name ILIKE ?)';
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }

        $sql .= ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        Response::success($stmt->fetchAll());
    }

    public function cancel(int $id): void {
        $user = Auth::requireAuth();
        $data = getInput();

        $stmt = $this->db->prepare('SELECT * FROM appointments WHERE id = ?');
        $stmt->execute([(int)$id]);
        $appointment = $stmt->fetch();

        if (!$appointment) {
            Response::error('Appointment not found', 404);
        }

        // Authorization
        if ($user['role'] === 'patient' && (int)$appointment['parent_id'] !== $user['user_id']) {
            Response::error('Forbidden', 403);
        }

        if ($appointment['status'] === 'Cancelled') {
            Response::error('Appointment is already cancelled');
        }

        if ($appointment['status'] === 'Completed') {
            Response::error('Cannot cancel a completed appointment');
        }

        $stmt = $this->db->prepare(
            'UPDATE appointments SET status = \'Cancelled\', cancellation_reason = ? WHERE id = ?'
        );
        $stmt->execute([trim($data['reason'] ?? ''), (int)$id]);

        // Free up the schedule slot
        $dayOfWeek = date('l', strtotime($appointment['appointment_date']));
        $stmt = $this->db->prepare(
            'UPDATE doctor_schedules SET status = \'available\' WHERE doctor_id = ? AND day_of_week = ? AND time_slot = ?'
        );
        $stmt->execute([(int)$appointment['doctor_id'], $dayOfWeek, $appointment['appointment_time']]);

        // Notify relevant party
        $notifyUserId = $user['role'] === 'patient' ? $appointment['doctor_id'] : $appointment['parent_id'];
        $stmt = $this->db->prepare(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([
            $notifyUserId,
            'Appointment Cancelled',
            "Appointment on {$appointment['appointment_date']} at {$appointment['appointment_time']} has been cancelled.",
            'appointment'
        ]);

        // Log
        $stmt = $this->db->prepare(
            'INSERT INTO activity_log (user_id, action, description, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $user['user_id'],
            'Appointment cancelled',
            "Cancelled appointment #{$id}",
            'appointment',
            (int)$id
        ]);

        Response::success(null, 'Appointment cancelled successfully');
    }

    public function updateStatus(int $id): void {
        $user = Auth::requireRole('doctor', 'admin');
        $data = getInput();

        $v = new Validator();
        $v->required('status', $data['status'] ?? null, 'Status')
          ->inList('status', $data['status'] ?? null, ['Upcoming', 'In Progress', 'Completed', 'Cancelled'], 'Status');
        $v->validate();

        $stmt = $this->db->prepare('SELECT * FROM appointments WHERE id = ?');
        $stmt->execute([(int)$id]);
        $appointment = $stmt->fetch();

        if (!$appointment) {
            Response::error('Appointment not found', 404);
        }

        if ($user['role'] === 'doctor' && (int)$appointment['doctor_id'] !== $user['user_id']) {
            Response::error('Forbidden', 403);
        }

        $sql = 'UPDATE appointments SET status = ?';
        $params = [$data['status']];

        if ($data['status'] === 'Cancelled' && isset($data['reason'])) {
            $sql .= ', cancellation_reason = ?';
            $params[] = trim($data['reason']);
        }
        if (isset($data['notes'])) {
            $sql .= ', notes = ?';
            $params[] = trim($data['notes']);
        }

        $sql .= ' WHERE id = ?';
        $params[] = (int)$id;

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        // Free slot if cancelled
        if ($data['status'] === 'Cancelled') {
            $dayOfWeek = date('l', strtotime($appointment['appointment_date']));
            $stmt = $this->db->prepare(
                'UPDATE doctor_schedules SET status = \'available\' WHERE doctor_id = ? AND day_of_week = ? AND time_slot = ?'
            );
            $stmt->execute([(int)$appointment['doctor_id'], $dayOfWeek, $appointment['appointment_time']]);
        }

        // Notify parent
        $stmt = $this->db->prepare(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([
            (int)$appointment['parent_id'],
            "Appointment {$data['status']}",
            "Your appointment on {$appointment['appointment_date']} has been marked as {$data['status']}.",
            'appointment'
        ]);

        Response::success(null, 'Appointment status updated');
    }

    public function update(int $id): void {
        $user = Auth::requireRole('admin');
        $data = getInput();

        $stmt = $this->db->prepare('SELECT id FROM appointments WHERE id = ?');
        $stmt->execute([(int)$id]);
        if (!$stmt->fetch()) {
            Response::error('Appointment not found', 404);
        }

        $fields = [];
        $params = [];

        if (isset($data['status'])) {
            $fields[] = 'status = ?';
            $params[] = $data['status'];
        }
        if (isset($data['appointment_date'])) {
            $fields[] = 'appointment_date = ?';
            $params[] = $data['appointment_date'];
        }
        if (isset($data['appointment_time'])) {
            $fields[] = 'appointment_time = ?';
            $params[] = $data['appointment_time'];
        }
        if (isset($data['notes'])) {
            $fields[] = 'notes = ?';
            $params[] = trim($data['notes']);
        }
        if (isset($data['cancellation_reason'])) {
            $fields[] = 'cancellation_reason = ?';
            $params[] = trim($data['cancellation_reason']);
        }

        if (empty($fields)) {
            Response::error('No fields to update');
        }

        $params[] = (int)$id;
        $sql = 'UPDATE appointments SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        Response::success(null, 'Appointment updated');
    }

    public function getAvailableSlots(): void {
        Auth::requireAuth();

        $doctorId = (int)(getQueryParam('doctor_id') ?? 0);
        $rawDate = trim((string)(getQueryParam('date') ?? ''));

        $dateObj = DateTime::createFromFormat('Y-m-d', $rawDate);
        if (!$dateObj) {
            $dateObj = DateTime::createFromFormat('m/d/Y', $rawDate);
        }

        if ($doctorId <= 0 || !$dateObj) {
            Response::error('Doctor ID and date are required');
        }

        $date = $dateObj->format('Y-m-d');
        $dayOfWeek = $dateObj->format('l');

        // Get all available slots for the doctor on that day
        $stmt = $this->db->prepare(
            "SELECT ds.time_slot, 'available' AS status FROM doctor_schedules ds
             WHERE ds.doctor_id = ? AND ds.day_of_week = ? AND ds.status = 'available'
             AND ds.time_slot NOT IN (
                 SELECT appointment_time FROM appointments
                 WHERE doctor_id = ? AND appointment_date = ? AND status IN ('Upcoming', 'In Progress')
             )
             ORDER BY ds.time_slot"
        );
        $stmt->execute([(int)$doctorId, $dayOfWeek, (int)$doctorId, $date]);

        $slots = $stmt->fetchAll();

                if (empty($slots)) {
                        // Fallback for doctors without explicit schedule rows yet.
                        $stmt = $this->db->prepare(
                                "SELECT s.time_slot, 'available' AS status
                                 FROM (VALUES
                                     ('08:00:00'::time), ('09:00:00'::time), ('10:00:00'::time),
                                     ('11:00:00'::time), ('12:00:00'::time), ('13:00:00'::time),
                                     ('14:00:00'::time), ('15:00:00'::time), ('16:00:00'::time)
                                 ) AS s(time_slot)
                                 WHERE s.time_slot NOT IN (
                                     SELECT appointment_time FROM appointments
                                     WHERE doctor_id = ? AND appointment_date = ? AND status IN ('Upcoming', 'In Progress')
                                 )
                                 ORDER BY s.time_slot"
                        );
                        $stmt->execute([(int)$doctorId, $date]);
                        $slots = $stmt->fetchAll();
                }

        Response::success($slots);
    }
}
