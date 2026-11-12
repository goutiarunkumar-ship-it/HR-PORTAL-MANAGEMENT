(function () {
  const data = window.PD.data;
  const state = data.state;
  const isEmployeePage = document.body.dataset.view === "employee";
  const query = new URLSearchParams(window.location.search);
  const requestedEmployeeId = Number(query.get("employeeId"));
  if (isEmployeePage) {
    data.preferences.role = "employee";
    if (data.employeeFor(requestedEmployeeId)) data.preferences.employeeId = requestedEmployeeId;
  }
  const navByRole = {
    hr: [
      ["home", "Dashboard", "▦"],
      ["employees", "Employees", "♙"],
      ["attendance", "Attendance", "◷"],
      ["leave-requests", "Leave Requests", "▤"],
      ["attendance-requests", "Attendance Requests", "↺"],
      ["tasks", "Assigned Tasks", "✓"]
    ],
    employee: [
      ["home", "My Dashboard", "▦"],
      ["my-tasks", "My Tasks", "✓"],
      ["my-leave", "My Leave", "▤"],
      ["my-attendance", "My Attendance", "◷"]
    ]
  };
  let page = isEmployeePage && query.has("taskId") ? "my-tasks" : "home";
  let targetTaskId = isEmployeePage ? query.get("taskId") : null;

  const currentEmployee = () => data.employeeFor(data.preferences.employeeId) || state.employees[0];
  const routeTitle = () => (navByRole[data.preferences.role].find(([id]) => id === page) || [null, "Dashboard"])[1];
  const render = () => {
    if (isEmployeePage) data.preferences.role = "employee";
    if (!navByRole[data.preferences.role]) data.preferences.role = "hr";
    if (!isEmployeePage && data.preferences.role === "employee" && !currentEmployee()) data.preferences.role = "hr";
    const nav = navByRole[data.preferences.role];
    if (!nav.some(([id]) => id === page)) page = "home";
    const roleSelect = document.getElementById("role-select");
    roleSelect.value = data.preferences.role;
    roleSelect.hidden = isEmployeePage;
    const employeeSelect = document.getElementById("employee-select");
    employeeSelect.innerHTML = state.employees.map((employee) => `<option value="${employee.id}">${window.PD.ui.escape(employee.name)}</option>`).join("");
    employeeSelect.value = String(data.preferences.employeeId);
    employeeSelect.hidden = data.preferences.role !== "employee";
    employeeSelect.disabled = state.employees.length === 0;
    document.getElementById("main-nav").innerHTML = nav.map(([id, label, icon]) => `<button type="button" class="${page === id ? "active" : ""}" data-page="${id}"><span class="nav-icon">${icon}</span>${label}</button>`).join("");
    document.getElementById("current-page").textContent = routeTitle();
    const pageContent = document.getElementById("page-content");
    if (!state.loaded) {
      pageContent.innerHTML = state.error
        ? window.PD.ui.heading("Django API unavailable", state.error, '<button class="btn" data-action="retry-load">Retry connection</button>')
        : window.PD.ui.heading("Connecting to Django", "Loading PeopleDesk data from the local database.");
      return;
    }
    const employee = currentEmployee();
    const pages = data.preferences.role === "hr"
      ? {
          home: () => window.PD.hrDashboard.render(state),
          employees: () => window.PD.people.renderEmployees(state),
          attendance: () => window.PD.people.renderAttendance(state),
          "leave-requests": () => window.PD.workflows.renderLeaveRequests(state),
          "attendance-requests": () => window.PD.workflows.renderAttendanceRequests(state),
          tasks: () => window.PD.workflows.renderTasks(state)
        }
      : {
          home: () => window.PD.employeeDashboard.render(state, employee),
          "my-tasks": () => window.PD.employeeDashboard.renderTasks(state, employee),
          "my-leave": () => window.PD.workflows.renderMyLeave(state, employee),
          "my-attendance": () => window.PD.workflows.renderMyAttendance(state, employee)
        };
    pageContent.innerHTML = employee ? pages[page]() : `${window.PD.ui.heading("No employee profiles", "Add an employee from the HR dashboard to use employee features.")}`;
    if (targetTaskId && page === "my-tasks") {
      const taskId = Number(targetTaskId);
      const taskCard = Number.isSafeInteger(taskId) ? document.getElementById(`task-${taskId}`) : null;
      if (taskCard) {
        taskCard.classList.add("task-highlight");
        taskCard.scrollIntoView({ behavior: "smooth", block: "center" });
        targetTaskId = null;
      }
    }
  };

  const persistPreferences = () => {
    try {
      if (!isEmployeePage) localStorage.setItem("pd_role", JSON.stringify(data.preferences.role));
      localStorage.setItem("pd_employee_id", JSON.stringify(data.preferences.employeeId));
    } catch (error) {
      console.error("Could not save dashboard preferences:", error);
    }
  };
  const loadData = async () => {
    state.error = null;
    render();
    try {
      await data.refresh();
      if (!data.employeeFor(data.preferences.employeeId) && state.employees.length) {
        data.preferences.employeeId = state.employees[0].id;
        persistPreferences();
      }
      render();
    } catch (error) {
      console.error("Could not load PeopleDesk data from Django:", error);
      state.loaded = false;
      state.error = error.message;
      render();
    }
  };
  const mutate = async (path, method, body, successMessage) => {
    try {
      await data.request(path, { method, body });
      await data.refresh();
      if (!data.employeeFor(data.preferences.employeeId) && state.employees.length) {
        data.preferences.employeeId = state.employees[0].id;
        persistPreferences();
      }
      render();
      window.PD.ui.toast(successMessage);
      return true;
    } catch (error) {
      console.error(`Django API operation failed (${method} ${path}):`, error);
      window.PD.ui.toast(error.message);
      return false;
    }
  };
  const showEmployeeDialog = (employee) => {
    const dialog = document.getElementById("employee-dialog");
    const form = document.getElementById("employee-form");
    form.reset();
    form.elements.id.value = employee ? employee.id : "";
    form.elements.name.value = employee ? employee.name : "";
    form.elements.email.value = employee ? employee.email : "";
    form.elements.role.value = employee ? employee.role : "";
    form.elements.department.value = employee ? employee.department : "Engineering";
    form.elements.status.value = employee ? employee.status : "Active";
    document.getElementById("employee-form-title").textContent = employee ? "Edit employee" : "Add employee";
    dialog.showModal();
  };
  const exportCsv = () => {
    const rows = [["Name", "Email", "Role", "Department", "Status"], ...state.employees.map((employee) => [employee.name, employee.email, employee.role, employee.department, employee.status])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "employees.csv";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const submitForm = async (form) => {
    const values = Object.fromEntries(new FormData(form).entries());
    if (form.id === "employee-form") {
      const employee = { name: values.name.trim(), email: values.email.trim(), role: values.role.trim(), department: values.department, status: values.status };
      const path = values.id ? `employees/${Number(values.id)}/` : "employees/";
      const method = values.id ? "PATCH" : "POST";
      const saved = await mutate(path, method, employee, values.id ? "Employee details updated." : "Employee added.");
      if (saved) document.getElementById("employee-dialog").close();
      return;
    }
    if (form.dataset.form === "leave-request") {
      if (values.from < data.today() || values.to < values.from) {
        window.PD.ui.toast("Choose valid leave dates.");
        return;
      }
      const employee = currentEmployee();
      await mutate("leaves/", "POST", {
        employeeId: employee.id,
        type: values.type,
        from: values.from,
        to: values.to,
        reason: values.reason.trim()
      }, "Leave request submitted to HR.");
      return;
    }
    if (form.dataset.form === "attendance-request") {
      if (values.date > data.today()) {
        window.PD.ui.toast("Attendance corrections can only be requested for today or an earlier date.");
        return;
      }
      const employee = currentEmployee();
      await mutate("attendance-requests/", "POST", {
        employeeId: employee.id,
        date: values.date,
        requestedStatus: values.requestedStatus,
        issue: values.issue.trim()
      }, "Attendance correction request sent to HR.");
      return;
    }
    if (form.dataset.form === "assign-task") {
      const employee = data.employeeFor(values.employeeId);
      if (!employee) {
        window.PD.ui.toast("Select an employee before assigning a task.");
        return;
      }
      await mutate("tasks/", "POST", {
        employeeId: employee.id,
        title: values.title.trim(),
        description: values.description.trim(),
        dueDate: values.dueDate,
        priority: values.priority
      }, `Task assigned to ${employee.name}.`);
    }
  };

  document.addEventListener("click", async (event) => {
    const pageButton = event.target.closest("[data-page]");
    if (pageButton) {
      event.preventDefault();
      page = pageButton.dataset.page;
      render();
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    if (button.dataset.action === "retry-load") {
      await loadData();
      return;
    }
    if (button.dataset.action === "add-employee") showEmployeeDialog(null);
    if (button.dataset.action === "edit-employee") showEmployeeDialog(state.employees.find((employee) => Number(employee.id) === id));
    if (button.dataset.action === "close-employee-dialog") document.getElementById("employee-dialog").close();
    if (button.dataset.action === "delete-employee") {
      const employee = data.employeeFor(id);
      if (employee && window.confirm(`Delete ${employee.name}?`)) {
        await mutate(`employees/${id}/`, "DELETE", undefined, "Employee deleted.");
      }
    }
    if (button.dataset.action === "export-csv") exportCsv();
    if (button.dataset.action === "mark-attendance") {
      await mutate("attendance/", "POST", {
        employeeId: id,
        date: data.today(),
        status: button.dataset.status
      }, `Attendance marked ${button.dataset.status.toLowerCase()}.`);
    }
    if (button.dataset.action === "leave-status") {
      await mutate(`leaves/${id}/`, "PATCH", { status: button.dataset.status }, `Leave request ${button.dataset.status.toLowerCase()}.`);
    }
    if (button.dataset.action === "attendance-request-status") {
      await mutate(
        `attendance-requests/${id}/`,
        "PATCH",
        { status: button.dataset.status },
        `Attendance request ${button.dataset.status.toLowerCase()}.`
      );
    }
    if (button.dataset.action === "task-status") {
      await mutate(`tasks/${id}/`, "PATCH", { status: button.dataset.status }, `Task marked ${button.dataset.status.toLowerCase()}.`);
    }
    if (button.dataset.action === "open-employee-tasks") {
      const employeeId = Number(button.dataset.employeeId);
      const taskId = Number(button.dataset.taskId);
      if (data.employeeFor(employeeId) && state.tasks.some((task) => Number(task.id) === taskId && Number(task.employeeId) === employeeId)) {
        window.location.href = `employee.html?employeeId=${encodeURIComponent(employeeId)}&taskId=${encodeURIComponent(taskId)}`;
      } else {
        window.PD.ui.toast("That employee task is no longer available.");
      }
    }
    if (button.dataset.action === "delete-task") {
      await mutate(`tasks/${id}/`, "DELETE", undefined, "Task deleted.");
    }
  });
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (form.id !== "employee-form" && !form.dataset.form) return;
    event.preventDefault();
    void submitForm(form);
  });
  document.addEventListener("input", (event) => {
    if (event.target.id !== "employee-search") return;
    const query = event.target.value.trim().toLowerCase();
    const department = document.getElementById("department-filter").value;
    const matches = state.employees.filter((employee) =>
      `${employee.name} ${employee.email} ${employee.role}`.toLowerCase().includes(query) &&
      (department === "All Departments" || employee.department === department)
    );
    document.getElementById("employee-table").innerHTML = window.PD.people.employeeTable(matches);
  });
  document.addEventListener("change", (event) => {
    if (event.target.id === "role-select") {
      data.preferences.role = event.target.value;
      page = "home";
      persistPreferences();
      render();
      return;
    }
    if (event.target.id === "employee-select") {
      data.preferences.employeeId = Number(event.target.value);
      try {
        localStorage.setItem("pd_employee_id", JSON.stringify(data.preferences.employeeId));
      } catch (error) {
        console.error("Could not save the selected employee profile:", error);
      }
      render();
      return;
    }
    if (event.target.id === "department-filter") {
      const search = document.getElementById("employee-search").value.trim().toLowerCase();
      const matches = state.employees.filter((employee) =>
        `${employee.name} ${employee.email} ${employee.role}`.toLowerCase().includes(search) &&
        (event.target.value === "All Departments" || employee.department === event.target.value)
      );
      document.getElementById("employee-table").innerHTML = window.PD.people.employeeTable(matches);
    }
  });
  persistPreferences();
  render();
  void loadData();
})();
