<?php

class Validator {
    private array $errors = [];

    public function required(string $field, $value, string $label = null): self {
        $label = $label ?? $field;
        if ($value === null || $value === '' || (is_string($value) && trim($value) === '')) {
            $this->errors[$field] = "$label is required";
        }
        return $this;
    }

    public function email(string $field, $value): self {
        if ($value && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = "Invalid email format";
        }
        return $this;
    }

    public function minLength(string $field, $value, int $min, string $label = null): self {
        $label = $label ?? $field;
        if ($value && strlen($value) < $min) {
            $this->errors[$field] = "$label must be at least $min characters";
        }
        return $this;
    }

    public function match(string $field, $value, $matchValue, string $label = null): self {
        $label = $label ?? $field;
        if ($value !== $matchValue) {
            $this->errors[$field] = "$label does not match";
        }
        return $this;
    }

    public function date(string $field, $value, string $label = null): self {
        $label = $label ?? $field;
        if ($value && !strtotime($value)) {
            $this->errors[$field] = "Invalid $label format";
        }
        return $this;
    }

    public function inList(string $field, $value, array $list, string $label = null): self {
        $label = $label ?? $field;
        if ($value && !in_array($value, $list)) {
            $this->errors[$field] = "Invalid $label value";
        }
        return $this;
    }

    public function numeric(string $field, $value, string $label = null): self {
        $label = $label ?? $field;
        if ($value !== null && $value !== '' && !is_numeric($value)) {
            $this->errors[$field] = "$label must be a number";
        }
        return $this;
    }

    public function isValid(): bool {
        return empty($this->errors);
    }

    public function getErrors(): array {
        return $this->errors;
    }

    public function validate(): void {
        if (!$this->isValid()) {
            Response::error('Validation failed', 422, $this->errors);
        }
    }
}

function getInput(): array {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    return $data ?? [];
}

function getQueryParam(string $key, $default = null) {
    return $_GET[$key] ?? $default;
}
