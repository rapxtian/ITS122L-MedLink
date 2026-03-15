-- MedLink Pediatric Clinic Database Schema (PostgreSQL / Supabase)
-- Run this in the Supabase SQL Editor

-- =============================================
-- USERS TABLE (all roles: patient, doctor, admin)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
    full_name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50),
    address TEXT,
    specialization VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CHILDREN (linked to parent/patient user)
-- =============================================
CREATE TABLE IF NOT EXISTS children (
    id SERIAL PRIMARY KEY,
    parent_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female')),
    known_allergies TEXT,
    medical_history TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- EMERGENCY CONTACTS
-- =============================================
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id SERIAL PRIMARY KEY,
    parent_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- DOCTOR SCHEDULES (availability slots)
-- =============================================
CREATE TABLE IF NOT EXISTS doctor_schedules (
    id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
    time_slot TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_schedule UNIQUE (doctor_id, day_of_week, time_slot)
);

-- =============================================
-- APPOINTMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    child_id INT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    parent_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'In Progress', 'Completed', 'Cancelled')),
    cancellation_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- MEDICAL RECORDS
-- =============================================
CREATE TABLE IF NOT EXISTS medical_records (
    id SERIAL PRIMARY KEY,
    child_id INT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    doctor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id INT DEFAULT NULL REFERENCES appointments(id) ON DELETE SET NULL,
    diagnosis VARCHAR(500) NOT NULL,
    treatment TEXT NOT NULL,
    notes TEXT,
    record_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PRESCRIPTIONS
-- =============================================
CREATE TABLE IF NOT EXISTS prescriptions (
    id SERIAL PRIMARY KEY,
    medical_record_id INT NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    child_id INT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Completed')),
    issued_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issued_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- LAB RESULTS
-- =============================================
CREATE TABLE IF NOT EXISTS lab_results (
    id SERIAL PRIMARY KEY,
    child_id INT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('pdf', 'image')),
    ordered_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    result_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INVENTORY
-- =============================================
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Antibiotic','Analgesic','Supplement','Electrolyte','Immunological','Equipment')),
    quantity INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 10,
    supplier VARCHAR(255),
    status VARCHAR(50) DEFAULT 'In Stock' CHECK (status IN ('In Stock','Low Stock','Out of Stock')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INVENTORY TRANSACTIONS
-- =============================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    inventory_id INT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('Added', 'Used')),
    quantity INT NOT NULL,
    transaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    performed_by INT DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- NOTIFICATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ACTIVITY LOG
-- =============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    user_id INT DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    description TEXT,
    entity_type VARCHAR(50),
    entity_id INT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- DOCTOR RATINGS
-- =============================================
CREATE TABLE IF NOT EXISTS doctor_ratings (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id INT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_appointment_rating UNIQUE (appointment_id)
);

-- =============================================
-- ADD profile_photo to users (idempotent)
-- =============================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='profile_photo') THEN
        ALTER TABLE users ADD COLUMN profile_photo VARCHAR(500) DEFAULT NULL;
    END IF;
END $$;

-- =============================================
-- ADD reminder_sent to appointments (idempotent)
-- =============================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='reminder_sent') THEN
        ALTER TABLE appointments ADD COLUMN reminder_sent BOOLEAN DEFAULT false;
    END IF;
END $$;

-- =============================================
-- TRIGGER: Auto-update updated_at columns
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_children_updated_at ON children;
CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_medical_records_updated_at ON medical_records;
CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_parent_id ON appointments(parent_id);
CREATE INDEX IF NOT EXISTS idx_appointments_child_id ON appointments(child_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_medical_records_child_id ON medical_records(child_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_id ON doctor_schedules(doctor_id);

-- =============================================
-- SEED: Default Admin Account
-- Password: admin123 (bcrypt hash)
-- =============================================
INSERT INTO users (email, password, role, full_name, contact_number, address)
VALUES ('admin@medlink.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'System Administrator', '(02) 8123-4567', '123 Clinic Street, City')
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- SEED: Sample Doctors
-- Password: admin123
-- =============================================
INSERT INTO users (email, password, role, full_name, contact_number, specialization)
VALUES
('celerina.gonzalesreganion@medlink.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'doctor', 'Dr. Celerina Gonzales-Reganion, MD, FPPS', '0917-500-1001', 'General Pediatrics'),
('juan.reganion@medlink.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'doctor', 'Dr. Juan G. Reganion, MD', '0917-500-1002', 'Pediatric Cardiologist'),
('jeanie.uy@medlink.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'doctor', 'Dr. Jeanie Karen K. Uy, MD, DPPS, DPIDSP', '0917-500-1003', 'General Pediatrics / Pediatric Infectious Disease'),
('patricia.deleon@medlink.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'doctor', 'Dr. Patricia G. De Leon, MD', '0917-500-1004', 'Pediatric Cardiologist')
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- SEED: Default Doctor Schedules (Mon-Sat, 8AM-4PM)
-- =============================================
INSERT INTO doctor_schedules (doctor_id, day_of_week, time_slot)
SELECT u.id, d.day_name, t.time_slot::TIME
FROM users u
CROSS JOIN (
    VALUES ('Monday'), ('Tuesday'), ('Wednesday'), ('Thursday'), ('Friday'), ('Saturday')
) AS d(day_name)
CROSS JOIN (
    VALUES ('08:00:00'), ('09:00:00'), ('10:00:00'), ('11:00:00'), ('13:00:00'), ('14:00:00'), ('15:00:00'), ('16:00:00')
) AS t(time_slot)
WHERE u.role = 'doctor'
ON CONFLICT (doctor_id, day_of_week, time_slot) DO NOTHING;

-- =============================================
-- SEED: Sample Inventory
-- =============================================
INSERT INTO inventory (item_name, category, quantity, reorder_level, supplier, status)
VALUES
('Amoxicillin 250mg', 'Antibiotic', 150, 50, 'PharmaCorp', 'In Stock'),
('Paracetamol Syrup', 'Analgesic', 30, 40, 'MediSupply Co.', 'Low Stock'),
('Vitamin D Drops', 'Supplement', 85, 30, 'HealthPlus Inc.', 'In Stock'),
('Oral Rehydration Salts', 'Electrolyte', 12, 25, 'MediSupply Co.', 'Low Stock'),
('Influenza Vaccine', 'Immunological', 0, 20, 'VaxPharm', 'Out of Stock'),
('Ibuprofen Suspension', 'Analgesic', 95, 30, 'PharmaCorp', 'In Stock'),
('Cetirizine Syrup', 'Antibiotic', 8, 15, 'HealthPlus Inc.', 'Low Stock'),
('Digital Thermometer', 'Equipment', 45, 10, 'MedEquip Ltd.', 'In Stock')
ON CONFLICT DO NOTHING;
