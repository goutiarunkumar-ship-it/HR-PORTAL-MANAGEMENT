(function () {
  const { escape, heading, person, pill, empty } = window.PD.ui;
  const renderEmployees = (state) => `${heading("Employee Directory", "Manage employee profiles, roles, and department details.", '<button class="btn" data-action="add-employee">＋ Add employee</button>')}
    <section class="panel"><div class="panel-head"><h2>All employees <span class="pill">${state.employees.length} members</span></h2><button class="btn secondary" data-action="export-csv">↓ Export CSV</button></div>
      <div class="toolbar"><input class="field search" id="employee-search" placeholder="Search name, email or role..." aria-label="Search employees"><select class="field" id="department-filter" aria-label="Filter by department"><option>All Departments</option>${[...new Set(state.employees.map((employee) => employee.department))].sort().map((department) => `<option>${escape(department)}</option>`).join("")}</select></div>
      <div id="employee-table">${employeeTable(state.employees)}</div>
    </section>`;
  const employeeTable = (employees) => employees.length ? `<div class="table-wrap"><table><thead><tr><th>Employee</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${employees.map((employee) => `<tr><td>${person(employee)}</td><td>${escape(employee.role)}</td><td>${escape(employee.department)}</td><td>${pill(employee.status)}</td><td><div class="actions"><button class="icon-btn" data-action="edit-employee" data-id="${employee.id}">Edit</button><button class="icon-btn" data-action="delete-employee" data-id="${employee.id}">Delete</button></div></td></tr>`).join("")}
    </tbody></table></div>` : empty("No employees match your search.");
  const renderAttendance = (state) => `${heading("Attendance Overview", "Track daily attendance across your organization.")}
    <section class="panel"><div class="panel-head"><h2>Daily attendance</h2><span>${new Date(`${window.PD.data.today()}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span></div>
      <div class="table-wrap"><table><thead><tr><th>Employee</th><th>Department</th><th>Today's status</th><th>Mark attendance</th></tr></thead><tbody>
      ${state.employees.map((employee) => { const status = state.attendance[`${employee.id}_${window.PD.data.today()}`] || "Not marked"; return `<tr><td>${person(employee)}</td><td>${escape(employee.department)}</td><td>${pill(status)}</td><td><div class="actions"><button class="icon-btn" data-action="mark-attendance" data-id="${employee.id}" data-status="Present">✓ Present</button><button class="icon-btn" data-action="mark-attendance" data-id="${employee.id}" data-status="Absent">✕ Absent</button></div></td></tr>`; }).join("")}
      </tbody></table>${state.employees.length ? "" : empty("No employees to show.")}</div>
    </section>`;
  window.PD.people = { renderEmployees, renderAttendance, employeeTable };
})();
