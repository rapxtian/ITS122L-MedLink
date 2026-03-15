<?php
// CORS and headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/auth.php';
require_once __DIR__ . '/helpers/response.php';
require_once __DIR__ . '/helpers/validator.php';

// Parse the request
$requestUri = $_SERVER['REQUEST_URI'];
$basePath = '/backend';
$path = parse_url($requestUri, PHP_URL_PATH);
$path = str_replace($basePath, '', $path);
$path = trim($path, '/');
$segments = explode('/', $path);
$method = $_SERVER['REQUEST_METHOD'];

// Route: api/{resource}/...
if ($segments[0] !== 'api' || !isset($segments[1])) {
    Response::json(['error' => 'Not found'], 404);
}

$resource = $segments[1];
$action = $segments[2] ?? null;
$id = $segments[3] ?? null;
$subAction = $segments[4] ?? null;

// Route to controllers
switch ($resource) {
    case 'auth':
        require_once __DIR__ . '/controllers/AuthController.php';
        $controller = new AuthController();
        switch ($action) {
            case 'register': $controller->register(); break;
            case 'login': $controller->login(); break;
            case 'me': $controller->me(); break;
            case 'logout': $controller->logout(); break;
            default: Response::json(['error' => 'Not found'], 404);
        }
        break;

    case 'appointments':
        require_once __DIR__ . '/controllers/AppointmentController.php';
        $controller = new AppointmentController();
        switch ($method) {
            case 'GET':
                if ($action === 'patient' && $id) {
                    $controller->getByPatient($id);
                } elseif ($action === 'available-slots') {
                    $controller->getAvailableSlots();
                } elseif ($action && !$id) {
                    $controller->getById($action);
                } else {
                    $controller->getAll();
                }
                break;
            case 'POST':
                if ($action === 'book') {
                    $controller->book();
                } else {
                    Response::json(['error' => 'Not found'], 404);
                }
                break;
            case 'PUT':
                if ($action && $id === 'cancel') {
                    $controller->cancel($action);
                } elseif ($action && $id === 'status') {
                    $controller->updateStatus($action);
                } elseif ($action) {
                    $controller->update($action);
                }
                break;
            default:
                Response::json(['error' => 'Method not allowed'], 405);
        }
        break;

    case 'doctor':
        require_once __DIR__ . '/controllers/DoctorController.php';
        $controller = new DoctorController();
        switch ($action) {
            case 'schedule':
                if ($method === 'GET') $controller->getSchedule();
                elseif ($method === 'PUT') $controller->updateSchedule();
                elseif ($method === 'DELETE' && $id) $controller->removeSlot($id);
                elseif ($method === 'POST') $controller->addSlot();
                break;
            case 'appointments':
                if ($method === 'GET') $controller->getAppointments();
                elseif ($method === 'PUT' && $id) $controller->updateAppointment($id);
                break;
            case 'medical-records':
                if ($method === 'POST') $controller->addMedicalRecord();
                elseif ($method === 'GET') $controller->getMedicalRecords();
                break;
            case 'patient-history':
                if ($method === 'GET' && $id) $controller->getPatientHistory($id);
                break;
            case 'patients':
                if ($method === 'GET') $controller->getPatients();
                break;
            case 'dashboard':
                if ($method === 'GET') $controller->getDashboard();
                break;
            case 'lab-results':
                if ($method === 'POST') $controller->uploadLabResult();
                break;
            case 'ratings':
                require_once __DIR__ . '/controllers/RatingController.php';
                $ratingController = new RatingController();
                if ($method === 'GET') $ratingController->getDoctorRatings();
                break;
            default:
                Response::json(['error' => 'Not found'], 404);
        }
        break;

    case 'admin':
        require_once __DIR__ . '/controllers/AdminController.php';
        $controller = new AdminController();
        switch ($action) {
            case 'dashboard':
                $controller->getDashboard();
                break;
            case 'patients':
                if ($method === 'GET' && $id) $controller->getPatient($id);
                elseif ($method === 'GET') $controller->getPatients();
                elseif ($method === 'POST') $controller->createPatient();
                elseif ($method === 'PUT' && $id) $controller->updatePatient($id);
                elseif ($method === 'DELETE' && $id) $controller->deletePatient($id);
                break;
            case 'appointments':
                if ($method === 'GET') $controller->getAppointments();
                elseif ($method === 'PUT' && $id) $controller->updateAppointment($id);
                break;
            case 'inventory':
                if ($method === 'GET' && $id === 'transactions') $controller->getInventoryTransactions();
                elseif ($method === 'GET' && $id) $controller->getInventoryItem($id);
                elseif ($method === 'GET') $controller->getInventory();
                elseif ($method === 'POST') $controller->addInventoryItem();
                elseif ($method === 'PUT' && $id) $controller->updateInventoryItem($id);
                elseif ($method === 'DELETE' && $id) $controller->deleteInventoryItem($id);
                break;
            case 'reports':
                if ($id === 'appointments') $controller->getAppointmentReports();
                elseif ($id === 'inventory') $controller->getInventoryReports();
                elseif ($id === 'doctors') $controller->getDoctorReports();
                break;
            case 'activity':
                $controller->getActivityLog();
                break;
            case 'doctors':
                if ($method === 'GET') $controller->getDoctors();
                break;
            default:
                Response::json(['error' => 'Not found'], 404);
        }
        break;

    case 'patient':
        require_once __DIR__ . '/controllers/PatientController.php';
        $controller = new PatientController();
        switch ($action) {
            case 'dashboard':
                $controller->getDashboard();
                break;
            case 'children':
                if ($method === 'GET') $controller->getChildren();
                elseif ($method === 'POST') $controller->addChild();
                elseif ($method === 'PUT') $controller->updateChild();
                break;
            case 'medical-records':
                if ($method === 'GET') $controller->getMedicalRecords();
                break;
            case 'prescriptions':
                if ($method === 'GET') $controller->getPrescriptions();
                break;
            case 'lab-results':
                if ($method === 'GET' && $id === 'download') {
                    $controller->downloadLabResult($subAction);
                } elseif ($method === 'GET') {
                    $controller->getLabResults();
                }
                break;
            case 'notifications':
                if ($method === 'GET') $controller->getNotifications();
                elseif ($method === 'PUT' && $id === 'read') $controller->markNotificationRead($subAction);
                elseif ($method === 'PUT' && $id === 'read-all') $controller->markAllNotificationsRead();
                break;
            case 'profile':
                if ($method === 'GET') $controller->getProfile();
                elseif ($method === 'PUT') $controller->updateProfile();
                break;
            case 'profile-photo':
                if ($method === 'POST') $controller->uploadProfilePhoto();
                break;
            case 'emergency-contacts':
                if ($method === 'GET') $controller->getEmergencyContacts();
                elseif ($method === 'POST') $controller->addEmergencyContact();
                elseif ($method === 'PUT' && $id) $controller->updateEmergencyContact($id);
                elseif ($method === 'DELETE' && $id) $controller->deleteEmergencyContact($id);
                break;
            case 'check-reminders':
                if ($method === 'POST') $controller->checkAndSendReminders();
                break;
            default:
                Response::json(['error' => 'Not found'], 404);
        }
        break;

    case 'doctors':
        // Public route to list doctors for appointment booking
        require_once __DIR__ . '/controllers/PublicController.php';
        $controller = new PublicController();
        $controller->getDoctors();
        break;

    case 'notifications':
        require_once __DIR__ . '/controllers/NotificationController.php';
        $controller = new NotificationController();
        if ($method === 'GET') $controller->getNotifications();
        elseif ($method === 'PUT' && $action === 'read-all') $controller->markAllRead();
        elseif ($method === 'PUT' && $action) $controller->markRead($action);
        break;

    case 'ratings':
        require_once __DIR__ . '/controllers/RatingController.php';
        $controller = new RatingController();
        if ($method === 'POST') $controller->submitRating();
        elseif ($method === 'GET') $controller->getAppointmentRating();
        break;

    default:
        Response::json(['error' => 'Not found'], 404);
}
