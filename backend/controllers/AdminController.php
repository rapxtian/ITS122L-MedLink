<?php

class AdminController {
    private PDO $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // ===== DASHBOARD =====
    public function getDashboard(): void {
        Auth::requireRole('admin');

        $today = date('Y-m-d');

        // Total patients (unique children)
        $stmt = $this->db->query('SELECT COUNT(*) FROM children');
        $totalPatients = (int)$stmt->fetchColumn();

        // Total doctors
        $stmt = $this->db->query('SELECT COUNT(*) FROM users WHERE role = \'doctor\' AND is_active = true');
        $totalDoctors = (int)$stmt->fetchColumn();

        // Today's appointments
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM appointments WHERE appointment_date = ?');
        $stmt->execute([$today]);
        $todayAppointments = (int)$stmt->fetchColumn();

        // Low stock alerts
        $stmt = $this->db->query('SELECT COUNT(*) FROM inventory WHERE status IN (\'Low Stock\', \'Out of Stock\')');
        $lowStockAlerts = (int)$stmt->fetchColumn();

        // Recent appointments
        $stmt = $this->db->prepare(
            'SELECT a.*, c.full_name AS child_name, u.full_name AS doctor_name, p.full_name AS parent_name
             FROM appointments a
             JOIN children c ON a.child_id = c.id
             JOIN users u ON a.doctor_id = u.id
             JOIN users p ON a.parent_id = p.id
             ORDER BY a.created_at DESC LIMIT 10'
        );
        $stmt->execute();
        $recentAppointments = $stmt->fetchAll();

        // Monthly appointment trend (last 6 months)
        $stmt = $this->db->query(
            'SELECT TO_CHAR(appointment_date, \'YYYY-MM\') AS month,
                    COUNT(*) AS count
             FROM appointments
             WHERE appointment_date >= CURRENT_DATE - INTERVAL \'6 months\'
             GROUP BY month
             ORDER BY month ASC'
        );
        $monthlyTrend = $stmt->fetchAll();

        // Low stock items
        $stmt = $this->db->query(
            'SELECT id, item_name, category, quantity, reorder_level, status
             FROM inventory
             WHERE status IN (\'Low Stock\', \'Out of Stock\')
             ORDER BY quantity ASC'
        );
        $lowStockItems = $stmt->fetchAll();

        // Recent activity
        $stmt = $this->db->query(
            'SELECT al.*, u.full_name AS user_name
             FROM activity_log al
             LEFT JOIN users u ON al.user_id = u.id
             ORDER BY al.created_at DESC LIMIT 10'
        );
        $recentActivity = $stmt->fetchAll();

        Response::success([
            'total_patients' => $totalPatients,
            'total_doctors' => $totalDoctors,
            'today_appointments' => $todayAppointments,
            'low_stock_alerts' => $lowStockAlerts,
            'recent_appointments' => $recentAppointments,
            'monthly_trend' => $monthlyTrend,
            'low_stock_items' => $lowStockItems,
            'recent_activity' => $recentActivity
        ]);
    }

    // ===== PATIENT MANAGEMENT =====
    public function getPatients(): void {
        Auth::requireRole('admin');

        $search = getQueryParam('search');

        $sql = 'SELECT c.*, p.full_name AS parent_name, p.email AS parent_email,
                       p.contact_number AS parent_contact, p.address AS parent_address,
                       (SELECT COUNT(*) FROM appointments WHERE child_id = c.id) AS total_appointments,
                       (SELECT MAX(appointment_date) FROM appointments WHERE child_id = c.id) AS last_visit
                FROM children c
                JOIN users p ON c.parent_id = p.id
                WHERE 1=1';
        $params = [];

        if ($search) {
            $sql .= ' AND (c.full_name ILIKE ? OR p.full_name ILIKE ? OR p.email ILIKE ?)';
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }

        $sql .= ' ORDER BY c.created_at DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        Response::success($stmt->fetchAll());
    }

    public function getPatient(int $id): void {
        Auth::requireRole('admin');

        $stmt = $this->db->prepare(
            'SELECT c.*, p.full_name AS parent_name, p.email AS parent_email,
                    p.contact_number AS parent_contact, p.address AS parent_address,
                    p.id AS parent_id
             FROM children c
             JOIN users p ON c.parent_id = p.id
             WHERE c.id = ?'
        );
        $stmt->execute([(int)$id]);
        $patient = $stmt->fetch();

        if (!$patient) {
            Response::error('Patient not found', 404);
        }

        // Get emergency contact
        $stmt = $this->db->prepare('SELECT * FROM emergency_contacts WHERE parent_id = ? LIMIT 1');
        $stmt->execute([(int)$patient['parent_id']]);
        $patient['emergency_contact'] = $stmt->fetch();

        // Get appointments
        $stmt = $this->db->prepare(
            'SELECT a.*, u.full_name AS doctor_name FROM appointments a
             JOIN users u ON a.doctor_id = u.id WHERE a.child_id = ? ORDER BY a.appointment_date DESC'
        );
        $stmt->execute([(int)$id]);
        $patient['appointments'] = $stmt->fetchAll();

        // Get medical records
        $stmt = $this->db->prepare(
            'SELECT mr.*, u.full_name AS doctor_name FROM medical_records mr
             JOIN users u ON mr.doctor_id = u.id WHERE mr.child_id = ? ORDER BY mr.record_date DESC'
        );
        $stmt->execute([(int)$id]);
        $patient['medical_records'] = $stmt->fetchAll();

        Response::success($patient);
    }

    public function createPatient(): void {
        Auth::requireRole('admin');
        $data = getInput();

        $v = new Validator();
        $v->required('parent_name', $data['parent_name'] ?? null, 'Parent Name')
          ->required('parent_email', $data['parent_email'] ?? null, 'Parent Email')
          ->email('parent_email', $data['parent_email'] ?? null)
          ->required('parent_contact', $data['parent_contact'] ?? null, 'Parent Contact')
          ->required('child_name', $data['child_name'] ?? null, 'Child Name')
          ->required('child_dob', $data['child_dob'] ?? null, 'Date of Birth')
          ->required('child_gender', $data['child_gender'] ?? null, 'Gender');
        $v->validate();

        $this->db->beginTransaction();
        try {
            // Check if parent already exists by email
            $stmt = $this->db->prepare('SELECT id FROM users WHERE email = ?');
            $stmt->execute([trim($data['parent_email'])]);
            $existing = $stmt->fetch();

            if ($existing) {
                $parentId = (int)$existing['id'];
            } else {
                // Create parent user with default password
                $stmt = $this->db->prepare(
                    'INSERT INTO users (email, password, role, full_name, contact_number, address) VALUES (?, ?, ?, ?, ?, ?) RETURNING id'
                );
                $stmt->execute([
                    trim($data['parent_email']),
                    Auth::hashPassword('Patient123!'),
                    'patient',
                    trim($data['parent_name']),
                    trim($data['parent_contact']),
                    trim($data['parent_address'] ?? '')
                ]);
                $parentId = (int)$stmt->fetchColumn();
            }

            // Create child
            $dupStmt = $this->db->prepare(
                'SELECT id FROM children WHERE parent_id = ? AND LOWER(full_name) = LOWER(?) AND date_of_birth = ?'
            );
            $dupStmt->execute([$parentId, trim($data['child_name']), $data['child_dob']]);
            if ($dupStmt->fetch()) {
                Response::error('Duplicate patient record for the same parent and date of birth', 409);
            }

            $stmt = $this->db->prepare(
                'INSERT INTO children (parent_id, full_name, date_of_birth, gender, known_allergies, medical_history) VALUES (?, ?, ?, ?, ?, ?) RETURNING id'
            );
            $stmt->execute([
                $parentId,
                trim($data['child_name']),
                $data['child_dob'],
                $data['child_gender'],
                trim($data['child_allergies'] ?? ''),
                trim($data['child_medical_history'] ?? '')
            ]);
            $childId = (int)$stmt->fetchColumn();

            // Log activity
            $user = Auth::requireAuth();
            $stmt = $this->db->prepare(
                'INSERT INTO activity_log (user_id, action, description, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $user['user_id'],
                'Patient created',
                "Added patient: {$data['child_name']}",
                'patient',
                $childId
            ]);

            $this->db->commit();

            Response::success(['id' => $childId], 'Patient created successfully', 201);

        } catch (Exception $e) {
            $this->db->rollBack();
            Response::error('Failed to create patient', 500);
        }
    }

    public function updatePatient(int $id): void {
        Auth::requireRole('admin');
        $data = getInput();

        $stmt = $this->db->prepare('SELECT * FROM children WHERE id = ?');
        $stmt->execute([(int)$id]);
        $child = $stmt->fetch();

        if (!$child) {
            Response::error('Patient not found', 404);
        }

        $this->db->beginTransaction();
        try {
            $changes = [];
            // Update child info
            $childFields = [];
            $childParams = [];

            if (isset($data['child_name'])) {
                $childFields[] = 'full_name = ?';
                $childParams[] = trim($data['child_name']);
                $changes[] = 'child_name';
            }
            if (isset($data['child_dob'])) {
                $childFields[] = 'date_of_birth = ?';
                $childParams[] = $data['child_dob'];
                $changes[] = 'child_dob';
            }
            if (isset($data['child_gender'])) {
                $childFields[] = 'gender = ?';
                $childParams[] = $data['child_gender'];
                $changes[] = 'child_gender';
            }
            if (isset($data['child_allergies'])) {
                $childFields[] = 'known_allergies = ?';
                $childParams[] = trim($data['child_allergies']);
                $changes[] = 'child_allergies';
            }
            if (isset($data['child_medical_history'])) {
                $childFields[] = 'medical_history = ?';
                $childParams[] = trim($data['child_medical_history']);
                $changes[] = 'child_medical_history';
            }

            if (!empty($childFields)) {
                $childParams[] = (int)$id;
                $sql = 'UPDATE children SET ' . implode(', ', $childFields) . ' WHERE id = ?';
                $stmt = $this->db->prepare($sql);
                $stmt->execute($childParams);
            }

            // Update parent info
            $parentFields = [];
            $parentParams = [];

            if (isset($data['parent_name'])) {
                $parentFields[] = 'full_name = ?';
                $parentParams[] = trim($data['parent_name']);
                $changes[] = 'parent_name';
            }
            if (isset($data['parent_email'])) {
                $parentFields[] = 'email = ?';
                $parentParams[] = trim($data['parent_email']);
                $changes[] = 'parent_email';
            }
            if (isset($data['parent_contact'])) {
                $parentFields[] = 'contact_number = ?';
                $parentParams[] = trim($data['parent_contact']);
                $changes[] = 'parent_contact';
            }
            if (isset($data['parent_address'])) {
                $parentFields[] = 'address = ?';
                $parentParams[] = trim($data['parent_address']);
                $changes[] = 'parent_address';
            }

            if (!empty($parentFields)) {
                $parentParams[] = (int)$child['parent_id'];
                $sql = 'UPDATE users SET ' . implode(', ', $parentFields) . ' WHERE id = ?';
                $stmt = $this->db->prepare($sql);
                $stmt->execute($parentParams);
            }

            if (!empty($changes)) {
                $user = Auth::requireAuth();
                $logStmt = $this->db->prepare(
                    'INSERT INTO activity_log (user_id, action, description, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
                );
                $logStmt->execute([
                    $user['user_id'],
                    'Patient updated',
                    'Updated fields: ' . implode(', ', $changes),
                    'patient',
                    (int)$id
                ]);
            }

            $this->db->commit();

            Response::success(null, 'Patient updated successfully');

        } catch (Exception $e) {
            $this->db->rollBack();
            Response::error('Failed to update patient', 500);
        }
    }

    public function deletePatient(int $id): void {
        Auth::requireRole('admin');

        $stmt = $this->db->prepare('SELECT id FROM children WHERE id = ?');
        $stmt->execute([(int)$id]);
        if (!$stmt->fetch()) {
            Response::error('Patient not found', 404);
        }

        $stmt = $this->db->prepare('DELETE FROM children WHERE id = ?');
        $stmt->execute([(int)$id]);

        $user = Auth::requireAuth();
        $stmt = $this->db->prepare(
            'INSERT INTO activity_log (user_id, action, description, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$user['user_id'], 'Patient deleted', "Deleted patient #{$id}", 'patient', (int)$id]);

        Response::success(null, 'Patient deleted successfully');
    }

    // ===== APPOINTMENTS =====
    public function getAppointments(): void {
        Auth::requireRole('admin');

        $status = getQueryParam('status');
        $search = getQueryParam('search');
        $date = getQueryParam('date');

        $sql = 'SELECT a.*, c.full_name AS child_name, u.full_name AS doctor_name,
                       u.specialization, p.full_name AS parent_name, p.contact_number AS parent_contact
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
            $s = "%$search%";
            $params = array_merge($params, [$s, $s, $s]);
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
        Auth::requireRole('admin');
        $data = getInput();

        $stmt = $this->db->prepare('SELECT * FROM appointments WHERE id = ?');
        $stmt->execute([(int)$id]);
        $appointment = $stmt->fetch();

        if (!$appointment) {
            Response::error('Appointment not found', 404);
        }

        $fields = [];
        $params = [];
        $changes = [];

        $statusMap = [
            'upcoming' => 'Upcoming',
            'confirmed' => 'Upcoming',
            'pending' => 'Upcoming',
            'in progress' => 'In Progress',
            'in_progress' => 'In Progress',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
        ];

        if (isset($data['status'])) {
            $normalized = strtolower(trim((string)$data['status']));
            $statusValue = $statusMap[$normalized] ?? $data['status'];
            $fields[] = 'status = ?';
            $params[] = $statusValue;
            $changes[] = 'status';
            $data['status'] = $statusValue;
        }
        if (isset($data['appointment_date'])) {
            $fields[] = 'appointment_date = ?';
            $params[] = $data['appointment_date'];
            $changes[] = 'appointment_date';
        }
        if (isset($data['appointment_time'])) {
            $fields[] = 'appointment_time = ?';
            $params[] = $data['appointment_time'];
            $changes[] = 'appointment_time';
        }
        if (isset($data['doctor_id'])) {
            $fields[] = 'doctor_id = ?';
            $params[] = (int)$data['doctor_id'];
            $changes[] = 'doctor_id';
        }
        if (isset($data['cancellation_reason'])) {
            $fields[] = 'cancellation_reason = ?';
            $params[] = trim($data['cancellation_reason']);
            $changes[] = 'cancellation_reason';
        }
        if (isset($data['notes'])) {
            $fields[] = 'notes = ?';
            $params[] = trim($data['notes']);
            $changes[] = 'notes';
        }

        if (empty($fields)) {
            Response::error('No fields to update');
        }

        $newDoctorId = isset($data['doctor_id']) ? (int)$data['doctor_id'] : (int)$appointment['doctor_id'];
        $newDate = $data['appointment_date'] ?? $appointment['appointment_date'];
        $newTime = $data['appointment_time'] ?? $appointment['appointment_time'];
        $dupStmt = $this->db->prepare(
            'SELECT id FROM appointments WHERE id != ? AND doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status IN (\'Upcoming\', \'In Progress\')'
        );
        $dupStmt->execute([(int)$id, $newDoctorId, $newDate, $newTime]);
        if ($dupStmt->fetch()) {
            Response::error('Doctor already has an appointment at the selected date and time', 409);
        }

        $params[] = (int)$id;
        $sql = 'UPDATE appointments SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        // Notify parent and doctor
        if (isset($data['status'])) {
            $notifStmt = $this->db->prepare(
                'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
            );
            $msg = "Appointment on {$appointment['appointment_date']} has been updated to {$data['status']} by admin.";
            $notifStmt->execute([(int)$appointment['parent_id'], "Appointment {$data['status']}", $msg, 'appointment']);
            $notifStmt->execute([(int)$appointment['doctor_id'], "Appointment {$data['status']}", $msg, 'appointment']);

            if ($data['status'] === 'Cancelled') {
                $dayOfWeek = date('l', strtotime($appointment['appointment_date']));
                $stmt = $this->db->prepare(
                    'UPDATE doctor_schedules SET status = \'available\' WHERE doctor_id = ? AND day_of_week = ? AND time_slot = ?'
                );
                $stmt->execute([(int)$appointment['doctor_id'], $dayOfWeek, $appointment['appointment_time']]);
            }
        }

        if (!empty($changes)) {
            $user = Auth::requireAuth();
            $logStmt = $this->db->prepare(
                'INSERT INTO activity_log (user_id, action, description, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
            );
            $logStmt->execute([
                $user['user_id'],
                'Appointment updated',
                'Updated fields: ' . implode(', ', $changes),
                'appointment',
                (int)$id
            ]);
        }

        Response::success(null, 'Appointment updated');
    }

    // ===== INVENTORY =====
    public function getInventory(): void {
        Auth::requireRole('admin');

        $search = getQueryParam('search');
        $category = getQueryParam('category');
        $status = getQueryParam('status');

        $sql = 'SELECT * FROM inventory WHERE 1=1';
        $params = [];

        if ($search) {
            $sql .= ' AND (item_name ILIKE ? OR supplier ILIKE ?)';
            $s = "%$search%";
            $params[] = $s;
            $params[] = $s;
        }
        if ($category) {
            $sql .= ' AND category = ?';
            $params[] = $category;
        }
        if ($status) {
            $sql .= ' AND status = ?';
            $params[] = $status;
        }

        $sql .= ' ORDER BY item_name ASC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        Response::success($stmt->fetchAll());
    }

    public function getInventoryItem(int $id): void {
        Auth::requireRole('admin');

        $stmt = $this->db->prepare('SELECT * FROM inventory WHERE id = ?');
        $stmt->execute([(int)$id]);
        $item = $stmt->fetch();

        if (!$item) {
            Response::error('Item not found', 404);
        }

        // Get transaction history
        $stmt = $this->db->prepare(
            'SELECT it.*, u.full_name AS performed_by_name
             FROM inventory_transactions it
             LEFT JOIN users u ON it.performed_by = u.id
             WHERE it.inventory_id = ?
             ORDER BY it.transaction_date DESC'
        );
        $stmt->execute([(int)$id]);
        $item['transactions'] = $stmt->fetchAll();

        Response::success($item);
    }

    public function addInventoryItem(): void {
        $user = Auth::requireRole('admin');
        $data = getInput();

        $v = new Validator();
        $v->required('item_name', $data['item_name'] ?? null, 'Item Name')
          ->required('category', $data['category'] ?? null, 'Category')
          ->inList('category', $data['category'] ?? null, ['Antibiotic','Analgesic','Supplement','Electrolyte','Immunological','Equipment'], 'Category')
          ->required('quantity', $data['quantity'] ?? null, 'Quantity')
          ->numeric('quantity', $data['quantity'] ?? null, 'Quantity')
          ->required('reorder_level', $data['reorder_level'] ?? null, 'Reorder Level')
          ->numeric('reorder_level', $data['reorder_level'] ?? null, 'Reorder Level')
          ->required('supplier', $data['supplier'] ?? null, 'Supplier');
        $v->validate();

        $quantity = (int)$data['quantity'];
        $reorderLevel = (int)$data['reorder_level'];

        $dupStmt = $this->db->prepare(
            'SELECT id FROM inventory WHERE LOWER(item_name) = LOWER(?) AND category = ? AND LOWER(supplier) = LOWER(?)'
        );
        $dupStmt->execute([trim($data['item_name']), $data['category'], trim($data['supplier'])]);
        if ($dupStmt->fetch()) {
            Response::error('Duplicate inventory item exists for the same category and supplier', 409);
        }

        // Determine status
        if ($quantity <= 0) {
            $status = 'Out of Stock';
        } elseif ($quantity <= $reorderLevel) {
            $status = 'Low Stock';
        } else {
            $status = 'In Stock';
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                'INSERT INTO inventory (item_name, category, quantity, reorder_level, supplier, status) VALUES (?, ?, ?, ?, ?, ?) RETURNING id'
            );
            $stmt->execute([
                trim($data['item_name']),
                $data['category'],
                $quantity,
                $reorderLevel,
                trim($data['supplier']),
                $status
            ]);
            $itemId = (int)$stmt->fetchColumn();

            // Log transaction
            $stmt = $this->db->prepare(
                'INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, performed_by) VALUES (?, ?, ?, ?)'
            );
            $stmt->execute([$itemId, 'Added', $quantity, $user['user_id']]);

            // Log activity
            $stmt = $this->db->prepare(
                'INSERT INTO activity_log (user_id, action, description, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $user['user_id'],
                'Inventory item added',
                "Added {$data['item_name']} (qty: {$quantity})",
                'inventory',
                $itemId
            ]);

            $this->db->commit();

            Response::success(['id' => $itemId], 'Inventory item added', 201);

        } catch (Exception $e) {
            $this->db->rollBack();
            Response::error('Failed to add inventory item', 500);
        }
    }

    public function updateInventoryItem(int $id): void {
        $user = Auth::requireRole('admin');
        $data = getInput();

        $stmt = $this->db->prepare('SELECT * FROM inventory WHERE id = ?');
        $stmt->execute([(int)$id]);
        $item = $stmt->fetch();

        if (!$item) {
            Response::error('Item not found', 404);
        }

        $fields = [];
        $params = [];
        $changes = [];

        if (isset($data['item_name'])) {
            $fields[] = 'item_name = ?';
            $params[] = trim($data['item_name']);
            $changes[] = 'item_name';
        }
        if (isset($data['category'])) {
            $fields[] = 'category = ?';
            $params[] = $data['category'];
            $changes[] = 'category';
        }
        if (isset($data['supplier'])) {
            $fields[] = 'supplier = ?';
            $params[] = trim($data['supplier']);
            $changes[] = 'supplier';
        }
        if (isset($data['reorder_level'])) {
            $fields[] = 'reorder_level = ?';
            $params[] = (int)$data['reorder_level'];
            $changes[] = 'reorder_level';
        }

        $newQuantity = isset($data['quantity']) ? (int)$data['quantity'] : (int)$item['quantity'];
        $reorderLevel = isset($data['reorder_level']) ? (int)$data['reorder_level'] : (int)$item['reorder_level'];

        if (isset($data['quantity'])) {
            $fields[] = 'quantity = ?';
            $params[] = $newQuantity;
            $changes[] = 'quantity';

            // Record transaction
            $diff = $newQuantity - (int)$item['quantity'];
            if ($diff !== 0) {
                $transType = $diff > 0 ? 'Added' : 'Used';
                $transQty = abs($diff);
                $transStmt = $this->db->prepare(
                    'INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, performed_by) VALUES (?, ?, ?, ?)'
                );
                $transStmt->execute([(int)$id, $transType, $transQty, $user['user_id']]);
            }
        }

        // Auto-compute status
        if ($newQuantity <= 0) {
            $status = 'Out of Stock';
        } elseif ($newQuantity <= $reorderLevel) {
            $status = 'Low Stock';
        } else {
            $status = 'In Stock';
        }
        $fields[] = 'status = ?';
        $params[] = $status;
        $changes[] = 'status';

        if (empty($fields)) {
            Response::error('No fields to update');
        }

        $params[] = (int)$id;
        $sql = 'UPDATE inventory SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        if (!empty($changes)) {
            $logStmt = $this->db->prepare(
                'INSERT INTO activity_log (user_id, action, description, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
            );
            $logStmt->execute([
                $user['user_id'],
                'Inventory item updated',
                'Updated fields: ' . implode(', ', $changes),
                'inventory',
                (int)$id
            ]);
        }

        Response::success(null, 'Inventory item updated');
    }

    public function deleteInventoryItem(int $id): void {
        $user = Auth::requireRole('admin');

        $stmt = $this->db->prepare('SELECT id, item_name FROM inventory WHERE id = ?');
        $stmt->execute([(int)$id]);
        $item = $stmt->fetch();

        if (!$item) {
            Response::error('Item not found', 404);
        }

        $stmt = $this->db->prepare('DELETE FROM inventory WHERE id = ?');
        $stmt->execute([(int)$id]);

        $stmt = $this->db->prepare(
            'INSERT INTO activity_log (user_id, action, description, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $user['user_id'],
            'Inventory item deleted',
            "Deleted {$item['item_name']}",
            'inventory',
            (int)$id
        ]);

        Response::success(null, 'Inventory item deleted');
    }

    public function getInventoryTransactions(): void {
        Auth::requireRole('admin');

        $stmt = $this->db->query(
            'SELECT it.*, i.item_name, i.category, u.full_name AS performed_by_name
             FROM inventory_transactions it
             JOIN inventory i ON it.inventory_id = i.id
             LEFT JOIN users u ON it.performed_by = u.id
             ORDER BY it.transaction_date DESC
             LIMIT 100'
        );

        Response::success($stmt->fetchAll());
    }

    // ===== REPORTS =====
    public function getAppointmentReports(): void {
        Auth::requireRole('admin');

        // Monthly appointment counts
        $stmt = $this->db->query(
            'SELECT TO_CHAR(appointment_date, \'YYYY-MM\') AS month,
                    TO_CHAR(appointment_date, \'Month YYYY\') AS month_label,
                    COUNT(*) AS total,
                    SUM(CASE WHEN status = \'Completed\' THEN 1 ELSE 0 END) AS completed,
                    SUM(CASE WHEN status = \'Cancelled\' THEN 1 ELSE 0 END) AS cancelled,
                    SUM(CASE WHEN status = \'Upcoming\' THEN 1 ELSE 0 END) AS upcoming
             FROM appointments
             WHERE appointment_date >= CURRENT_DATE - INTERVAL \'12 months\'
             GROUP BY month, month_label
             ORDER BY month ASC'
        );
        $monthlyData = $stmt->fetchAll();

        // Status distribution
        $stmt = $this->db->query(
            'SELECT status, COUNT(*) AS count FROM appointments GROUP BY status'
        );
        $statusDistribution = $stmt->fetchAll();

        // Top reasons
        $stmt = $this->db->query(
            'SELECT reason, COUNT(*) AS count FROM appointments
             WHERE reason IS NOT NULL AND reason != \'\'
             GROUP BY reason ORDER BY count DESC LIMIT 10'
        );
        $topReasons = $stmt->fetchAll();

        // By day of week
        $stmt = $this->db->query(
            'SELECT TO_CHAR(appointment_date, \'FMDay\') AS day_name, COUNT(*) AS count
             FROM appointments GROUP BY day_name
             ORDER BY CASE TO_CHAR(appointment_date, \'FMDay\')
                 WHEN \'Monday\' THEN 1 WHEN \'Tuesday\' THEN 2 WHEN \'Wednesday\' THEN 3
                 WHEN \'Thursday\' THEN 4 WHEN \'Friday\' THEN 5 WHEN \'Saturday\' THEN 6
                 WHEN \'Sunday\' THEN 7 END'
        );
        $byDayOfWeek = $stmt->fetchAll();

        Response::success([
            'monthly' => $monthlyData,
            'status_distribution' => $statusDistribution,
            'top_reasons' => $topReasons,
            'by_day_of_week' => $byDayOfWeek
        ]);
    }

    public function getDoctorReports(): void {
        Auth::requireRole('admin');

        $stmt = $this->db->query(
            'SELECT u.id, u.full_name, u.specialization,
                    COUNT(a.id) AS total_appointments,
                    SUM(CASE WHEN a.status = \'Completed\' THEN 1 ELSE 0 END) AS completed,
                    SUM(CASE WHEN a.status = \'Cancelled\' THEN 1 ELSE 0 END) AS cancelled,
                    COUNT(DISTINCT a.child_id) AS unique_patients
             FROM users u
             LEFT JOIN appointments a ON u.id = a.doctor_id
             WHERE u.role = \'doctor\'
             GROUP BY u.id, u.full_name, u.specialization
             ORDER BY total_appointments DESC'
        );

        Response::success($stmt->fetchAll());
    }

    public function getInventoryReports(): void {
        Auth::requireRole('admin');

        // Category distribution
        $stmt = $this->db->query(
            'SELECT category, COUNT(*) AS item_count, SUM(quantity) AS total_quantity
             FROM inventory GROUP BY category ORDER BY total_quantity DESC'
        );
        $byCategory = $stmt->fetchAll();

        // Status summary
        $stmt = $this->db->query(
            'SELECT status, COUNT(*) AS count FROM inventory GROUP BY status'
        );
        $statusSummary = $stmt->fetchAll();

        // Recent transactions
        $stmt = $this->db->query(
            'SELECT it.*, i.item_name, i.category
             FROM inventory_transactions it
             JOIN inventory i ON it.inventory_id = i.id
             ORDER BY it.transaction_date DESC LIMIT 20'
        );
        $recentTransactions = $stmt->fetchAll();

        // Low stock items
        $stmt = $this->db->query(
            'SELECT * FROM inventory WHERE status IN (\'Low Stock\', \'Out of Stock\') ORDER BY quantity ASC'
        );
        $lowStock = $stmt->fetchAll();

        Response::success([
            'by_category' => $byCategory,
            'status_summary' => $statusSummary,
            'recent_transactions' => $recentTransactions,
            'low_stock' => $lowStock
        ]);
    }

    // ===== ACTIVITY LOG =====
    public function getActivityLog(): void {
        Auth::requireRole('admin');

        $limit = (int)(getQueryParam('limit', 50));
        if ($limit > 200) $limit = 200;

        $stmt = $this->db->prepare(
            'SELECT al.*, u.full_name AS user_name, u.role AS user_role
             FROM activity_log al
             LEFT JOIN users u ON al.user_id = u.id
             ORDER BY al.created_at DESC
             LIMIT ?'
        );
        $stmt->execute([$limit]);

        Response::success($stmt->fetchAll());
    }

    // ===== DOCTORS LIST =====
    public function getDoctors(): void {
        Auth::requireRole('admin');

        $stmt = $this->db->query(
            'SELECT id, full_name, email, specialization, contact_number, is_active, created_at
             FROM users WHERE role = \'doctor\' ORDER BY full_name ASC'
        );

        Response::success($stmt->fetchAll());
    }
}
