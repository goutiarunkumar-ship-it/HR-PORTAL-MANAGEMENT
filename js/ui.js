(function () {
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
  const pill = (value) => {
    const className = value === "Approved" || value === "Active" || value === "Present" || value === "Completed"
      ? "green" : value === "Rejected" || value === "Absent" ? "red" : "amber";
    return `<span class="pill ${className}">${escape(value)}</span>`;
  };
  const person = (employee) => `<div class="person"><span class="person-avatar">${escape(initials(employee.name))}</span><span><span class="person-name">${escape(employee.name)}</span><span class="sub">${escape(employee.email || employee.role || "")}</span></span></div>`;
  const stat = (icon, label, value, note) => `<article class="stat"><div class="stat-top"><span>${escape(label)}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${escape(value)}</div><div class="stat-note">${escape(note)}</div></article>`;
  const heading = (title, description, action) => `<div class="page-heading"><div><div class="eyebrow">PEOPLEDESK / WORKSPACE</div><h1>${escape(title)}</h1><p>${escape(description)}</p></div>${action || ""}</div>`;
  const empty = (message) => `<div class="empty">${escape(message)}</div>`;
  let toastTimer;
  const toast = (message) => {
    const element = document.getElementById("toast");
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("show"), 2600);
  };
  const formatDate = (date) => date ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "No due date";
  window.PD = window.PD || {};
  window.PD.ui = { escape, initials, pill, person, stat, heading, empty, toast, formatDate };
})();
