(function () {
  const { escape, heading, pill, empty, formatDate } = window.PD.ui;
  const { belongsTo } = window.PD.employeeDashboard;
  const renderLeaveRequests = (state) => `${heading("Leave Management", "Review and manage employee time-off requests.")}
    <section class="panel"><div class="panel-head"><h2>Time-off requests</h2><span>${state.leaves.filter((leave) => leave.status === "Pending").length} pending</span></div>
      ${state.leaves.length ? `<div class="table-wrap"><table><thead><tr><th>Employee</th><th>Leave type</th><th>Dates</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${state.leaves.map((leave) => `<tr><td><strong>${escape(leave.name)}</strong></td><td>${escape(leave.type)}</td><td>${escape(formatDate(leave.from))} – ${escape(formatDate(leave.to))}</td><td>${escape(leave.reason || "—")}</td><td>${pill(leave.status)}</td><td>${leave.status === "Pending" ? `<div class="actions"><button class="icon-btn" data-action="leave-status" data-id="${leave.id}" data-status="Approved">✓ Approve</button><button class="icon-btn" data-action="leave-status" data-id="${leave.id}" data-status="Rejected">✕ Reject</button></div>` : "—"}</td></tr>`).join("")}
      </tbody></table></div>` : empty("No leave requests yet.")}</section>`;
  const renderMyLeave = (state, employee) => {
    const leaves = state.leaves.filter((leave) => belongsTo(leave, employee));
    return `${heading("My Leave", "Request time off and track your request status.")}
      <section class="panel form-panel"><div class="panel-head"><h2>Submit a leave request</h2></div>
        <form class="inline-form" data-form="leave-request">
          <label class="form-group">Leave type<select class="field" name="type" required><option>Casual Leave</option><option>Sick Leave</option><option>Personal Leave</option><option>Annual Leave</option></select></label>
          <label class="form-group">From<input class="field" type="date" name="from" min="${window.PD.data.today()}" required></label>
          <label class="form-group">To<input class="field" type="date" name="to" min="${window.PD.data.today()}" required></label>
          <label class="form-group">Reason<textarea class="field" name="reason" maxlength="300" required placeholder="Add a short reason"></textarea></label>
          <div class="form-actions"><button class="btn" type="submit">Submit request</button></div>
        </form>
      </section>
      <section class="panel"><div class="panel-head"><h2>My request history</h2><span>${leaves.length} requests</span></div>
        ${leaves.length ? `<div class="table-wrap"><table><thead><tr><th>Leave type</th><th>Dates</th><th>Reason</th><th>Status</th></tr></thead><tbody>${leaves.map((leave) => `<tr><td>${escape(leave.type)}</td><td>${escape(formatDate(leave.from))} – ${escape(formatDate(leave.to))}</td><td>${escape(leave.reason || "—")}</td><td>${pill(leave.status)}</td></tr>`).join("")}</tbody></table></div>` : empty("You have not submitted any leave requests.")}
      </section>`;
  };
  const renderAttendanceRequests = (state) => `${heading("Attendance Requests", "Review employee requests to correct an attendance record.")}
    <section class="panel"><div class="panel-head"><h2>Correction requests</h2><span>${state.attendanceRequests.filter((request) => request.status === "Pending").length} pending</span></div>
      ${state.attendanceRequests.length ? `<div class="table-wrap"><table><thead><tr><th>Employee</th><th>Date</th><th>Requested status</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${state.attendanceRequests.map((request) => `<tr><td><strong>${escape(request.name)}</strong></td><td>${escape(formatDate(request.date))}</td><td>${escape(request.requestedStatus)}</td><td>${escape(request.issue)}</td><td>${pill(request.status)}</td><td>${request.status === "Pending" ? `<div class="actions"><button class="icon-btn" data-action="attendance-request-status" data-id="${request.id}" data-status="Approved">✓ Approve</button><button class="icon-btn" data-action="attendance-request-status" data-id="${request.id}" data-status="Rejected">✕ Reject</button></div>` : "—"}</td></tr>`).join("")}
      </tbody></table></div>` : empty("No attendance correction requests yet.")}</section>`;
  const renderMyAttendance = (state, employee) => {
    const requests = state.attendanceRequests.filter((request) => Number(request.employeeId) === Number(employee.id));
    const todayStatus = state.attendance[`${employee.id}_${window.PD.data.today()}`] || "Not marked by HR";
    return `${heading("My Attendance", "Check your attendance and request a correction if needed.")}
      <section class="panel form-panel"><div class="panel-head"><h2>Today's attendance</h2>${pill(todayStatus)}</div>
        <p class="muted">Attendance is recorded by HR. Submit a correction request if a day is missing or incorrect.</p>
        <form class="inline-form" data-form="attendance-request">
          <label class="form-group">Date<input class="field" type="date" name="date" max="${window.PD.data.today()}" required></label>
          <label class="form-group">What should the status be?<select class="field" name="requestedStatus"><option>Present</option><option>Absent</option></select></label>
          <label class="form-group full">Reason<textarea class="field" name="issue" maxlength="300" required placeholder="Explain what needs to be corrected"></textarea></label>
          <div class="form-actions"><button class="btn" type="submit">Request correction</button></div>
        </form>
      </section>
      <section class="panel"><div class="panel-head"><h2>My correction requests</h2><span>${requests.length} requests</span></div>
        ${requests.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Requested status</th><th>Reason</th><th>Request status</th></tr></thead><tbody>${requests.map((request) => `<tr><td>${escape(formatDate(request.date))}</td><td>${escape(request.requestedStatus)}</td><td>${escape(request.issue)}</td><td>${pill(request.status)}</td></tr>`).join("")}</tbody></table></div>` : empty("You have not submitted any correction requests.")}
      </section>`;
  };
  const renderTasks = (state) => `${heading("Assigned Tasks", "Assign work to employees and track progress.", '<button class="btn" data-page="tasks">Refresh tasks</button>')}
    <section class="panel form-panel"><div class="panel-head"><h2>Assign a task</h2></div>
      <form class="inline-form" data-form="assign-task">
        <label class="form-group">Employee<select class="field" name="employeeId" required>${state.employees.map((employee) => `<option value="${employee.id}">${escape(employee.name)}</option>`).join("")}</select></label>
        <label class="form-group">Task title<input class="field" name="title" maxlength="100" required placeholder="e.g. Prepare monthly report"></label>
        <label class="form-group">Due date<input class="field" type="date" name="dueDate" min="${window.PD.data.today()}" required></label>
        <label class="form-group">Priority<select class="field" name="priority"><option>Medium</option><option>High</option><option>Low</option></select></label>
        <label class="form-group full">Details<textarea class="field" name="description" maxlength="500" placeholder="Add task context or instructions"></textarea></label>
        <div class="form-actions"><button class="btn" type="submit">Assign task</button></div>
      </form>
    </section>
    <section class="panel"><div class="panel-head"><h2>All assigned tasks</h2><span>${state.tasks.length} total</span></div>
      ${state.tasks.length ? `<div class="task-list">${state.tasks.map((task) => { const employee = window.PD.data.employeeFor(task.employeeId); return `<article class="task-card"><div><h3>${escape(task.title)}</h3><p>${escape(task.description || "No additional details.")}</p><div class="task-meta"><span>Assigned to ${escape(employee ? employee.name : "Former employee")}</span>${pill(task.status)}<span>Due ${escape(formatDate(task.dueDate))}</span><span>${escape(task.priority)} priority</span></div></div><div class="task-actions"><button class="icon-btn" data-action="open-employee-tasks" data-employee-id="${task.employeeId}" data-task-id="${task.id}">Open employee dashboard</button>${task.status !== "Completed" ? `<button class="icon-btn" data-action="task-status" data-id="${task.id}" data-status="Completed">Mark complete</button>` : ""}<button class="icon-btn" data-action="delete-task" data-id="${task.id}">Delete</button></div></article>`; }).join("")}</div>` : empty("No tasks assigned yet.")}
    </section>`;
  window.PD.workflows = { renderLeaveRequests, renderMyLeave, renderAttendanceRequests, renderMyAttendance, renderTasks };
})();
