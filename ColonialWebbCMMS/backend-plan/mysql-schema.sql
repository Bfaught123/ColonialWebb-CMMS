-- ColonialWebb CMMS draft relational schema for MySQL 8+
-- PROPOSED BACKEND SCHEMA ONLY; no live API is included in this demo.
CREATE DATABASE IF NOT EXISTS colonialwebb_cmms
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE colonialwebb_cmms;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  display_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('operator','maintenance','admin') NOT NULL DEFAULT 'operator',
  department VARCHAR(120) NOT NULL DEFAULT '',
  hourly_rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

CREATE TABLE assets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(100), location VARCHAR(160), manufacturer VARCHAR(120),
  model VARCHAR(120), serial_number VARCHAR(120),
  status ENUM('Operational','Needs Attention','Down','Retired') NOT NULL DEFAULT 'Operational',
  criticality ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  runtime_hours DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  deleted_at DATETIME(6) NULL
);

CREATE TABLE pm_schedules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pm_code VARCHAR(40) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  asset_id BIGINT UNSIGNED NULL,
  assignee_id BIGINT UNSIGNED NULL,
  interval_days INT UNSIGNED NOT NULL,
  next_due DATE NOT NULL,
  last_completed DATE NULL,
  instructions TEXT,
  deleted_at DATETIME(6) NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (assignee_id) REFERENCES users(id),
  CONSTRAINT chk_pm_interval CHECK (interval_days > 0)
);

CREATE TABLE work_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  work_order_code VARCHAR(40) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  asset_id BIGINT UNSIGNED NULL,
  pm_schedule_id BIGINT UNSIGNED NULL,
  pm_occurrence_due DATE NULL,
  priority ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
  status ENUM('Open','In Progress','On Hold','Completed') NOT NULL DEFAULT 'Open',
  requested_by_id BIGINT UNSIGNED NULL,
  assigned_to_id BIGINT UNSIGNED NULL,
  due_date DATE NULL,
  labor_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  legacy_labor_rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  manual_labor_recorded_at DATETIME(6) NULL,
  manual_downtime_recorded_at DATETIME(6) NULL,
  started_at DATETIME(6) NULL,
  downtime_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  completed_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deleted_at DATETIME(6) NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (pm_schedule_id) REFERENCES pm_schedules(id),
  FOREIGN KEY (requested_by_id) REFERENCES users(id),
  FOREIGN KEY (assigned_to_id) REFERENCES users(id),
  UNIQUE KEY uq_pm_occurrence (pm_schedule_id,pm_occurrence_due)
);

CREATE TABLE parts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  part_number VARCHAR(70) NOT NULL,
  name VARCHAR(180) NOT NULL,
  manufacturer VARCHAR(120), manufacturer_part_number VARCHAR(120),
  category VARCHAR(100), supplier VARCHAR(180),
  locker VARCHAR(40) NOT NULL, bin VARCHAR(40) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 0,
  min_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  max_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  unit_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  deleted_at DATETIME(6) NULL,
  UNIQUE KEY uq_part_location (part_number,locker,bin)
);

CREATE TABLE part_asset_compatibility (
  part_id BIGINT UNSIGNED NOT NULL,
  asset_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (part_id,asset_id),
  FOREIGN KEY (part_id) REFERENCES parts(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);

CREATE TABLE inventory_movements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  part_id BIGINT UNSIGNED NOT NULL,
  target_part_id BIGINT UNSIGNED NULL,
  work_order_id BIGINT UNSIGNED NULL,
  performed_by_id BIGINT UNSIGNED NOT NULL,
  movement_type ENUM('Receive','Issue','Return','Transfer','Adjust') NOT NULL,
  units_change INT NOT NULL,
  unit_cost_snapshot DECIMAL(14,4) NOT NULL DEFAULT 0,
  before_quantity INT UNSIGNED NOT NULL,
  after_quantity INT UNSIGNED NOT NULL,
  note TEXT,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (part_id) REFERENCES parts(id),
  FOREIGN KEY (target_part_id) REFERENCES parts(id),
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
  FOREIGN KEY (performed_by_id) REFERENCES users(id)
);

CREATE TABLE pm_completions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pm_schedule_id BIGINT UNSIGNED NOT NULL,
  asset_id BIGINT UNSIGNED NULL,
  completed_by_id BIGINT UNSIGNED NOT NULL,
  completed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  previous_due DATE NOT NULL,
  notes TEXT,
  FOREIGN KEY (pm_schedule_id) REFERENCES pm_schedules(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (completed_by_id) REFERENCES users(id)
);

CREATE TABLE purchase_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_code VARCHAR(40) NOT NULL UNIQUE,
  part_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
  supplier VARCHAR(180),
  requested_by_id BIGINT UNSIGNED NULL,
  status ENUM('Requested','Ordered','Received','Cancelled') NOT NULL DEFAULT 'Requested',
  requested_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  received_at DATETIME(6) NULL,
  deleted_at DATETIME(6) NULL,
  FOREIGN KEY (part_id) REFERENCES parts(id),
  FOREIGN KEY (requested_by_id) REFERENCES users(id)
);

CREATE TABLE audit_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT UNSIGNED NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NULL,
  action VARCHAR(60) NOT NULL,
  detail JSON NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

-- Logged labor/downtime are the source of reporting; aggregate on demand.
-- Browser demo's work_orders.labor_hours/downtime_hours act as LEGACY manual
-- totals. Do not sum them twice with entries migrated into these tables.
CREATE TABLE labor_entries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  work_order_id BIGINT UNSIGNED NOT NULL,
  technician_id BIGINT UNSIGNED NOT NULL,
  hours DECIMAL(14,5) NOT NULL,
  hourly_rate_snapshot DECIMAL(12,2) NOT NULL,
  source ENUM('timer','manual') NOT NULL,
  notes TEXT,
  started_at DATETIME(6) NULL,
  ended_at DATETIME(6) NULL,
  recorded_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
  FOREIGN KEY (technician_id) REFERENCES users(id),
  CONSTRAINT chk_labor_positive CHECK (hours >= 0)
);

CREATE TABLE downtime_entries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  work_order_id BIGINT UNSIGNED NOT NULL,
  recorded_by_id BIGINT UNSIGNED NOT NULL,
  hours DECIMAL(14,5) NOT NULL,
  source ENUM('timer','manual') NOT NULL,
  notes TEXT,
  started_at DATETIME(6) NULL,
  ended_at DATETIME(6) NULL,
  recorded_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
  FOREIGN KEY (recorded_by_id) REFERENCES users(id),
  CONSTRAINT chk_downtime_positive CHECK (hours >= 0)
);

-- Only running timers live here. When stopped, move a duration into the
-- corresponding immutable entries table and delete the active timer atomically.
CREATE TABLE active_time_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  work_order_id BIGINT UNSIGNED NOT NULL,
  technician_id BIGINT UNSIGNED NOT NULL,
  session_type ENUM('labor','downtime') NOT NULL,
  started_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  hourly_rate_snapshot DECIMAL(12,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
  FOREIGN KEY (technician_id) REFERENCES users(id),
  UNIQUE KEY uq_running_timer (technician_id,session_type)
);

CREATE TABLE facility_settings (
  id INT PRIMARY KEY,
  default_labor_rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  reporting_timezone VARCHAR(60) NOT NULL DEFAULT 'America/New_York'
);
