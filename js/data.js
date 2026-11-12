(function () {
  const readPreference = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (error) {
      console.warn("Could not read the saved PeopleDesk preference:", error);
      return fallback;
    }
  };
  const today = () => {
    const date = new Date();
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  };
  const state = {
    employees: [],
    leaves: [],
    attendance: {},
    tasks: [],
    attendanceRequests: [],
    loaded: false,
    error: null
  };
  const preferences = {
    role: readPreference("pd_role", "hr"),
    employeeId: Number(readPreference("pd_employee_id", 1))
  };
  const apiBase = String(window.PD_CONFIG?.API_BASE_URL || "").replace(/\/+$/, "");
  const request = async (path, options = {}) => {
    if (window.location.protocol === "file:") {
      throw new Error("Open PeopleDesk from Django at http://127.0.0.1:8000, not by double-clicking the HTML file.");
    }
    const headers = { Accept: "application/json" };
    const fetchOptions = { ...options, headers: { ...headers, ...(options.headers || {}) } };
    if (options.body !== undefined) {
      fetchOptions.headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(options.body);
    }
    let response;
    try {
      response = await fetch(`${apiBase}/api/${path}`, fetchOptions);
    } catch (error) {
      throw new Error("Cannot reach Django. Start the server with `python manage.py runserver`.");
    }
    if (response.status === 204) return null;
    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error(`Django returned an unreadable response (HTTP ${response.status}).`);
    }
    if (!response.ok) {
      throw new Error(result.error || `Django request failed with HTTP ${response.status}.`);
    }
    return result;
  };
  const refresh = async () => {
    const result = await request("bootstrap/");
    const groups = ["employees", "leaves", "attendance", "attendanceRequests", "tasks"];
    if (groups.some((group) => !Array.isArray(result[group]))) {
      throw new Error("Django returned an incomplete PeopleDesk data response.");
    }
    state.employees = result.employees;
    state.leaves = result.leaves;
    state.attendanceRequests = result.attendanceRequests;
    state.tasks = result.tasks;
    state.attendance = Object.fromEntries(
      result.attendance.map((record) => [`${record.employeeId}_${record.date}`, record.status])
    );
    state.loaded = true;
    state.error = null;
    return state;
  };
  const employeeFor = (id) => state.employees.find((employee) => Number(employee.id) === Number(id));
  window.PD = window.PD || {};
  window.PD.data = { state, preferences, today, request, refresh, employeeFor };
})();
