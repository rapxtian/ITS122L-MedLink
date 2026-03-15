<?php

class AuthController {
    private PDO $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function register(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 405);
        }

        $data = getInput();

        // Validate parent/guardian info
        $v = new Validator();
        $v->required('full_name', $data['full_name'] ?? null, 'Full Name')
          ->required('email', $data['email'] ?? null, 'Email')
          ->email('email', $data['email'] ?? null)
          ->required('password', $data['password'] ?? null, 'Password')
          ->minLength('password', $data['password'] ?? null, 6, 'Password')
          ->match('confirm_password', $data['confirm_password'] ?? null, $data['password'] ?? null, 'Password confirmation')
          ->required('contact_number', $data['contact_number'] ?? null, 'Contact Number')
          ->required('address', $data['address'] ?? null, 'Address');

        // Validate child info
        $v->required('child_name', $data['child_name'] ?? null, 'Child Name')
          ->required('child_dob', $data['child_dob'] ?? null, 'Date of Birth')
          ->date('child_dob', $data['child_dob'] ?? null, 'Date of Birth')
          ->required('child_gender', $data['child_gender'] ?? null, 'Gender')
          ->inList('child_gender', $data['child_gender'] ?? null, ['Male', 'Female'], 'Gender');

        // Validate emergency contact
        $v->required('emergency_contact_name', $data['emergency_contact_name'] ?? null, 'Emergency Contact Name')
          ->required('emergency_contact_relationship', $data['emergency_contact_relationship'] ?? null, 'Relationship')
          ->required('emergency_contact_number', $data['emergency_contact_number'] ?? null, 'Emergency Contact Number');

        $v->validate();

        // Check if email already exists
        $stmt = $this->db->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([trim($data['email'])]);
        if ($stmt->fetch()) {
            Response::error('Email already registered', 409);
        }

        $this->db->beginTransaction();
        try {
            // Create parent user
            $stmt = $this->db->prepare(
                'INSERT INTO users (email, password, role, full_name, contact_number, address) VALUES (?, ?, ?, ?, ?, ?) RETURNING id'
            );
            $stmt->execute([
                trim($data['email']),
                Auth::hashPassword($data['password']),
                'patient',
                trim($data['full_name']),
                trim($data['contact_number']),
                trim($data['address'])
            ]);
            $parentId = (int)$stmt->fetchColumn();

            // Create child record
            $stmt = $this->db->prepare(
                'INSERT INTO children (parent_id, full_name, date_of_birth, gender, known_allergies, medical_history) VALUES (?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $parentId,
                trim($data['child_name']),
                $data['child_dob'],
                $data['child_gender'],
                trim($data['child_allergies'] ?? ''),
                trim($data['child_medical_history'] ?? '')
            ]);

            // Create emergency contact
            $stmt = $this->db->prepare(
                'INSERT INTO emergency_contacts (parent_id, contact_name, relationship, contact_number) VALUES (?, ?, ?, ?)'
            );
            $stmt->execute([
                $parentId,
                trim($data['emergency_contact_name']),
                trim($data['emergency_contact_relationship']),
                trim($data['emergency_contact_number'])
            ]);

            $this->db->commit();

            // Generate token
            $token = Auth::generateToken([
                'id' => $parentId,
                'email' => $data['email'],
                'role' => 'patient',
                'full_name' => $data['full_name']
            ]);

            // Optional post-registration side effects should not fail account creation.
            try {
                $this->logActivity($parentId, 'User registered', "New patient account created: {$data['full_name']}", 'user', $parentId);
            } catch (Throwable $e) {
                error_log('Registration activity log failed: ' . $e->getMessage());
            }

            try {
                $stmt = $this->db->prepare(
                    'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
                );
                $stmt->execute([
                    $parentId,
                    'Welcome to MedLink!',
                    'Your account has been created successfully. You can now book appointments for your child.',
                    'info'
                ]);
            } catch (Throwable $e) {
                error_log('Registration notification failed: ' . $e->getMessage());
            }

            Response::success([
                'token' => $token,
                'user' => [
                    'id' => $parentId,
                    'email' => $data['email'],
                    'role' => 'patient',
                    'full_name' => $data['full_name']
                ]
            ], 'Registration successful', 201);

        } catch (Throwable $e) {
            $this->db->rollBack();
            error_log('Registration failed: ' . $e->getMessage());
            Response::error('Registration failed', 500);
        }
    }

    public function login(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 405);
        }

        $data = getInput();

        $v = new Validator();
        $v->required('email', $data['email'] ?? null, 'Email')
          ->email('email', $data['email'] ?? null)
          ->required('password', $data['password'] ?? null, 'Password');
        $v->validate();

        $stmt = $this->db->prepare('SELECT * FROM users WHERE email = ? AND is_active = true');
        $stmt->execute([trim($data['email'])]);
        $user = $stmt->fetch();

        if (!$user || !Auth::verifyPassword($data['password'], $user['password'])) {
            Response::error('Invalid email or password', 401);
        }

        // If role is specified in login, validate it
        if (isset($data['role']) && $data['role'] !== $user['role']) {
            Response::error('Invalid role for this account', 403);
        }

        $token = Auth::generateToken($user);

        $this->logActivity($user['id'], 'User login', "{$user['full_name']} logged in", 'user', $user['id']);

        Response::success([
            'token' => $token,
            'user' => [
                'id' => (int)$user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'full_name' => $user['full_name'],
                'specialization' => $user['specialization'],
                'contact_number' => $user['contact_number']
            ]
        ], 'Login successful');
    }

    public function me(): void {
        $user = Auth::requireAuth();

        $stmt = $this->db->prepare('SELECT id, email, role, full_name, contact_number, address, specialization, created_at FROM users WHERE id = ?');
        $stmt->execute([$user['user_id']]);
        $userData = $stmt->fetch();

        if (!$userData) {
            Response::error('User not found', 404);
        }

        // If patient, include children
        if ($userData['role'] === 'patient') {
            $stmt = $this->db->prepare('SELECT * FROM children WHERE parent_id = ?');
            $stmt->execute([$user['user_id']]);
            $userData['children'] = $stmt->fetchAll();
        }

        Response::success($userData);
    }

    public function logout(): void {
        // With JWT, logout is handled client-side by removing the token
        Response::success(null, 'Logged out successfully');
    }

    private function logActivity(int $userId, string $action, string $description, string $entityType, int $entityId): void {
        $stmt = $this->db->prepare(
            'INSERT INTO activity_log (user_id, action, description, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$userId, $action, $description, $entityType, $entityId]);
    }
}
