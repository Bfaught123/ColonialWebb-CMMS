/*
 * COLONIALWEBB CMMS — DEMO DATA
 * -----------------------------------------------
 * Edit example equipment, staff, parts, etc. here.
 * Existing browser data is NOT overwritten automatically.
 * To reload updated examples, use Settings > Reset Demo Data.
 * All values are demonstrations, not actual company records.
 */
(function () {
  function daysFromToday(number) {
    const date = new Date();
    date.setDate(date.getDate() + number);
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  window.CW_SEED = function () {
    return {
      settings: { company: 'ColonialWebb', facility: 'Main Facility', theme: 'light' },
      currentUserId: 'USR-001',
      team: [
        { id: 'USR-001', name: 'Maintenance Admin', department: 'Maintenance', role: 'Administrator', email: 'admin@example.com', active: true },
        { id: 'USR-002', name: 'Technician One', department: 'Maintenance', role: 'Technician', email: '', active: true },
        { id: 'USR-003', name: 'Technician Two', department: 'Maintenance', role: 'Technician', email: '', active: true },
        { id: 'USR-004', name: 'Operations User', department: 'Operations', role: 'Requestor', email: '', active: true }
      ],
      assets: [
        { id: 'AST-001', name: 'HGG ProCutter 1', category: 'CNC Pipe Cutting', location: 'Production Bay A', manufacturer: 'HGG', model: 'ProCutter', serial: 'DEMO-001', status: 'Needs Attention', criticality: 'High', hours: 4510, notes: 'Sample asset. Replace with your real information.' },
        { id: 'AST-002', name: 'HGG ProCutter 2', category: 'CNC Pipe Cutting', location: 'Production Bay A', manufacturer: 'HGG', model: 'ProCutter', serial: 'DEMO-002', status: 'Operational', criticality: 'High', hours: 3742, notes: '' },
        { id: 'AST-003', name: 'Overhead Crane 02', category: 'Material Handling', location: 'Production Bay B', manufacturer: 'Example Manufacturer', model: 'Bridge Crane', serial: 'DEMO-003', status: 'Operational', criticality: 'High', hours: 2086, notes: '' },
        { id: 'AST-004', name: 'Air Compressor 01', category: 'Compressed Air', location: 'Utility Room', manufacturer: 'Example Manufacturer', model: 'Rotary Screw', serial: 'DEMO-004', status: 'Operational', criticality: 'Medium', hours: 8200, notes: '' },
        { id: 'AST-005', name: 'Conveyor Line 03', category: 'Conveyors', location: 'Production Bay C', manufacturer: 'Example Manufacturer', model: 'Conveyor', serial: 'DEMO-005', status: 'Down', criticality: 'High', hours: 5820, notes: '' },
        { id: 'AST-006', name: 'Weld Cell 04', category: 'Welding', location: 'Production Bay B', manufacturer: 'Example Manufacturer', model: 'Weld Cell', serial: 'DEMO-006', status: 'Operational', criticality: 'Medium', hours: 1210, notes: '' }
      ],
      workOrders: [
        { id: 'WO-1048', title: 'Hydraulic pressure fluctuating', assetId: 'AST-001', priority: 'Critical', status: 'In Progress', assigneeId: 'USR-002', dueDate: daysFromToday(0), description: 'Check hydraulic pressure and investigate fluctuations.', laborHours: 2.5, downtimeHours: 1, createdAt: daysFromToday(-3), completedAt: '' },
        { id: 'WO-1047', title: 'Inspect hoist limit switch', assetId: 'AST-003', priority: 'High', status: 'Open', assigneeId: 'USR-003', dueDate: daysFromToday(1), description: 'Check operation and document inspection.', laborHours: 0, downtimeHours: 0, createdAt: daysFromToday(-2), completedAt: '' },
        { id: 'WO-1046', title: 'Air leak at regulator', assetId: 'AST-004', priority: 'Medium', status: 'Open', assigneeId: 'USR-002', dueDate: daysFromToday(3), description: 'Locate and repair leak.', laborHours: 0, downtimeHours: 0, createdAt: daysFromToday(-1), completedAt: '' },
        { id: 'WO-1045', title: 'Conveyor motor overheating', assetId: 'AST-005', priority: 'Critical', status: 'On Hold', assigneeId: 'USR-003', dueDate: daysFromToday(-1), description: 'Waiting for replacement bearing.', laborHours: 1.5, downtimeHours: 5, createdAt: daysFromToday(-5), completedAt: '' },
        { id: 'WO-1044', title: 'Lubricate guide rollers', assetId: 'AST-002', priority: 'Low', status: 'Completed', assigneeId: 'USR-002', dueDate: daysFromToday(-2), description: 'Routine lubrication completed.', laborHours: 0.8, downtimeHours: 0, createdAt: daysFromToday(-6), completedAt: daysFromToday(-2) },
        { id: 'WO-1043', title: 'Replace proximity sensor', assetId: 'AST-006', priority: 'High', status: 'Completed', assigneeId: 'USR-003', dueDate: daysFromToday(-1), description: 'Tested and replaced failed sensor.', laborHours: 1.2, downtimeHours: 1.5, createdAt: daysFromToday(-4), completedAt: daysFromToday(-1) }
      ],
      pmTasks: [
        { id: 'PM-301', title: 'Monthly crane safety inspection', assetId: 'AST-003', assigneeId: 'USR-003', intervalDays: 30, nextDue: daysFromToday(0), instructions: 'Verify limit switches, brakes, hook, and visual condition.', lastDone: '' },
        { id: 'PM-302', title: 'Guide rail lubrication', assetId: 'AST-001', assigneeId: 'USR-002', intervalDays: 7, nextDue: daysFromToday(1), instructions: 'Clean and lubricate all guide rails.', lastDone: '' },
        { id: 'PM-303', title: 'Compressor filter inspection', assetId: 'AST-004', assigneeId: 'USR-002', intervalDays: 30, nextDue: daysFromToday(3), instructions: 'Inspect filter and record compressor hours.', lastDone: '' },
        { id: 'PM-304', title: 'Conveyor gearbox oil check', assetId: 'AST-005', assigneeId: 'USR-003', intervalDays: 14, nextDue: daysFromToday(-2), instructions: 'Inspect oil level and signs of leaks.', lastDone: '' }
      ],
      pmHistory: [],
      parts: [
        { id: 'PART-001', number: 'BRG-6205', name: '6205 Motor Bearing', manufacturer: 'SKF', manufacturerNumber: '6205-2RS', category: 'Bearings', locker: '01', bin: 'A-02', quantity: 12, minimum: 5, maximum: 25, unitCost: 14.5, supplier: 'Industrial Supply', compatibleAssetIds: ['AST-005'], notes: '' },
        { id: 'PART-002', number: 'SNS-204', name: 'Inductive Proximity Sensor', manufacturer: 'Omron', manufacturerNumber: 'E2E-X5ME1', category: 'Electrical', locker: '02', bin: 'B-04', quantity: 3, minimum: 5, maximum: 15, unitCost: 45, supplier: 'Controls Supply', compatibleAssetIds: ['AST-006', 'AST-001'], notes: '' },
        { id: 'PART-003', number: 'FLT-110', name: 'Compressor Air Filter', manufacturer: 'Example', manufacturerNumber: 'AF-110', category: 'Filters', locker: '01', bin: 'C-01', quantity: 8, minimum: 4, maximum: 16, unitCost: 31, supplier: 'Industrial Supply', compatibleAssetIds: ['AST-004'], notes: '' },
        { id: 'PART-004', number: 'CNT-480', name: '480V Motor Contactor', manufacturer: 'Example', manufacturerNumber: 'LC1-480', category: 'Electrical', locker: '03', bin: 'A-01', quantity: 2, minimum: 3, maximum: 10, unitCost: 96, supplier: 'Controls Supply', compatibleAssetIds: ['AST-005'], notes: '' },
        { id: 'PART-005', number: 'BRG-6205', name: '6205 Motor Bearing', manufacturer: 'SKF', manufacturerNumber: '6205-2RS', category: 'Bearings', locker: '04', bin: 'D-03', quantity: 6, minimum: 2, maximum: 12, unitCost: 14.5, supplier: 'Industrial Supply', compatibleAssetIds: ['AST-005'], notes: '' },
        { id: 'PART-006', number: 'FUS-30A', name: '30A Class J Fuse', manufacturer: 'Example', manufacturerNumber: 'J-30', category: 'Electrical', locker: '02', bin: 'B-05', quantity: 20, minimum: 10, maximum: 30, unitCost: 12.75, supplier: 'Controls Supply', compatibleAssetIds: [], notes: '' }
      ],
      transactions: [
        { id: 'TX-001', date: new Date().toISOString(), type: 'Receive', partId: 'PART-001', partNumber: 'BRG-6205', quantity: 6, from: 'Supplier', to: '01 / A-02', technician: 'Maintenance Admin', workOrderId: '', note: 'Sample delivery' }
      ],
      purchaseRequests: [
        { id: 'PR-101', partId: 'PART-002', partNumber: 'SNS-204', description: 'Proximity sensor restock', quantity: 10, unitCost: 45, supplier: 'Controls Supply', requestedBy: 'Maintenance Admin', status: 'Requested', requestedAt: daysFromToday(-1), receivedAt: '' }
      ],
      activity: [
        { id: 'LOG-001', date: new Date().toISOString(), message: 'Demo CMMS initialized with example data.' }
      ]
    };
  };
})();
