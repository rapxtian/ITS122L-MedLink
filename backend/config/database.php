<?php

class Database {
    private string $host;
    private string $port;
    private string $dbName;
    private string $username;
    private string $password;
    private ?PDO $conn = null;

    public function __construct() {
        $this->host = getenv('DB_HOST') ?: 'db.uuujzjmoggwxfepnmdvf.supabase.co';
        $this->port = getenv('DB_PORT') ?: '5432';
        $this->dbName = getenv('DB_NAME') ?: 'postgres';
        $this->username = getenv('DB_USER') ?: 'postgres';
        $this->password = getenv('DB_PASS') ?: 'Mapuanatics2026';
    }

    public function getConnection(): PDO {
        if ($this->conn === null) {
            try {
                $dsn = "pgsql:host={$this->host};port={$this->port};dbname={$this->dbName};sslmode=require;options='--search_path=public'";
                $this->conn = new PDO($dsn, $this->username, $this->password, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Database connection failed',
                    'details' => $e->getMessage()
                ]);
                exit;
            }
        }
        return $this->conn;
    }
}
