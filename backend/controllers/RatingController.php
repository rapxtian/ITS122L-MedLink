<?php

class RatingController {
    private PDO $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // Patient submits a rating for a completed appointment
    public function submitRating(): void {
        $user = Auth::requireRole('patient');
        $data = getInput();

        $v = new Validator();
        $v->required('appointment_id', $data['appointment_id'] ?? null, 'Appointment')
          ->required('rating', $data['rating'] ?? null, 'Rating')
          ->numeric('rating', $data['rating'] ?? null, 'Rating');
        $v->validate();

        $rating = (int)$data['rating'];
        if ($rating < 1 || $rating > 5) {
            Response::error('Rating must be between 1 and 5');
        }

        // Verify appointment belongs to this patient and is completed
        $stmt = $this->db->prepare(
            'SELECT a.*, u.full_name AS doctor_name FROM appointments a 
             JOIN users u ON a.doctor_id = u.id 
             WHERE a.id = ? AND a.parent_id = ? AND a.status = \'Completed\''
        );
        $stmt->execute([(int)$data['appointment_id'], $user['user_id']]);
        $appointment = $stmt->fetch();

        if (!$appointment) {
            Response::error('Appointment not found or not eligible for rating', 404);
        }

        // Check if already rated
        $stmt = $this->db->prepare('SELECT id FROM doctor_ratings WHERE appointment_id = ?');
        $stmt->execute([(int)$data['appointment_id']]);
        if ($stmt->fetch()) {
            Response::error('You have already rated this appointment');
        }

        $stmt = $this->db->prepare(
            'INSERT INTO doctor_ratings (patient_id, doctor_id, appointment_id, rating, comment) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $user['user_id'],
            (int)$appointment['doctor_id'],
            (int)$data['appointment_id'],
            $rating,
            trim($data['comment'] ?? '')
        ]);

        // Notify the doctor
        $stmt = $this->db->prepare(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([
            (int)$appointment['doctor_id'],
            'New Patient Rating',
            "You received a {$rating}-star rating for an appointment on {$appointment['appointment_date']}.",
            'rating'
        ]);

        // Log activity
        $stmt = $this->db->prepare(
            'INSERT INTO activity_log (user_id, action, description, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $user['user_id'],
            'Rating submitted',
            "Rated {$appointment['doctor_name']} {$rating}/5 stars",
            'rating',
            (int)$data['appointment_id']
        ]);

        Response::success(null, 'Rating submitted successfully', 201);
    }

    // Doctor views their ratings
    public function getDoctorRatings(): void {
        $user = Auth::requireRole('doctor');

        $stmt = $this->db->prepare(
            'SELECT dr.*, u.full_name AS patient_name, a.appointment_date
             FROM doctor_ratings dr
             JOIN users u ON dr.patient_id = u.id
             JOIN appointments a ON dr.appointment_id = a.id
             WHERE dr.doctor_id = ?
             ORDER BY dr.created_at DESC
             LIMIT 50'
        );
        $stmt->execute([$user['user_id']]);
        $ratings = $stmt->fetchAll();

        // Calculate average
        $stmt = $this->db->prepare(
            'SELECT COALESCE(AVG(rating), 0) AS average, COUNT(*) AS total FROM doctor_ratings WHERE doctor_id = ?'
        );
        $stmt->execute([$user['user_id']]);
        $stats = $stmt->fetch();

        Response::success([
            'ratings' => $ratings,
            'average_rating' => round((float)$stats['average'], 1),
            'total_ratings' => (int)$stats['total']
        ]);
    }

    // Check if a specific appointment has been rated
    public function getAppointmentRating(): void {
        $user = Auth::requireAuth();
        $appointmentId = getQueryParam('appointment_id');

        if (!$appointmentId) {
            Response::error('appointment_id is required');
        }

        $stmt = $this->db->prepare('SELECT * FROM doctor_ratings WHERE appointment_id = ?');
        $stmt->execute([(int)$appointmentId]);
        $rating = $stmt->fetch();

        Response::success($rating ?: null);
    }
}
