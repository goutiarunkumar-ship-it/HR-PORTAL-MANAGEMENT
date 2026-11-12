(function () {
  const { escape, stat, heading, pill, formatDate } = window.PD.ui;
  const belongsTo = (record, employee) => Number(record.employeeId) === Number(employee.id) || (!record.employeeId && record.name === employee.name);
  const renderDashboard = (state, employee) => {
    const tasks = state.tasks.filter((task) => Number(task.employeeId) === Number(employee.id));
    const leaves = state.leaves.filter((leave) => belongsTo(leave, employee));
    const attendance = state.attendance[`${employee.id}_${window.PD.data.today()}`] || "Not marked";
    const activeTasks = tasks.filter((task) => task.status !== "Completed");
    const nextTask = activeTasks[0];
    return `${heading(`Welcome, ${employee.name.split(" ")[0]}`, "Here is your personal work dashboard.")}
      <div class="notice">You are viewing the employee demo dashboard as <strong>${escape(employee.name)}</strong>. This demo does not use sign-in or authentication.</div>
      <div class="stats">
        ${stat("▣", "My open tasks", activeTasks.length, "Assigned work not yet completed")}
        ${stat("◷", "Today's attendance", attendance, "Your attendance status")}
        ${stat("▤", "My leave requests", leaves.length, "Requests in your history")}
        ${stat("✓", "Completed tasks", tasks.filter((task) => task.status === "Completed").length, "Tasks finished")}
      </div>
      <div class="two-col">
        <section class="panel"><div class="panel-head"><h2>Next assigned task</h2><button class="icon-btn" data-page="my-tasks">All tasks →</button></div>
          ${nextTask ? `<div class="task-card"><div><h3>${escape(nextTask.title)}</h3><p>${escape(nextTask.description || "No additional details.")}</p><div class="task-meta">${pill(nextTask.status)}<span>Due ${escape(formatDate(nextTask.dueDate))}</span><span>${escape(nextTask.priority)} priority</span></div></div></div>` : '<div class="empty">You have no open tasks.</div>'}
        </section>
        <section class="panel"><div class="panel-head"><h2>Quick actions</h2></div>
          <div class="activity"><span class="activity-dot"></span><div><strong>Need time off?</strong><small>Submit a leave request for HR to review.</small></div></div>
          <button class="btn secondary" data-page="my-leave">Request leave</button>
          <div class="activity"><span class="activity-dot"></span><div><strong>Attendance needs a correction?</strong><small>Send HR a request with the date and details.</small></div></div>
          <button class="btn secondary" data-page="my-attendance">Request attendance correction</button>
        </section>
      </div>`;
  };
  const renderTasks = (state, employee) => {
    const tasks = state.tasks.filter((task) => Number(task.employeeId) === Number(employee.id));
    return `${heading("My assigned tasks", "Review your work and update task progress.")}
      <section class="panel"><div class="panel-head"><h2>Tasks assigned to you</h2><span>${tasks.length} total</span></div>
        ${tasks.length ? `<div class="task-list">${tasks.map((task) => `<article class="task-card" id="task-${task.id}"><div><h3>${escape(task.title)}</h3><p>${escape(task.description || "No additional details.")}</p><div class="task-meta">${pill(task.status)}<span>Due ${escape(formatDate(task.dueDate))}</span><span>${escape(task.priority)} priority</span></div></div>
          ${task.status !== "Completed" ? `<div class="task-actions">${task.status === "To do" ? `<button class="icon-btn" data-action="task-status" data-id="${task.id}" data-status="In Progress">Start</button>` : ""}<button class="icon-btn" data-action="task-status" data-id="${task.id}" data-status="Completed">Complete</button></div>` : ""}</article>`).join("")}</div>` : '<div class="empty">No tasks assigned yet. Your HR team can assign work from the HR dashboard.</div>'}
      </section>`;
  };
  window.PD.employeeDashboard = { render: renderDashboard, renderTasks, belongsTo };
})();
