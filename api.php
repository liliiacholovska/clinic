<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Origin: *');

function sendJson($data, $status = 200)
{
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  sendJson(['success' => true]);
}

try {
  $dbh = new PDO(
    'mysql:host=sql308.infinityfree.com;dbname=if0_41993799_clinic;charset=utf8mb4',
    'if0_41993799',
    'password'
  );
  $dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
  sendJson(['error' => 'Database connection failed: ' . $e->getMessage()], 500);
}

$JWT_SECRET = 'clinic_secret_key_2026';

function base64url_encode($data)
{
  return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data)
{
  return base64_decode(strtr($data, '-_', '+/'));
}

function createJwt($payload, $secret)
{
  $header = ['alg' => 'HS256', 'typ' => 'JWT'];

  $headerEncoded = base64url_encode(json_encode($header));
  $payloadEncoded = base64url_encode(json_encode($payload));

  $signature = hash_hmac(
    'sha256',
    "$headerEncoded.$payloadEncoded",
    $secret,
    true
  );

  return "$headerEncoded.$payloadEncoded." . base64url_encode($signature);
}

function verifyJwt($token, $secret)
{
  $parts = explode('.', $token);

  if (count($parts) !== 3) {
    return null;
  }

  [$header, $payload, $signature] = $parts;

  $validSignature = base64url_encode(
    hash_hmac('sha256', "$header.$payload", $secret, true)
  );

  if (!hash_equals($validSignature, $signature)) {
    return null;
  }

  $data = json_decode(base64url_decode($payload), true);

  if (!$data) {
    return null;
  }

  if (isset($data['exp']) && time() > $data['exp']) {
    return null;
  }

  return $data;
}

function getBearerToken()
{
  $authHeader = null;

  if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
  } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
  } elseif (function_exists('apache_request_headers')) {
    $headers = apache_request_headers();

    if (isset($headers['Authorization'])) {
      $authHeader = $headers['Authorization'];
    } elseif (isset($headers['authorization'])) {
      $authHeader = $headers['authorization'];
    }
  }

  if (!$authHeader) {
    return null;
  }

  if (preg_match('/Bearer\s+(\S+)/', $authHeader, $matches)) {
    return $matches[1];
  }

  return null;
}

$models = [
  'patients' => [
    'pk' => 'PatientID',
    'fields' => ['FullName', 'BirthDate', 'Phone']
  ],
  'doctors' => [
    'pk' => 'DoctorID',
    'fields' => ['DepartmentID', 'FullName', 'Specialization', 'Phone']
  ],
  'departments' => [
    'pk' => 'DepartmentID',
    'fields' => ['Name', 'Description']
  ],
  'services' => [
    'pk' => 'ServiceID',
    'fields' => ['DepartmentID', 'Name', 'Price', 'Duration']
  ],
  'appointment' => [
    'pk' => 'AppointmentID',
    'fields' => ['PatientID', 'DoctorID', 'ServiceID', 'Status', 'Reason', 'DateTime']
  ],
  'schedule' => [
    'pk' => 'ScheduleID',
    'fields' => ['DoctorID', 'DayOfWeek', 'StartTime', 'EndTime', 'IsAvailable']
  ],
  'diagnosis' => [
    'pk' => 'DiagnosisID',
    'fields' => ['AppointmentID', 'DiagnosisText', 'Notes']
  ],
  'payments' => [
    'pk' => 'PaymentID',
    'fields' => ['AppointmentID', 'Amount', 'Method', 'PaymentDate']
  ],
  'purpose' => [
    'pk' => 'PurposeID',
    'fields' => ['DiagnosisID', 'Medication', 'Dosage', 'Duration']
  ],
  'comments' => [
    'pk' => 'CommentID',
    'fields' => ['PatientID', 'DoctorID', 'Text', 'Rating', 'DateTime']
  ],
  'users' => [
    'pk' => 'id',
    'fields' => ['username', 'password', 'role', 'PatientID']
  ]
];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function requireAdmin($role)
{
  if ($role !== 'admin') {
    sendJson(['error' => 'Доступ дозволено тільки адміністратору'], 403);
  }
}

function selectSql($resource)
{
  switch ($resource) {
    case 'appointment':
      return "
        SELECT 
          a.AppointmentID,
          a.PatientID,
          a.DoctorID,
          a.ServiceID,
          p.FullName AS PatientName,
          d.FullName AS DoctorName,
          s.Name AS ServiceName,
          a.Status,
          a.Reason,
          a.DateTime
        FROM appointment a
        LEFT JOIN patients p ON a.PatientID = p.PatientID
        LEFT JOIN doctors d ON a.DoctorID = d.DoctorID
        LEFT JOIN services s ON a.ServiceID = s.ServiceID
        WHERE 1=1
      ";

    case 'doctors':
      return "
        SELECT 
          d.DoctorID,
          d.DepartmentID,
          dep.Name AS DepartmentName,
          d.FullName,
          d.Specialization,
          d.Phone
        FROM doctors d
        LEFT JOIN departments dep ON d.DepartmentID = dep.DepartmentID
        WHERE 1=1
      ";

    case 'schedule':
      return "
        SELECT 
          sch.ScheduleID,
          sch.DoctorID,
          d.FullName AS DoctorName,
          d.Specialization,
          dep.Name AS DepartmentName,
          sch.DayOfWeek,
          sch.StartTime,
          sch.EndTime,
          sch.IsAvailable
        FROM schedule sch
        LEFT JOIN doctors d ON sch.DoctorID = d.DoctorID
        LEFT JOIN departments dep ON d.DepartmentID = dep.DepartmentID
        WHERE 1=1
      ";

    case 'diagnosis':
      return "
        SELECT 
          dg.DiagnosisID,
          dg.AppointmentID,
          p.FullName AS PatientName,
          d.FullName AS DoctorName,
          dg.DiagnosisText,
          dg.Notes
        FROM diagnosis dg
        LEFT JOIN appointment a ON dg.AppointmentID = a.AppointmentID
        LEFT JOIN patients p ON a.PatientID = p.PatientID
        LEFT JOIN doctors d ON a.DoctorID = d.DoctorID
        WHERE 1=1
      ";

    case 'payments':
      return "
        SELECT 
          pay.PaymentID,
          pay.AppointmentID,
          p.FullName AS PatientName,
          pay.Amount,
          pay.Method,
          pay.PaymentDate
        FROM payments pay
        LEFT JOIN appointment a ON pay.AppointmentID = a.AppointmentID
        LEFT JOIN patients p ON a.PatientID = p.PatientID
        WHERE 1=1
      ";

    case 'purpose':
      return "
        SELECT 
          pr.PurposeID,
          pr.DiagnosisID,
          dg.DiagnosisText,
          pr.Medication,
          pr.Dosage,
          pr.Duration
        FROM purpose pr
        LEFT JOIN diagnosis dg ON pr.DiagnosisID = dg.DiagnosisID
        LEFT JOIN appointment a ON dg.AppointmentID = a.AppointmentID
        WHERE 1=1
      ";

    case 'comments':
      return "
        SELECT 
          c.CommentID,
          c.PatientID,
          c.DoctorID,
          p.FullName AS PatientName,
          d.FullName AS DoctorName,
          c.Text,
          c.Rating,
          c.DateTime
        FROM comments c
        LEFT JOIN patients p ON c.PatientID = p.PatientID
        LEFT JOIN doctors d ON c.DoctorID = d.DoctorID
        WHERE 1=1
      ";

    case 'services':
      return "
      SELECT
        s.ServiceID,
        s.DepartmentID,
        dep.Name AS DepartmentName,
        s.Name,
        s.Price,
        s.Duration
      FROM services s
      LEFT JOIN departments dep ON s.DepartmentID = dep.DepartmentID
      WHERE 1=1
    ";

    default:
      return "SELECT * FROM {$resource} WHERE 1=1";
  }
}

function sortFields($resource)
{
  $common = [
    'patients' => ['PatientID', 'FullName', 'BirthDate', 'Phone'],
    'departments' => ['DepartmentID', 'Name', 'Description'],
    'services' => ['ServiceID', 'Name', 'Price', 'Duration'],
    'users' => ['id', 'username', 'role', 'PatientID'],
    'appointment' => ['AppointmentID', 'PatientName', 'DoctorName', 'ServiceName', 'Status', 'Reason', 'DateTime'],
    'doctors' => ['DoctorID', 'DepartmentName', 'FullName', 'Specialization', 'Phone'],
    'schedule' => ['ScheduleID', 'DoctorName', 'Specialization', 'DepartmentName', 'DayOfWeek', 'StartTime', 'EndTime', 'IsAvailable'],
    'diagnosis' => ['DiagnosisID', 'PatientName', 'DoctorName', 'DiagnosisText', 'Notes'],
    'payments' => ['PaymentID', 'PatientName', 'Amount', 'Method', 'PaymentDate'],
    'purpose' => ['PurposeID', 'DiagnosisText', 'Medication', 'Dosage', 'Duration'],
    'comments' => ['CommentID', 'PatientName', 'DoctorName', 'Text', 'Rating', 'DateTime']
  ];

  return $common[$resource] ?? [];
}

if ($action === 'login') {
  $data = json_decode(file_get_contents('php://input'), true);

  $username = $data['username'] ?? '';
  $password = $data['password'] ?? '';

  $stmt = $dbh->prepare("
    SELECT 
      u.id,
      u.username,
      u.password,
      u.role,
      u.PatientID,
      p.FullName AS PatientName
    FROM users u
    LEFT JOIN patients p ON u.PatientID = p.PatientID
    WHERE u.username = :username
  ");

  $stmt->execute([':username' => $username]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$user) {
    sendJson([
      'success' => false,
      'error' => 'User not found'
    ], 200);
  }

  if (!password_verify($password, $user['password'])) {
    sendJson([
      'success' => false,
      'error' => 'Incorrect password'
    ], 200);
  }

  $token = createJwt([
    'id' => $user['id'],
    'username' => $user['username'],
    'role' => $user['role'],
    'patientId' => $user['PatientID'],
    'patientName' => $user['PatientName'],
    'exp' => time() + 60 * 60 * 24
  ], $JWT_SECRET);

  sendJson([
    'success' => true,
    'token' => $token,
    'user' => [
      'id' => $user['id'],
      'username' => $user['username'],
      'role' => $user['role'],
      'patientId' => $user['PatientID'],
      'patientName' => $user['PatientName']
    ]
  ]);
}

if ($action === 'register') {
  $data = json_decode(file_get_contents('php://input'), true);

  $username = trim($data['username'] ?? '');
  $password = trim($data['password'] ?? '');
  $fullName = trim($data['fullName'] ?? '');

  if ($username === '' || $password === '' || $fullName === '') {
    sendJson(['error' => 'Enter username, password and full name'], 400);
  }

  $stmt = $dbh->prepare("
    SELECT PatientID, FullName
    FROM patients
    WHERE LOWER(FullName) = LOWER(:FullName)
    LIMIT 1
  ");
  $stmt->execute([':FullName' => $fullName]);
  $patient = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$patient) {
    sendJson(['error' => 'Patient with this full name does not exist'], 404);
  }

  $patientId = $patient['PatientID'];

  $stmt = $dbh->prepare("
    SELECT id
    FROM users
    WHERE PatientID = :PatientID
    LIMIT 1
  ");
  $stmt->execute([':PatientID' => $patientId]);
  $existingPatientAccount = $stmt->fetch(PDO::FETCH_ASSOC);

  if ($existingPatientAccount) {
    sendJson(['error' => 'An account for this patient already exists'], 400);
  }

  $stmt = $dbh->prepare("
    SELECT id
    FROM users
    WHERE username = :username
    LIMIT 1
  ");
  $stmt->execute([':username' => $username]);
  $existingUsername = $stmt->fetch(PDO::FETCH_ASSOC);

  if ($existingUsername) {
    sendJson(['error' => 'This username is already taken'], 400);
  }

  $hash = password_hash($password, PASSWORD_DEFAULT);

  $stmt = $dbh->prepare("
    INSERT INTO users (username, password, role, PatientID)
    VALUES (:username, :password, 'client', :PatientID)
  ");

  $stmt->execute([
    ':username' => $username,
    ':password' => $hash,
    ':PatientID' => $patientId
  ]);

  sendJson(['success' => true]);
}

$resource = $_GET['resource'] ?? '';
$id = $_GET['id'] ?? null;
$token = $_GET['token'] ?? getBearerToken();
$authUser = $token ? verifyJwt($token, $JWT_SECRET) : null;

$role = $authUser['role'] ?? 'guest';
$patientId = $authUser['patientId'] ?? null;

if (!isset($models[$resource])) {
  sendJson(['error' => 'Unknown resource'], 404);
}

$model = $models[$resource];
$pk = $model['pk'];
$fields = $model['fields'];

switch ($method) {
  case 'GET':
    $sql = selectSql($resource);
    $params = [];

    if ($role === 'guest') {
      $guestAllowed = ['doctors', 'departments', 'services', 'schedule', 'comments'];

      if (!in_array($resource, $guestAllowed)) {
        sendJson(['error' => 'Access denied'], 403);
      }
    }

    if ($role === 'client') {
      $clientAllowed = [
        'doctors',
        'departments',
        'services',
        'appointment',
        'schedule',
        'diagnosis',
        'purpose',
        'comments'
      ];

      if (!in_array($resource, $clientAllowed)) {
        sendJson(['error' => 'Access denied'], 403);
      }

      if (in_array($resource, ['appointment', 'diagnosis', 'purpose'])) {
        if (!$patientId) {
          sendJson(['error' => 'Patient ID required'], 403);
        }

        if ($resource === 'appointment') {
          $sql .= " AND a.PatientID = :clientPatientID";
        }

        if ($resource === 'diagnosis') {
          $sql .= " AND a.PatientID = :clientPatientID";
        }

        if ($resource === 'purpose') {
          $sql .= " AND a.PatientID = :clientPatientID";
        }

        if ($resource === 'comments') {
          $sql .= " AND c.PatientID = :clientPatientID";
        }

        $params[':clientPatientID'] = $patientId;
      }
    }

    if (!$id && !empty($_GET['search'])) {
      $search = '%' . $_GET['search'] . '%';

      if ($resource === 'appointment') {
        $sql .= " AND (
          p.FullName LIKE :search
          OR d.FullName LIKE :search
          OR s.Name LIKE :search
          OR a.Status LIKE :search
          OR a.Reason LIKE :search
        )";
      } elseif ($resource === 'doctors') {
        $sql .= " AND (
          d.FullName LIKE :search
          OR d.Specialization LIKE :search
          OR dep.Name LIKE :search
          OR d.Phone LIKE :search
        )";
      } elseif ($resource === 'schedule') {
        $sql .= " AND (
          d.FullName LIKE :search
          OR d.Specialization LIKE :search
          OR dep.Name LIKE :search
          OR sch.DayOfWeek LIKE :search
          OR sch.StartTime LIKE :search
          OR sch.EndTime LIKE :search
        )";
      } elseif ($resource === 'diagnosis') {
        $sql .= " AND (
          p.FullName LIKE :search
          OR d.FullName LIKE :search
          OR dg.DiagnosisText LIKE :search
          OR dg.Notes LIKE :search
        )";
      } elseif ($resource === 'purpose') {
        $sql .= " AND (
          dg.DiagnosisText LIKE :search
          OR pr.Medication LIKE :search
          OR pr.Dosage LIKE :search
          OR pr.Duration LIKE :search
        )";
      } elseif ($resource === 'comments') {
        $sql .= " AND (
          p.FullName LIKE :search
          OR d.FullName LIKE :search
          OR c.Text LIKE :search
          OR c.Rating LIKE :search
        )";
      } else {
        $parts = [];

        foreach ($fields as $field) {
          $parts[] = "{$field} LIKE :search";
        }

        if (!empty($parts)) {
          $sql .= " AND (" . implode(' OR ', $parts) . ")";
        }
      }

      $params[':search'] = $search;
    }

    if (!$id && !empty($_GET['sort'])) {
      $sort = $_GET['sort'];
      $direction = strtoupper($_GET['direction'] ?? 'ASC');

      if ($direction !== 'ASC' && $direction !== 'DESC') {
        $direction = 'ASC';
      }

      if (in_array($sort, sortFields($resource))) {
        $sql .= " ORDER BY {$sort} {$direction}";
      }
    }

    if ($id) {
      $sql = "SELECT * FROM {$resource} WHERE {$pk} = :id";
      $params = [':id' => $id];
    }

    try {
      $stmt = $dbh->prepare($sql);
      $stmt->execute($params);
      sendJson($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (PDOException $e) {
      sendJson([
        'error' => 'SQL error',
        'message' => $e->getMessage(),
        'sql' => $sql
      ], 500);
    }
    break;

  case 'POST':
    if ($role !== 'admin') {
      if (!($role === 'client' && $resource === 'comments')) {
        sendJson(['error' => 'Access denied'], 403);
      }
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data)) {
      sendJson(['error' => 'Invalid JSON'], 400);
    }

    if ($role === 'client' && $resource === 'comments') {
      if (!$patientId) {
        sendJson(['error' => 'Patient ID required'], 403);
      }

      $data['PatientID'] = $patientId;
      $data['DateTime'] = date('Y-m-d H:i:s');
    }

    if ($resource === 'appointment') {
      $doctorId = $data['DoctorID'] ?? null;
      $dateTime = $data['DateTime'] ?? null;
      $dateTime = str_replace('T', ' ', $dateTime);
      $data['DateTime'] = $dateTime;
      $serviceId = $data['ServiceID'] ?? null;

      if (!$doctorId || !$serviceId || !$dateTime) {
        sendJson(['error' => 'Doctor, service and date/time are required'], 400);
      }

      $stmt = $dbh->prepare("
  SELECT d.DoctorID
  FROM doctors d
  JOIN services s ON d.DepartmentID = s.DepartmentID
  WHERE d.DoctorID = :DoctorID
    AND s.ServiceID = :ServiceID
  LIMIT 1
");

      $stmt->execute([
        ':DoctorID' => $doctorId,
        ':ServiceID' => $serviceId
      ]);

      if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
        sendJson(['error' => 'This service is not suitable for the selected doctor'], 400);
      }

      $date = new DateTime($dateTime);
      $dayOfWeek = (int) $date->format('N');
      $time = $date->format('H:i:s');

      $stmt = $dbh->prepare("
    SELECT ScheduleID
    FROM schedule
    WHERE DoctorID = :DoctorID
      AND DayOfWeek = :DayOfWeek
      AND IsAvailable = 1
      AND :Time >= StartTime
      AND :Time < EndTime
    LIMIT 1
  ");

      $stmt->execute([
        ':DoctorID' => $doctorId,
        ':DayOfWeek' => $dayOfWeek,
        ':Time' => $time
      ]);

      if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
        sendJson(['error' => 'Doctor is not available at this time'], 400);
      }

      $stmt = $dbh->prepare("
    SELECT AppointmentID
    FROM appointment
    WHERE DoctorID = :DoctorID
  AND DateTime = :DateTime
  AND Status <> 'cancelled'
    LIMIT 1
  ");

      $stmt->execute([
        ':DoctorID' => $doctorId,
        ':DateTime' => $dateTime
      ]);

      if ($stmt->fetch(PDO::FETCH_ASSOC)) {
        sendJson(['error' => 'Doctor already has an appointment at this time'], 400);
      }
    }

    if ($resource === 'users' && !empty($data['password'])) {
      $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
    }

    $insertFields = [];
    $placeholders = [];
    $params = [];

    foreach ($fields as $field) {
      if (isset($data[$field]) && $data[$field] !== '') {
        $insertFields[] = $field;
        $placeholders[] = ':' . $field;
        $params[':' . $field] = $data[$field];
      }
    }

    if (empty($insertFields)) {
      sendJson(['error' => 'No valid fields'], 400);
    }

    $sql = "INSERT INTO {$resource} (" . implode(',', $insertFields) . ") 
            VALUES (" . implode(',', $placeholders) . ")";

    $stmt = $dbh->prepare($sql);
    $stmt->execute($params);

    sendJson(['success' => true, 'id' => $dbh->lastInsertId()], 201);
    break;

  case 'PUT':
    requireAdmin($role);

    if (!$id) {
      sendJson(['error' => 'ID required'], 400);
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data)) {
      sendJson(['error' => 'Invalid JSON'], 400);
    }

    if ($resource === 'users' && isset($data['password']) && $data['password'] !== '') {
      $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
    }

    if ($resource === 'users' && isset($data['password']) && $data['password'] === '') {
      unset($data['password']);
    }

    $set = [];
    $params = [];

    foreach ($fields as $field) {
      if (isset($data[$field])) {
        $set[] = "{$field} = :{$field}";
        $params[':' . $field] = $data[$field];
      }
    }

    if (empty($set)) {
      sendJson(['error' => 'No valid fields'], 400);
    }

    $params[':id'] = $id;

    $sql = "UPDATE {$resource} SET " . implode(',', $set) . " WHERE {$pk} = :id";

    $stmt = $dbh->prepare($sql);
    $stmt->execute($params);

    sendJson(['success' => true]);
    break;

  case 'DELETE':
    requireAdmin($role);

    if (!$id) {
      sendJson(['error' => 'ID required'], 400);
    }

    $stmt = $dbh->prepare("DELETE FROM {$resource} WHERE {$pk} = :id");
    $stmt->execute([':id' => $id]);

    sendJson(['success' => true]);
    break;

  default:
    sendJson(['error' => 'Method not allowed'], 405);
}
?>
