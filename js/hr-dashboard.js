(function () {
  const { escape, stat, heading, person, pill, formatDate } = window.PD.ui;
  const render = (state) => {
    const pendingLeaves = state.leaves.filter((leave) => leave.status === "Pending");
    const pendingAttendance = state.attendanceRequests.filter((request) => request.status === "Pending");
    const activeTasks = state.tasks.filter((task) => task.status !== "Completed");
    const present = state.employees.filter((employee) => state.attendance[`${employee.id}_${window.PD.data.today()}`] === "Present").length;
    const departments = new Set(state.employees.map((employee) => employee.department)).size;
    const taskPreview = state.tasks.slice(0, 4).map((task) => {
      const employee = window.PD.data.employeeFor(task.employeeId);
      return `<div class="activity"><span class="activity-dot"></span><div><strong>${escape(task.title)}</strong><small>${escape(employee ? employee.name : "Former employee")} · Due ${escape(formatDate(task.dueDate))}</small></div>${pill(task.status)}</div>`;
    }).join("");
    const recent = pendingLeaves.slice(0, 3).map((leave) => `<div class="activity"><span class="activity-dot"></span><div><strong>${escape(leave.name)} · ${escape(leave.type)}</strong><small>${escape(formatDate(leave.from))} – ${escape(formatDate(leave.to))}</small></div>${pill(leave.status)}</div>`).join("");
    const corrections = pendingAttendance.slice(0, 3).map((request) => `<div class="activity"><span class="activity-dot"></span><div><strong>${escape(request.name)} requested an attendance correction</strong><small>${escape(formatDate(request.date))} · ${escape(request.issue)}</small></div>${pill(request.status)}</div>`).join("");
    return `${heading("Good morning, team", "Your HR workspace at a glance. Review requests and keep work moving.")}
      <div class="stats">
        ${stat("♙", "Total employees", state.employees.length, "People in your organization")}
        ${stat("◷", "Present today", present, "Attendance marked present")}
        ${stat("▤", "Leave requests", pendingLeaves.length, "Awaiting your review")}
        ${stat("✓", "Attendance requests", pendingAttendance.length, "Corrections to review")}
      </div>
      <div class="stats stats-secondary">
        ${stat("⌂", "Departments", departments, "Active departments")}
        ${stat("▣", "Open tasks", activeTasks.length, "Assigned and in progress")}
        ${stat("♙", "On leave", state.employees.filter((employee) => employee.status === "On Leave").length, "Employees marked on leave")}
        ${stat("◷", "Today's date", window.PD.data.today(), "Local browser date")}
      </div>
      <div class="two-col">
        <section class="panel"><div class="panel-head"><h2>Leave requests to review</h2><button class="icon-btn" data-page="leave-requests">View requests →</button></div>${recent || '<div class="empty">No pending leave requests.</div>'}</section>
        <section class="panel"><div class="panel-head"><h2>Attendance corrections</h2><button class="icon-btn" data-page="attendance-requests">Review requests →</button></div>${corrections || '<div class="empty">No attendance requests waiting for review.</div>'}</section>
      </div>
      <section class="panel"><div class="panel-head"><h2>Assigned tasks</h2><button class="icon-btn" data-page="tasks">Manage and assign tasks →</button></div>${taskPreview || '<div class="empty">No tasks assigned yet.</div>'}</section>
      <section class="panel"><div class="panel-head"><h2>Recently added employees</h2><button class="icon-btn" data-page="employees">Open directory →</button></div>
        <div class="table-wrap"><table><thead><tr><th>Employee</th><th>Role</th><th>Department</th><th>Status</th></tr></thead><tbody>
        ${state.employees.slice(0, 5).map((employee) => `<tr><td>${person(employee)}</td><td>${escape(employee.role)}</td><td>${escape(employee.department)}</td><td>${pill(employee.status)}</td></tr>`).join("")}
        </tbody></table></div>
      </section>`;
  };
  window.PD.hrDashboard = { render };
})();
